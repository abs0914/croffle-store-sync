# 📊 BIR Reading Operations Guide - Z-Reading & X-Reading

## Overview

The Croffle Store POS system includes comprehensive BIR-compliant reading operations for daily sales reporting and audit compliance. This guide covers installation, configuration, and operations for Z-Reading and X-Reading functionality.

## 🎯 What are Z-Reading and X-Reading?

### Z-Reading (End of Day Report)
- **Purpose**: Official end-of-day sales summary that resets daily counters
- **When to use**: At the end of each business day
- **Effect**: Resets daily transaction counters to zero
- **BIR Requirement**: Mandatory for tax compliance

### X-Reading (Current Sales Report)
- **Purpose**: Current sales summary without resetting counters
- **When to use**: During business hours for monitoring
- **Effect**: No reset of counters - informational only
- **BIR Requirement**: Optional but recommended for management

## 🔧 Installation & Setup

### Prerequisites
- Croffle Store POS system installed
- Thermal printer configured
- BIR compliance settings enabled
- Store information properly configured

### Configuration Steps

1. **Enable Reading Operations**
   - Navigate to Settings → BIR Compliance
   - Ensure `enableZReading: true` and `enableXReading: true`
   - Save configuration

2. **Configure Store Information**
   ```
   Required Fields:
   - TIN (Tax Identification Number)
   - Business Name
   - Machine Accreditation Number
   - Machine Serial Number
   - Permit Number
   - Date Issued
   - Valid Until
   ```

3. **Printer Setup**
   - Ensure thermal printer is connected
   - Test print functionality
   - Configure receipt format settings

## ⚙️ Configuration Options

### BIR Compliance Settings

```typescript
// Core Reading Settings
enableZReading: true,          // Enable Z-Reading functionality
enableXReading: true,          // Enable X-Reading functionality
enableAuditLogs: true,         // Log all reading operations
enableEJournal: true,          // Electronic journal backup

// Print Settings
enableThermalPrinting: true,   // Print readings to thermal printer
receiptCopies: 1,              // Number of copies to print
fontSizeMultiplier: 1.0,       // Font size adjustment

// Backup Settings
autoBackupFrequency: 'daily',  // Automatic backup frequency
```

### Access Control
- **Admin Level**: Full access to Z-Reading and X-Reading
- **Manager Level**: X-Reading access, Z-Reading with approval
- **Staff Level**: X-Reading only (if enabled)

## 🚀 Operations Guide

### Performing X-Reading (Current Sales Report)

1. **Access X-Reading**
   - Go to POS → Reports → X-Reading
   - Or use keyboard shortcut: `Ctrl + X`

2. **Generate Report**
   - Click "Generate X-Reading"
   - Review on-screen summary
   - Print if needed

3. **Report Contents**
   ```
   - Current date and time
   - Store information
   - Transaction summary
   - Sales by category
   - Payment method breakdown
   - Tax calculations
   - Discount summary
   - Current totals (not reset)
   ```

### Performing Z-Reading (End of Day Report)

1. **Pre-Z-Reading Checklist**
   - [ ] All transactions completed
   - [ ] Cash drawer balanced
   - [ ] No pending orders
   - [ ] Printer has paper

2. **Access Z-Reading**
   - Go to POS → Reports → Z-Reading
   - Or use keyboard shortcut: `Ctrl + Z`

3. **Generate Report**
   - Click "Generate Z-Reading"
   - **Warning**: This will reset daily counters
   - Confirm the operation
   - Print automatically

4. **Report Contents**
   ```
   - Date and time of Z-Reading
   - Store and machine information
   - Daily transaction summary
   - Sales totals by category
   - Payment method totals
   - VAT calculations
   - Discount totals
   - Grand totals
   - Sequential Z-Reading number
   ```

5. **Post-Z-Reading**
   - Counters reset to zero
   - New business day begins
   - Report stored in system
   - Backup created automatically

## 📋 Report Format Specifications

### Standard Report Header
```
================================
    CROFFLE STORE POS
================================
TIN: [Store TIN]
Business Name: [Store Name]
Address: [Store Address]
Machine SN: [Serial Number]
Accreditation: [Accreditation #]
Permit: [Permit Number]
================================
```

### Transaction Summary Section
```
TRANSACTION SUMMARY
--------------------------------
Total Transactions: [Count]
Gross Sales: ₱[Amount]
VAT Sales: ₱[Amount]
VAT Amount: ₱[Amount]
Non-VAT Sales: ₱[Amount]
VAT Exempt: ₱[Amount]
Zero Rated: ₱[Amount]
--------------------------------
```

### Payment Method Breakdown
```
PAYMENT METHODS
--------------------------------
Cash: ₱[Amount]
Card: ₱[Amount]
GCash: ₱[Amount]
Other: ₱[Amount]
--------------------------------
```

### Footer Information
```
================================
Z-Reading #: [Sequential Number]
Date/Time: [Timestamp]
Cashier: [User Name]
================================
This serves as your official
BIR-compliant sales report.
================================
```

## 🔍 Troubleshooting

### Common Issues

**Z-Reading Not Available**
- Check if previous Z-Reading was completed
- Verify admin permissions
- Ensure no active transactions

**Printer Not Working**
- Check printer connection
- Verify paper supply
- Test printer with X-Reading first

**Missing Store Information**
- Complete BIR compliance settings
- Verify all required fields
- Save configuration

**Report Data Incorrect**
- Check transaction sync status
- Verify date/time settings
- Review audit logs

### Error Messages

**"Cannot perform Z-Reading with active transactions"**
- Complete or void all pending transactions
- Ensure POS is in idle state

**"Store information incomplete"**
- Navigate to BIR Compliance settings
- Complete all required fields
- Save and retry

**"Printer error during Z-Reading"**
- Check printer status
- Ensure adequate paper
- Retry operation

## 📊 Compliance & Audit

### BIR Requirements
- Z-Reading must be performed daily
- Reports must be printed and stored
- Sequential numbering required
- Electronic backup mandatory

### Audit Trail
- All reading operations logged
- User identification recorded
- Timestamps preserved
- Data integrity maintained

### Record Keeping
- Print and file physical copies
- Electronic backups stored securely
- Minimum 5-year retention period
- Available for BIR inspection

## 🔐 Security Features

### Access Control
- Role-based permissions
- User authentication required
- Audit logging enabled
- Tamper detection

### Data Protection
- Encrypted data storage
- Secure transmission
- Backup verification
- Recovery procedures

## 📞 Support

### For Technical Issues
1. Check system logs in Admin → System Logs
2. Verify printer connectivity
3. Review BIR compliance settings
4. Contact technical support if needed

### For Compliance Questions
1. Review BIR regulations
2. Consult with tax advisor
3. Check official BIR guidelines
4. Ensure proper documentation

---

**Important**: Z-Reading and X-Reading operations are critical for BIR compliance. Ensure proper training for all users and maintain regular backup procedures.