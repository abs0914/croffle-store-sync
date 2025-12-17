# PVOSyncPOS System Narrative
## BIR Accreditation Documentation

**Software Name:** PVOSyncPOS  
**Version:** 1.0.0  
**Developer:** Croffle Store Philippines  
**Document Date:** December 2024

---

## 1. EXECUTIVE SUMMARY

PVOSyncPOS is a comprehensive Point-of-Sale (POS) system designed specifically for retail food service establishments in the Philippines. The system is built with full compliance to Bureau of Internal Revenue (BIR) requirements for Computerized Accounting Systems (CAS) and Point-of-Sale machines, ensuring accurate tax computation, proper documentation, and complete audit trail capabilities.

The system serves as an integrated solution for sales transaction processing, inventory management, tax compliance reporting, and business analytics, operating across multiple store locations with centralized data management.

---

## 2. SYSTEM OVERVIEW

### 2.1 Purpose and Objectives

PVOSyncPOS is designed to:

1. **Process Sales Transactions** - Facilitate efficient point-of-sale operations with accurate pricing, discount application, and payment processing
2. **Ensure Tax Compliance** - Automatically compute and apply Value Added Tax (VAT) in accordance with Philippine tax regulations
3. **Generate Official Receipts** - Produce BIR-compliant Sales Invoices with all required information
4. **Maintain Audit Trails** - Record all transactions and system events with tamper-evident logging
5. **Support Multi-Store Operations** - Enable centralized management of multiple retail locations
6. **Provide Business Intelligence** - Generate comprehensive reports for operational and compliance purposes

### 2.2 Target Users

- **Store Owners/Administrators** - Full system access for configuration and reporting
- **Store Managers** - Operational oversight and report generation
- **Cashiers** - Point-of-sale transaction processing
- **Commissary Staff** - Inventory and stock management

---

## 3. TECHNICAL ARCHITECTURE

### 3.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Web Browser   │  │  Mobile Device  │  │  Tablet Device  │ │
│  │   (Desktop)     │  │   (Capacitor)   │  │   (Capacitor)   │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React.js Single Page Application             │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │  POS Module │ │ Inventory   │ │ Reports & Analytics │ │  │
│  │  │             │ │ Module      │ │ Module              │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │ User Mgmt   │ │ BIR         │ │ Shift Management    │ │  │
│  │  │ Module      │ │ Compliance  │ │ Module              │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Backend Services                   │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │   │
│  │  │ Edge         │ │ Realtime     │ │ Storage          │ │   │
│  │  │ Functions    │ │ Subscriptions│ │ Service          │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                         │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │   │
│  │  │ Transactions │ │ Products &   │ │ BIR Compliance   │ │   │
│  │  │ & Sales      │ │ Inventory    │ │ Tables           │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘ │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │   │
│  │  │ User & Auth  │ │ Audit Logs   │ │ Store Config     │ │   │
│  │  │ Tables       │ │ & E-Journal  │ │ Tables           │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend Framework | React 18.3 with TypeScript | User interface and application logic |
| Build Tool | Vite | Development and production builds |
| UI Components | Shadcn/UI + Radix UI | Accessible, customizable components |
| Styling | Tailwind CSS | Responsive design system |
| State Management | React Context + TanStack Query | Application state and data caching |
| Backend Platform | Supabase (PostgreSQL) | Database, authentication, real-time |
| Mobile Platform | Capacitor | Native iOS/Android deployment |
| Printing | Web Bluetooth API | Thermal receipt printing |
| PDF Generation | jsPDF | Receipt and report exports |

### 3.3 Deployment Architecture

- **Frontend Hosting:** Cloud-based CDN deployment
- **Backend Services:** Supabase Cloud Infrastructure
- **Database:** PostgreSQL with automatic backups
- **Security:** SSL/TLS encryption, Row-Level Security (RLS)

---

## 4. FUNCTIONAL MODULES

### 4.1 Point-of-Sale (POS) Module

The core transaction processing module handles all sales operations:

#### 4.1.1 Transaction Processing
- Product selection from categorized catalog
- Quantity adjustment and item modifications
- Add-on and combo product handling
- Real-time price calculation with VAT computation

#### 4.1.2 Discount Management
Supports all BIR-mandated discount types:
- **Senior Citizen Discount** (20%) - with ID number capture
- **Person with Disability (PWD) Discount** (20%) - with ID number capture
- **National Athletes and Coaches (NAAC) Discount** (20%) - with ID number capture
- **Solo Parent Discount** (20%) - with ID number capture
- **Employee Discount** (configurable percentage)
- **Custom Discount** (manager-authorized)
- **Complimentary** (with approval tracking)

#### 4.1.3 Payment Processing
- Cash payments with change computation
- Card payments (credit/debit)
- E-wallet payments (GCash, Maya, etc.)
- Gift certificate redemption
- Split payment handling

#### 4.1.4 Order Types
- Dine-in orders
- Take-out orders
- Online food delivery (Grab, FoodPanda) with pre-payment handling

### 4.2 Receipt Generation Module

#### 4.2.1 Sales Invoice Features
All receipts comply with BIR requirements and include:
- Registered business name and address
- Taxpayer Identification Number (TIN)
- BIR Accreditation Number
- Machine Identification Number (MIN)
- Serial Number
- Date and time of transaction
- Sales Invoice (SI) number (sequential)
- Itemized list with quantities and amounts
- VAT breakdown (Vatable Sales, VAT Amount, VAT-Exempt Sales)
- Discount breakdown by type
- Total amount due
- Payment method and change
- Cashier identification
- QR code with transaction details
- "THIS SERVES AS YOUR INVOICE" footer

#### 4.2.2 Reprint Handling
- Reprinted receipts display "*** REPRINT ***" watermark
- Reprint date and timestamp included
- Reprint count tracked for audit purposes

### 4.3 Inventory Management Module

#### 4.3.1 Stock Control
- Real-time inventory tracking per store
- Automatic stock deduction on sales
- Low stock alerts and notifications
- Stock transfer between locations

#### 4.3.2 Recipe Management
- Product-to-ingredient mapping
- Automatic ingredient deduction
- Cost computation per product

#### 4.3.3 Inventory Operations
- Stock receiving and adjustments
- Wastage and damage recording
- Physical count reconciliation

### 4.4 Reporting Module

#### 4.4.1 Operational Reports
- Daily sales summary
- Hourly sales breakdown
- Product performance analysis
- Payment method breakdown
- Discount utilization report

#### 4.4.2 BIR Compliance Reports
- **X-Reading** - Interim sales report (non-resetting)
- **Z-Reading** - End-of-day report (daily reset)
- **BIR Sales Summary Report** - Consolidated tax report
- **E-Journal** - Electronic journal in BIR-required format
- **Discount Sales Books** - Separate reports for:
  - Senior Citizen Sales
  - PWD Sales
  - NAAC Sales
  - Solo Parent Sales

### 4.5 User Management Module

#### 4.5.1 Role-Based Access Control
- **Owner** - Full system access
- **Admin** - Administrative functions
- **Manager** - Store-level management
- **Cashier** - POS operations only

#### 4.5.2 Authentication
- Secure email/password authentication
- Session management
- Password reset functionality

### 4.6 Shift Management Module

- Shift opening with beginning cash declaration
- Real-time shift sales tracking
- Shift closing with cash reconciliation
- Cash variance computation and logging

---

## 5. BIR COMPLIANCE FEATURES

### 5.1 Tax Computation

#### 5.1.1 VAT Calculation
- Standard 12% VAT on vatable sales
- VAT computation formula: VAT = Vatable Sales × 0.12
- Net of VAT computation for discounted items

#### 5.1.2 VAT-Exempt Handling
For Senior Citizen, PWD, NAAC, and Solo Parent discounts:
- VAT exemption computed per beneficiary
- Per-person VAT-exempt sale = Gross Amount / 1.12
- VAT exemption amount properly recorded

### 5.2 Sequential Numbering

#### 5.2.1 Sales Invoice Numbers
- Unique sequential SI numbers per terminal
- Format: SI-YYYYMMDD-NNNNNN
- No gaps or duplicates allowed
- Tracked in `bir_cumulative_sales` table

#### 5.2.2 Z-Reading Numbers
- Sequential Z-reading counter
- Reset counter tracking per BIR requirements
- Accumulated Grand Total (AGT) maintenance

### 5.3 Audit Trail System

#### 5.3.1 Event Logging
All significant events are logged to `bir_audit_logs`:
- Transaction completions
- Transaction voids
- Refund processing
- Z-Reading generation
- X-Reading generation
- User authentication events
- Configuration changes

#### 5.3.2 Log Integrity
- Sequential numbering of audit entries
- Hash chain linking (previous_hash → current_hash)
- Tamper-evident design
- IP address and user agent tracking

#### 5.3.3 Audit Log Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIT LOG ENTRY                          │
├─────────────────────────────────────────────────────────────┤
│ sequence_number: Sequential counter                         │
│ event_name: Type of event (TRANSACTION_COMPLETED, etc.)    │
│ log_type: Category (TRANSACTION, VOID, REFUND, etc.)       │
│ event_data: JSON payload with full event details           │
│ receipt_number: Associated SI number                        │
│ transaction_id: Reference to transaction                    │
│ user_id: User who performed action                         │
│ cashier_name: Name of cashier                              │
│ terminal_id: POS terminal identifier                        │
│ store_id: Store location                                    │
│ previous_hash: Hash of previous log entry                   │
│ hash_value: SHA-256 hash of current entry                   │
│ created_at: Timestamp of event                              │
│ ip_address: Client IP address                               │
│ user_agent: Browser/device information                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Electronic Journal (E-Journal)

#### 5.4.1 Daily Journal Generation
- Automatic daily journal compilation
- Stored in `bir_ejournal` table
- Contains all transaction details for the day

#### 5.4.2 E-Journal Export
- Plain text format per BIR requirements
- Includes store information header
- Transaction summaries with SI numbers
- Sales breakdown by category
- VAT analysis section
- Digital signature capability

### 5.5 Report Requirements

#### 5.5.1 Z-Reading Content
- Store identification details
- Machine identification
- Beginning and ending SI numbers
- Transaction counts
- Gross sales
- Net sales
- VAT breakdown
- Discount breakdown by type
- Payment method summary
- Accumulated Grand Total
- Reset counter

#### 5.5.2 X-Reading Content
- Same structure as Z-Reading
- Clearly marked as X-Reading (non-resetting)
- Current shift totals

---

## 6. DATA STRUCTURE

### 6.1 Core Database Tables

#### 6.1.1 Transaction Tables
- `transactions` - Main sales transaction records
- `transaction_items` - Line items per transaction
- `refunds` - Refund transaction records

#### 6.1.2 BIR Compliance Tables
- `bir_store_config` - Store registration details
- `bir_cumulative_sales` - Running totals per terminal
- `bir_readings` - X and Z reading records
- `bir_daily_summary` - Daily sales summaries
- `bir_ejournal` - Electronic journal storage
- `bir_audit_logs` - System audit trail
- `bir_reset_counters` - AGT reset tracking

#### 6.1.3 Product & Inventory Tables
- `products` - Product master data
- `product_catalog` - Store-specific product listings
- `categories` - Product categories
- `inventory_stock` - Stock levels per store
- `recipe_ingredients` - Product-to-ingredient mapping

#### 6.1.4 Operational Tables
- `stores` - Store location records
- `app_users` - User accounts
- `cashiers` - Cashier records per store
- `shifts` - Shift records

### 6.2 Data Retention

- Transaction data: Retained indefinitely
- Audit logs: Retained for minimum 10 years
- E-Journal: Daily backups with 10-year retention
- Z-Reading records: Permanent retention

---

## 7. SECURITY MEASURES

### 7.1 Authentication Security
- Secure password hashing (bcrypt)
- Session token management
- Automatic session expiration
- Failed login attempt tracking

### 7.2 Data Security
- SSL/TLS encryption for all communications
- Row-Level Security (RLS) on database
- Store-based data isolation
- Encrypted storage of sensitive data

### 7.3 Access Control
- Role-based permissions
- Store-level access restrictions
- Action-level authorization
- Audit logging of all access

### 7.4 Data Integrity
- Database transactions with ACID compliance
- Foreign key constraints
- Hash chain verification for audit logs
- Automatic backup systems

---

## 8. SYSTEM INTEGRATION

### 8.1 Hardware Integration

#### 8.1.1 Receipt Printers
- Bluetooth thermal printers (58mm/80mm)
- ESC/POS command protocol
- Web Bluetooth API integration
- Print queue management with retry logic

#### 8.1.2 Cash Drawers
- Printer-triggered opening
- Manual override capability

### 8.2 External Systems

#### 8.2.1 Food Delivery Platforms
- Grab integration
- FoodPanda integration
- Pre-payment order handling

#### 8.2.2 Compliance Reporting
- Robinsons Land Corporation compliance export
- BIR e-Sales reporting format
- CSV/TXT export capabilities

---

## 9. OPERATIONAL PROCEDURES

### 9.1 Daily Operations

1. **Shift Start**
   - User login and authentication
   - Beginning cash declaration
   - Shift opening confirmation

2. **Transaction Processing**
   - Product selection and order building
   - Discount application (with ID verification)
   - Payment collection
   - Receipt printing

3. **Shift End**
   - X-Reading generation (interim)
   - Z-Reading generation (end-of-day)
   - Cash reconciliation
   - Shift closing

### 9.2 Exception Handling

#### 9.2.1 Void Transactions
- Requires manager authorization
- Full audit trail with void reason
- Inventory restoration
- Separate void tracking in reports

#### 9.2.2 Refund Processing
- Transaction lookup and verification
- Full or partial refund options
- Inventory disposition tracking
- Refund receipt generation

### 9.3 Backup Procedures
- Automatic cloud backup (continuous)
- E-Journal daily backup
- Transaction data redundancy
- Disaster recovery capability

---

## 10. APPENDICES

### Appendix A: Glossary of Terms

| Term | Definition |
|------|------------|
| AGT | Accumulated Grand Total - Running total of all sales |
| E-Journal | Electronic Journal - Digital record of all transactions |
| MIN | Machine Identification Number - BIR-assigned terminal ID |
| RLS | Row-Level Security - Database access control mechanism |
| SI | Sales Invoice - Official receipt document |
| TIN | Taxpayer Identification Number |
| VAT | Value Added Tax - 12% consumption tax |
| X-Reading | Interim sales report without counter reset |
| Z-Reading | End-of-day report with counter reset |

### Appendix B: BIR Compliance Checklist

- [x] Sequential Sales Invoice numbering
- [x] Proper VAT computation and display
- [x] Senior Citizen/PWD/NAAC/Solo Parent discount handling
- [x] X-Reading generation capability
- [x] Z-Reading generation with AGT
- [x] Electronic Journal maintenance
- [x] Audit trail with hash chain integrity
- [x] Reprint watermarking
- [x] Store configuration with BIR details
- [x] Reset counter tracking

### Appendix C: Sample Reports

*(Attach sample X-Reading, Z-Reading, and E-Journal outputs)*

### Appendix D: System Requirements

**Minimum Client Requirements:**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (minimum 1 Mbps)
- Bluetooth 4.0+ for printer connectivity

**Recommended Hardware:**
- Tablet or touchscreen device
- Bluetooth thermal printer (58mm or 80mm)
- Cash drawer (printer-triggered)

---

## 11. DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | December 2024 | PVOSyncPOS Development Team | Initial document for BIR accreditation |

---

**END OF DOCUMENT**

*This document is submitted as part of the BIR Computerized Accounting System (CAS) accreditation application for PVOSyncPOS version 1.0.0.*
