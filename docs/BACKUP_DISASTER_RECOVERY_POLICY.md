# Backup & Disaster Recovery Policy

**Document Version:** 1.0  
**Effective Date:** December 17, 2025  
**Last Updated:** December 17, 2025  
**System:** PVOSyncPOS v1.0.0

---

## 1. Purpose & Scope

### 1.1 Purpose
This document establishes the backup and disaster recovery procedures for the PVOSyncPOS Point-of-Sale system to ensure:
- Business continuity in the event of system failures
- Compliance with BIR (Bureau of Internal Revenue) data retention requirements
- Protection of critical business and financial data
- Minimized data loss and system downtime

### 1.2 Scope
This policy applies to:
- All POS transaction data
- BIR compliance records (Sales Invoices, Z-Readings, X-Readings)
- Audit trail logs
- Inventory records
- User and configuration data
- All store locations using PVOSyncPOS

### 1.3 Regulatory Compliance
- **BIR Revenue Regulations No. 16-2018**: Electronic Sales Reporting System requirements
- **BIR Revenue Memorandum Circular No. 57-2015**: POS machine requirements
- **National Internal Revenue Code**: 10-year record retention for tax-related documents

---

## 2. Backup Types & Schedule

### 2.1 Automated Cloud Backups (Supabase)

| Backup Type | Frequency | Retention | Responsibility |
|-------------|-----------|-----------|----------------|
| Point-in-Time Recovery | Continuous | 7 days | Automatic (Supabase) |
| Daily Snapshots | Daily at 2:00 AM PHT | 7 days | Automatic (Supabase) |
| Weekly Snapshots | Every Sunday | 4 weeks | Automatic (Supabase) |

### 2.2 Manual BIR Data Backups (Using BIR Data Backup & Export Tool)

| Backup Type | Frequency | Retention | Responsibility |
|-------------|-----------|-----------|----------------|
| Weekly Backup | Every Monday | 10 years | Store Manager |
| Monthly Backup | 1st of each month | 10 years | Store Manager |
| Quarterly Backup | End of each quarter | Permanent | Owner/Admin |
| Annual Archive | December 31 | Permanent | Owner/Admin |

### 2.3 Backup Schedule Calendar

```
Weekly:    Every Monday - Run "Last 7 Days" backup
Monthly:   1st of month - Run "Last 30 Days" backup  
Quarterly: Mar 31, Jun 30, Sep 30, Dec 31 - Run "Last 90 Days" backup
Annual:    December 31 - Run custom full-year backup
```

---

## 3. Backup Procedures

### 3.1 Using BIR Data Backup & Export Tool

**Location:** Reports → BIR Reports → BIR Data Backup

**Step-by-Step Procedure:**

1. **Navigate to BIR Data Backup**
   - Login with Admin/Owner/Manager credentials
   - Go to Reports section
   - Select "BIR Data Backup" from BIR Reports

2. **Select Backup Period**
   - Quick Options: Last 7 Days, Last 30 Days, Last 90 Days
   - Custom Range: Use date picker for specific period

3. **Generate Backup**
   - Click "Export Backup" button
   - Wait for data compilation (may take 1-5 minutes for large datasets)

4. **Download & Verify**
   - JSON file will be downloaded automatically
   - Filename format: `bir_backup_[store]_[YYYY-MM-DD]_[YYYY-MM-DD].json`
   - Open file to verify data integrity

5. **Store Backup File**
   - Copy to designated backup storage (see Section 5)
   - Log backup in Backup Register (see Appendix A)

### 3.2 Backup Data Contents

Each BIR backup file includes:

```json
{
  "backup_metadata": {
    "generated_at": "timestamp",
    "date_range": { "from": "date", "to": "date" },
    "store_id": "uuid",
    "system_version": "PVOSyncPOS v1.0.0"
  },
  "transactions": [...],           // All sales transactions
  "void_transactions": [...],      // Voided transactions
  "refunds": [...],               // Refund records
  "z_readings": [...],            // Z-Reading reports
  "x_readings": [...],            // X-Reading reports
  "audit_logs": [...],            // System audit trail
  "cumulative_totals": {...}      // Grand accumulated totals
}
```

### 3.3 File Naming Convention

```
bir_backup_[STORE_NAME]_[START_DATE]_[END_DATE].json

Examples:
- bir_backup_SM_Cebu_2025-01-01_2025-01-07.json (Weekly)
- bir_backup_SM_Cebu_2025-01-01_2025-01-31.json (Monthly)
- bir_backup_SM_Cebu_2025-01-01_2025-03-31.json (Quarterly)
```

---

## 4. Data Retention Requirements

### 4.1 BIR Compliance Retention

| Data Type | Minimum Retention | Recommended Retention |
|-----------|-------------------|----------------------|
| Sales Invoices | 5 years | 10 years |
| Z-Readings | 5 years | 10 years |
| X-Readings | 5 years | 10 years |
| Void Records | 5 years | 10 years |
| Refund Records | 5 years | 10 years |
| Audit Logs | 5 years | 10 years |
| Cumulative Totals | Permanent | Permanent |

### 4.2 Retention Schedule

| Year | Action |
|------|--------|
| 0-5 | Active storage - readily accessible |
| 5-10 | Archive storage - accessible within 48 hours |
| 10+ | Review for permanent archive or secure destruction |

### 4.3 Data That Must NEVER Be Deleted
- Accumulated Grand Totals (AGT)
- Z-Reading cumulative counters
- Reset counter history
- PTU registration records

---

## 5. Storage & Security

### 5.1 Storage Locations

**Primary Storage (Cloud):**
- Supabase PostgreSQL database
- Region: Singapore (ap-southeast-1)
- Encryption: AES-256 at rest, TLS 1.3 in transit

**Secondary Storage (Local):**
- Store manager's designated computer
- Folder: `C:\POS_Backups\[STORE_NAME]\[YEAR]\`
- Must have password protection

**Tertiary Storage (Off-site):**
- Company Google Drive / OneDrive
- Folder structure: `POS_Backups/[STORE_NAME]/[YEAR]/[MONTH]/`
- Shared only with authorized personnel

### 5.2 Storage Requirements

| Storage Tier | Location | Access Level | Encryption |
|--------------|----------|--------------|------------|
| Primary | Supabase Cloud | System Only | AES-256 |
| Secondary | Local PC | Store Manager | Folder Password |
| Tertiary | Cloud Drive | Owner/Admin | Provider Encryption |

### 5.3 Access Control

| Role | Primary (Supabase) | Secondary (Local) | Tertiary (Cloud) |
|------|-------------------|-------------------|------------------|
| Owner | Full Access | Full Access | Full Access |
| Admin | Full Access | Full Access | Full Access |
| Manager | Read Only | Write Access | Read Only |
| Cashier | No Access | No Access | No Access |

### 5.4 Security Requirements

1. **Backup files must be:**
   - Password protected or encrypted
   - Stored in separate physical location from primary data
   - Accessible only to authorized personnel

2. **Transfer security:**
   - Use HTTPS for cloud uploads
   - Verify file checksums after transfer
   - Never send backups via unencrypted email

---

## 6. Disaster Recovery Procedures

### 6.1 Recovery Objectives

| Metric | Target | Maximum Acceptable |
|--------|--------|-------------------|
| **RTO** (Recovery Time Objective) | 2 hours | 4 hours |
| **RPO** (Recovery Point Objective) | 1 hour | 24 hours |

### 6.2 Disaster Scenarios & Response

#### Scenario 1: Hardware Failure (POS Terminal)

**Impact:** Single terminal unable to process transactions  
**Response Time:** Immediate  
**Recovery Steps:**
1. Switch to backup terminal or mobile device
2. Login to PVOSyncPOS web application
3. Continue operations - all data is in cloud
4. Replace/repair failed hardware
5. No data restoration needed (cloud-based system)

#### Scenario 2: Internet Connectivity Loss

**Impact:** Cannot sync with cloud database  
**Response Time:** Immediate  
**Recovery Steps:**
1. System automatically switches to offline mode
2. Transactions stored locally in IndexedDB
3. Continue normal operations
4. When internet restored, transactions auto-sync
5. Verify sync completion in transaction history

#### Scenario 3: Database Corruption

**Impact:** Data integrity issues  
**Response Time:** 1-2 hours  
**Recovery Steps:**
1. Contact Supabase support immediately
2. Initiate Point-in-Time Recovery (PITR)
3. Select recovery point before corruption
4. Verify data integrity after restoration
5. Run Z-Reading reconciliation

#### Scenario 4: Complete System Compromise (Security Breach)

**Impact:** Potential data loss or unauthorized access  
**Response Time:** Immediate  
**Recovery Steps:**
1. Immediately disable all user accounts
2. Contact Supabase support - freeze database
3. Assess scope of compromise
4. Restore from last known good backup
5. Reset all passwords
6. Review and update security measures
7. Report to appropriate authorities if required

#### Scenario 5: Accidental Data Deletion

**Impact:** Lost transactions or records  
**Response Time:** 30 minutes - 2 hours  
**Recovery Steps:**
1. Stop all POS operations immediately
2. Do NOT run any new transactions
3. Use Supabase PITR to restore to point before deletion
4. Alternatively, restore from most recent BIR backup file
5. Verify restored data completeness
6. Resume operations

### 6.3 Recovery Procedure: Restoring from BIR Backup File

**Prerequisites:**
- Admin/Owner access to Supabase dashboard
- Most recent BIR backup JSON file

**Steps:**
1. Parse JSON backup file
2. Identify missing/corrupted records
3. Use Supabase SQL Editor to restore specific records
4. Verify cumulative totals match backup
5. Run reconciliation report
6. Document all restored records in audit log

---

## 7. Roles & Responsibilities

### 7.1 Responsibility Matrix

| Task | Owner | Admin | Manager | Frequency |
|------|-------|-------|---------|-----------|
| Daily backup verification | - | - | ✓ | Daily |
| Weekly BIR backup | - | - | ✓ | Weekly |
| Monthly backup & archive | - | ✓ | - | Monthly |
| Quarterly comprehensive backup | ✓ | ✓ | - | Quarterly |
| Backup integrity testing | - | ✓ | - | Monthly |
| Disaster recovery drills | ✓ | ✓ | - | Annually |
| Policy review & updates | ✓ | - | - | Annually |

### 7.2 Role Definitions

**Backup Administrator (Store Manager):**
- Execute scheduled backups
- Verify backup completion
- Store backup files securely
- Report any backup failures immediately

**Verification Officer (Admin):**
- Monthly backup integrity checks
- Quarterly backup restoration tests
- Maintain backup register
- Ensure compliance with retention policy

**Recovery Team Lead (Owner):**
- Authorize disaster recovery initiation
- Coordinate recovery efforts
- Communicate with stakeholders
- Final approval for recovery completion

---

## 8. Testing & Verification

### 8.1 Monthly Backup Verification Checklist

```
□ Verify all scheduled backups completed
□ Open and validate at least one backup file
□ Check file sizes are reasonable (not empty or truncated)
□ Verify backup files are accessible in all storage locations
□ Update backup register with verification date
□ Report any issues to Admin
```

### 8.2 Quarterly Restoration Test Procedure

1. **Preparation:**
   - Select random backup from past quarter
   - Set up test environment (do NOT use production)
   - Document test date and backup file used

2. **Restoration Test:**
   - Import backup data into test environment
   - Verify transaction counts match
   - Verify cumulative totals match
   - Check audit log integrity
   - Test report generation from restored data

3. **Documentation:**
   - Record test results
   - Note any issues encountered
   - Update procedures if needed
   - Sign-off by Admin

### 8.3 Annual Disaster Recovery Drill

**Objective:** Validate complete recovery capability

**Scope:**
- Simulate complete system failure
- Execute full recovery procedure
- Measure actual RTO/RPO achieved
- Identify improvement areas

**Participants:**
- Owner (observing)
- Admin (leading)
- All Store Managers (participating)

**Documentation:**
- Drill date and scenario
- Step-by-step actions taken
- Time to recovery
- Issues encountered
- Lessons learned
- Action items for improvement

---

## 9. BIR Compliance Checklist

### 9.1 Documents Required for BIR Inspection

| Document | Retention | Format | Location |
|----------|-----------|--------|----------|
| Daily Z-Readings | 5 years | Digital/Print | Reports → Z-Reading |
| Monthly Sales Summary | 5 years | Digital/Print | Reports → BIR Sales Summary |
| Void Transaction Records | 5 years | Digital/Print | Reports → Sales Adjustment |
| Refund Records | 5 years | Digital/Print | Reports → Sales Adjustment |
| Discount Sales Books | 5 years | Digital/Print | Reports → [Discount] Sales Book |
| System Audit Trail | 5 years | Digital/Print | Reports → System Audit Trail |
| E-Journal Export | 5 years | TXT File | Reports → BIR E-Journal |

### 9.2 BIR Inspection Readiness Checklist

```
□ All Z-Readings available for inspection period
□ Cumulative totals reconciled and accurate
□ Void transactions properly documented with reasons
□ Refund records complete with authorization
□ Discount sales books with customer details
□ System audit trail accessible
□ E-Journal files available in TXT format
□ BIR backup files for requested period
```

### 9.3 Data Formats Accepted by BIR

| Data Type | Accepted Formats |
|-----------|------------------|
| Transaction Records | PDF, CSV, Printed |
| Z-Readings | PDF, Printed |
| E-Journal | TXT (plain text) |
| Audit Trail | PDF, CSV |
| Backup Archives | JSON (for reference) |

---

## 10. Emergency Contacts & Escalation

### 10.1 Internal Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| System Owner | [Owner Name/Contact] | Final authority on recovery decisions |
| System Admin | [Admin Name/Contact] | Technical recovery execution |
| Store Manager | [Per Store] | Local backup operations |

### 10.2 External Contacts

| Service | Contact | Purpose |
|---------|---------|---------|
| Supabase Support | support@supabase.io | Database issues, PITR recovery |
| BIR Hotline | 8538-3200 | Compliance questions |
| BIR RDO | [Local RDO Contact] | Regional compliance matters |

### 10.3 Escalation Matrix

| Issue Severity | First Contact | Escalation | Timeframe |
|----------------|---------------|------------|-----------|
| Low (backup warning) | Store Manager | Admin | 24 hours |
| Medium (backup failure) | Admin | Owner | 4 hours |
| High (data loss suspected) | Owner | Supabase Support | Immediate |
| Critical (system compromise) | Owner | All contacts | Immediate |

---

## Appendix A: Backup Register Template

| Date | Backup Type | Period Covered | File Name | Size | Stored Location | Verified By | Notes |
|------|-------------|----------------|-----------|------|-----------------|-------------|-------|
| | | | | | | | |

---

## Appendix B: Recovery Log Template

| Date | Incident Type | Discovery Time | Recovery Start | Recovery Complete | Data Loss (if any) | Root Cause | Corrective Action |
|------|---------------|----------------|----------------|-------------------|-------------------|------------|-------------------|
| | | | | | | | |

---

## Appendix C: Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 17, 2025 | System Admin | Initial release |

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Document Owner | | | |
| System Administrator | | | |
| Compliance Officer | | | |

---

*This document is part of the PVOSyncPOS BIR Accreditation Documentation Package.*
