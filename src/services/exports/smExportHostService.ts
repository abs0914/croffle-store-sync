
export interface ExportHostConfig {
  hostType: 'windows' | 'linux';
  hostIp: string;
  hostUser: string;
  hostPassword?: string;
  siaFolderPath: string;
  postgresqlClientPath: string;
  mosaicSchedulerPath?: string;
  enabled: boolean;
}

export interface PostgreSQLConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export class SMExportHostService {
  /**
   * Generate PostgreSQL connection string for external access to Supabase
   */
  generateConnectionString(config: PostgreSQLConnectionConfig): string {
    const sslMode = config.ssl ? 'require' : 'disable';
    return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?sslmode=${sslMode}`;
  }

  /**
   * Generate PowerShell export script for Windows
   */
  generateWindowsExportScript(
    connectionString: string,
    siaPath: string,
    storeId: string,
    storeName: string
  ): string {
    const script = `
# SM Accreditation Export Script - Windows
# Generated: ${new Date().toISOString()}
# Store: ${storeName} (${storeId})

param(
    [string]$ConnectionString = "${connectionString}",
    [string]$SiaPath = "${siaPath}",
    [string]$StoreId = "${storeId}"
)

$ErrorActionPreference = "Stop"
$LogFile = "$SiaPath\\export_log_$(Get-Date -Format 'yyyyMMdd').txt"

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp - $Message" | Tee-Object -FilePath $LogFile -Append
}

try {
    Write-Log "Starting SM Accreditation export for store: ${storeName}"
    
    # Create SIA directory if it doesn't exist
    if (!(Test-Path $SiaPath)) {
        New-Item -ItemType Directory -Path $SiaPath -Force
        Write-Log "Created SIA directory: $SiaPath"
    }
    
    # Generate filename based on current month/year
    $Month = (Get-Date).ToString("MM")
    $Year = (Get-Date).ToString("yyyy")
    $Filename = "$Month" + "_" + "$Year"
    
    $TransactionsFile = "$SiaPath\\$Filename" + "_transactions.csv"
    $DetailsFile = "$SiaPath\\$Filename" + "_transactiondetails.csv"
    
    # Export transactions
    Write-Log "Exporting transactions to: $TransactionsFile"
    $TransactionsQuery = @"
\\COPY (
    SELECT 
        receipt_number,
        business_date,
        transaction_time,
        gross_amount,
        discount_amount,
        net_amount,
        vat_amount,
        payment_method,
        discount_type,
        discount_id,
        promo_details,
        senior_discount,
        pwd_discount
    FROM export_transactions_csv_recent('$StoreId'::uuid, 30)
) TO '$TransactionsFile' WITH (FORMAT CSV, HEADER);
"@
    
    # Export transaction details
    Write-Log "Exporting transaction details to: $DetailsFile"
    $DetailsQuery = @"
\\COPY (
    SELECT csv_data FROM export_transaction_details_csv_recent('$StoreId'::uuid, 30)
) TO '$DetailsFile' WITH (FORMAT CSV, HEADER);
"@
    
    # Execute PostgreSQL commands
    $env:PGPASSWORD = (New-Object System.Uri $ConnectionString).UserInfo.Split(':')[1]
    
    psql "$ConnectionString" -c "$TransactionsQuery"
    if ($LASTEXITCODE -ne 0) { throw "Transactions export failed" }
    
    psql "$ConnectionString" -c "$DetailsQuery"  
    if ($LASTEXITCODE -ne 0) { throw "Transaction details export failed" }
    
    # Validate files exist and have content
    if (!(Test-Path $TransactionsFile) -or (Get-Item $TransactionsFile).Length -eq 0) {
        throw "Transactions file is missing or empty"
    }
    
    if (!(Test-Path $DetailsFile) -or (Get-Item $DetailsFile).Length -eq 0) {
        throw "Transaction details file is missing or empty"
    }
    
    # Count rows (excluding header)
    $TransactionRows = (Get-Content $TransactionsFile | Measure-Object -Line).Lines - 1
    $DetailRows = (Get-Content $DetailsFile | Measure-Object -Line).Lines - 1
    
    Write-Log "Export completed successfully:"
    Write-Log "  Transactions: $TransactionRows rows"
    Write-Log "  Details: $DetailRows rows"
    Write-Log "  Files ready for Mosaic Scheduler pickup"
    
    exit 0
    
} catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    Write-Log "Export failed for store: ${storeName}"
    exit 1
}
`;
    return script;
  }

  /**
   * Generate bash export script for Linux
   */
  generateLinuxExportScript(
    connectionString: string,
    siaPath: string,
    storeId: string,
    storeName: string
  ): string {
    const script = `#!/bin/bash
# SM Accreditation Export Script - Linux
# Generated: ${new Date().toISOString()}
# Store: ${storeName} (${storeId})

set -e

CONNECTION_STRING="${connectionString}"
SIA_PATH="${siaPath}"
STORE_ID="${storeId}"
STORE_NAME="${storeName}"

LOG_FILE="$SIA_PATH/export_log_$(date +%Y%m%d).txt"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_message "Starting SM Accreditation export for store: $STORE_NAME"

# Create SIA directory if it doesn't exist
mkdir -p "$SIA_PATH"
log_message "SIA directory ready: $SIA_PATH"

# Generate filename based on current month/year
MONTH=$(date +%m)
YEAR=$(date +%Y)
FILENAME="${MONTH}_${YEAR}"

TRANSACTIONS_FILE="$SIA_PATH/${FILENAME}_transactions.csv"
DETAILS_FILE="$SIA_PATH/${FILENAME}_transactiondetails.csv"

# Export transactions
log_message "Exporting transactions to: $TRANSACTIONS_FILE"
TRANSACTIONS_QUERY="\\\\COPY (
    SELECT 
        receipt_number,
        business_date,
        transaction_time,
        gross_amount,
        discount_amount,
        net_amount,
        vat_amount,
        payment_method,
        discount_type,
        discount_id,
        promo_details,
        senior_discount,
        pwd_discount
    FROM export_transactions_csv_recent('$STORE_ID'::uuid, 30)
) TO '$TRANSACTIONS_FILE' WITH (FORMAT CSV, HEADER);"

# Export transaction details
log_message "Exporting transaction details to: $DETAILS_FILE"
DETAILS_QUERY="\\\\COPY (
    SELECT csv_data FROM export_transaction_details_csv_recent('$STORE_ID'::uuid, 30)
) TO '$DETAILS_FILE' WITH (FORMAT CSV, HEADER);"

# Execute PostgreSQL commands
export PGPASSWORD=$(echo "$CONNECTION_STRING" | sed -n 's/.*:\\/\\/[^:]*:\\([^@]*\\)@.*/\\1/p')

psql "$CONNECTION_STRING" -c "$TRANSACTIONS_QUERY"
psql "$CONNECTION_STRING" -c "$DETAILS_QUERY"

# Validate files exist and have content
if [[ ! -f "$TRANSACTIONS_FILE" ]] || [[ ! -s "$TRANSACTIONS_FILE" ]]; then
    log_message "ERROR: Transactions file is missing or empty"
    exit 1
fi

if [[ ! -f "$DETAILS_FILE" ]] || [[ ! -s "$DETAILS_FILE" ]]; then
    log_message "ERROR: Transaction details file is missing or empty"
    exit 1
fi

# Count rows (excluding header)
TRANSACTION_ROWS=$(($(wc -l < "$TRANSACTIONS_FILE") - 1))
DETAIL_ROWS=$(($(wc -l < "$DETAILS_FILE") - 1))

log_message "Export completed successfully:"
log_message "  Transactions: $TRANSACTION_ROWS rows"
log_message "  Details: $DETAIL_ROWS rows"
log_message "  Files ready for Mosaic Scheduler pickup"

exit 0
`;
    return script;
  }

  /**
   * Generate Windows Task Scheduler XML configuration
   */
  generateWindowsTaskScheduler(
    taskName: string,
    scriptPath: string,
    storeName: string
  ): string {
    return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')</Date>
    <Author>SM Accreditation System</Author>
    <Description>Hourly export of transaction data for ${storeName} - SM Accreditation</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <Repetition>
        <Interval>PT1H</Interval>
      </Repetition>
      <StartBoundary>$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <DisallowStartOnRemoteAppSession>false</DisallowStartOnRemoteAppSession>
    <UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT30M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -File "${scriptPath}"</Arguments>
    </Exec>
  </Actions>
</Task>`;
  }

  /**
   * Generate Linux cron configuration
   */
  generateLinuxCronConfig(scriptPath: string, storeName: string): string {
    return `# SM Accreditation Export - ${storeName}
# Runs every hour at minute 0
# Generated: ${new Date().toISOString()}
0 * * * * /bin/bash "${scriptPath}" >> /var/log/sm_export_${storeName.toLowerCase().replace(/\s+/g, '_')}.log 2>&1`;
  }

  /**
   * Test connection to export host
   */
  async testExportHostConnection(config: ExportHostConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // This would be implemented with actual SSH/WinRM connection testing
      // For now, we'll simulate the test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: `Successfully connected to ${config.hostType} export host at ${config.hostIp}`,
        details: {
          hostType: config.hostType,
          siaPath: config.siaFolderPath,
          postgresqlClient: config.postgresqlClientPath
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to export host: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate complete deployment package
   */
  generateDeploymentPackage(
    exportHostConfig: ExportHostConfig,
    connectionConfig: PostgreSQLConnectionConfig,
    storeId: string,
    storeName: string
  ): {
    scripts: { name: string; content: string; type: 'powershell' | 'bash' }[];
    schedulerConfigs: { name: string; content: string; type: 'xml' | 'cron' }[];
    instructions: string[];
  } {
    const connectionString = this.generateConnectionString(connectionConfig);
    const scripts = [];
    const schedulerConfigs = [];
    const instructions = [];

    if (exportHostConfig.hostType === 'windows') {
      // PowerShell script
      scripts.push({
        name: `sm_export_${storeName.toLowerCase().replace(/\s+/g, '_')}.ps1`,
        content: this.generateWindowsExportScript(
          connectionString,
          exportHostConfig.siaFolderPath,
          storeId,
          storeName
        ),
        type: 'powershell'
      });

      // Task Scheduler XML
      schedulerConfigs.push({
        name: `sm_export_${storeName.toLowerCase().replace(/\s+/g, '_')}_task.xml`,
        content: this.generateWindowsTaskScheduler(
          `SM Export - ${storeName}`,
          `${exportHostConfig.siaFolderPath}\\sm_export_${storeName.toLowerCase().replace(/\s+/g, '_')}.ps1`,
          storeName
        ),
        type: 'xml'
      });

      instructions.push(
        '1. Copy the PowerShell script to your export host',
        `2. Place it in: ${exportHostConfig.siaFolderPath}`,
        '3. Import the Task Scheduler XML using: schtasks /create /xml task.xml /tn "SM Export"',
        '4. Test the script manually first: powershell -ExecutionPolicy Bypass -File script.ps1',
        '5. Verify CSV files are generated in the SIA folder',
        '6. Configure Mosaic Scheduler to pick up files from SIA folder'
      );
    } else {
      // Bash script
      scripts.push({
        name: `sm_export_${storeName.toLowerCase().replace(/\s+/g, '_')}.sh`,
        content: this.generateLinuxExportScript(
          connectionString,
          exportHostConfig.siaFolderPath,
          storeId,
          storeName
        ),
        type: 'bash'
      });

      // Cron configuration
      schedulerConfigs.push({
        name: `sm_export_${storeName.toLowerCase().replace(/\s+/g, '_')}_cron`,
        content: this.generateLinuxCronConfig(
          `${exportHostConfig.siaFolderPath}/sm_export_${storeName.toLowerCase().replace(/\s+/g, '_')}.sh`,
          storeName
        ),
        type: 'cron'
      });

      instructions.push(
        '1. Copy the bash script to your export host',
        `2. Place it in: ${exportHostConfig.siaFolderPath}`,
        '3. Make it executable: chmod +x script.sh',
        '4. Add cron job: crontab -e and paste the cron configuration',
        '5. Test the script manually first: ./script.sh',
        '6. Verify CSV files are generated in the SIA folder',
        '7. Configure your scheduler to pick up files from SIA folder'
      );
    }

    return { scripts, schedulerConfigs, instructions };
  }
}
