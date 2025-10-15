# Robinsons POS System Requirements

## System Requirements for Robinsons Accreditation

This document outlines the operating system and software requirements for running the Croffle Store POS system in compliance with Robinsons Land Corporation accreditation standards.

---

## 1. Operating System Requirements

### Supported Operating Systems

The Croffle Store POS is a **web-based application** that runs in modern web browsers. It can operate on the following operating systems:

#### **Windows** (Recommended)
- **Windows 10** (version 1909 or later)
- **Windows 11** (all versions)
- **Windows Server 2019** or newer

#### **Linux**
- **Ubuntu 20.04 LTS** or newer
- **Debian 11** or newer
- **CentOS 8** or newer
- Other modern Linux distributions with Chrome/Firefox support

#### **macOS** (For administrative use)
- **macOS 11 (Big Sur)** or newer

---

## 2. Web Browser Requirements

The POS system requires a **modern web browser** with the following specifications:

### Supported Browsers (Latest Versions)
- ✅ **Google Chrome** (version 90+) - **Recommended**
- ✅ **Microsoft Edge** (Chromium-based, version 90+)
- ✅ **Mozilla Firefox** (version 88+)
- ✅ **Safari** (version 14+, macOS only)

### Browser Features Required
- JavaScript enabled
- Cookies enabled
- Local Storage support
- WebSocket support (for real-time updates)

---

## 3. Anti-Virus Requirements

**Robinsons Requirement #2**: System must have anti-virus software installed

### Windows Systems
**Option 1: Windows Defender** (Built-in, Recommended)
- Included with Windows 10/11
- No additional cost
- Automatically updated by Microsoft
- Meets Robinsons requirement

**Option 2: Third-Party Anti-Virus**
- Norton AntiVirus Plus
- McAfee Total Protection
- Kaspersky Anti-Virus
- Bitdefender Antivirus Plus

### Linux Systems
**Recommended Anti-Virus Software:**
- **ClamAV** (Open Source)
  ```bash
  # Ubuntu/Debian installation
  sudo apt-get update
  sudo apt-get install clamav clamav-daemon
  
  # Update virus definitions
  sudo freshclam
  
  # Start ClamAV service
  sudo systemctl start clamav-daemon
  ```

- **Sophos Anti-Virus for Linux** (Commercial)
- **ESET NOD32 Antivirus for Linux** (Commercial)

### macOS Systems
- **Built-in XProtect** (Native macOS protection)
- **Malwarebytes for Mac** (Optional)

---

## 4. Network Requirements

### Internet Connection
- **Minimum**: 10 Mbps download / 5 Mbps upload
- **Recommended**: 50 Mbps download / 10 Mbps upload
- **Latency**: < 100ms to Supabase servers

### Network Connectivity
- ✅ **Wired (Ethernet)** - Recommended for POS terminals
- ✅ **Wireless (Wi-Fi)** - Acceptable for mobile/tablet devices
- **Network Stability**: Required for real-time data synchronization

### Firewall Configuration
Allow outbound connections to:
- `*.supabase.co` (Database and API)
- `*.lovable.app` (Application hosting)
- Robinsons SFTP server (specific IP to be provided)

---

## 5. Hardware Requirements

### Minimum Requirements
- **Processor**: Intel Core i3 or equivalent
- **RAM**: 4 GB
- **Storage**: 20 GB available space
- **Display**: 1280x720 resolution

### Recommended Requirements
- **Processor**: Intel Core i5 or AMD Ryzen 5
- **RAM**: 8 GB or more
- **Storage**: 50 GB SSD
- **Display**: 1920x1080 resolution or higher

### Peripheral Devices (Optional)
- Thermal receipt printer (80mm)
- Barcode scanner
- Cash drawer
- Card reader (for card payments)

---

## 6. Desktop Application Option (Optional)

For users who prefer a **native desktop experience**, we offer an **Electron-based desktop application**:

### Benefits of Desktop App
- Runs as a standalone application (no browser required)
- Can run on startup automatically
- Better integration with hardware (printers, cash drawers)
- Offline capability (limited features)

### Desktop App Installation

**Windows:**
```powershell
# Download installer
Invoke-WebRequest -Uri "https://croffle-pos.com/download/windows" -OutFile "CrofflePOS-Setup.exe"

# Run installer
.\CrofflePOS-Setup.exe
```

**Linux:**
```bash
# Download AppImage
wget https://croffle-pos.com/download/linux/CrofflePOS.AppImage

# Make executable
chmod +x CrofflePOS.AppImage

# Run
./CrofflePOS.AppImage
```

**macOS:**
```bash
# Download DMG
curl -O https://croffle-pos.com/download/mac/CrofflePOS.dmg

# Mount and install
open CrofflePOS.dmg
```

---

## 7. Security Requirements

### SSL/TLS
- All connections use **TLS 1.2** or higher
- **HTTPS** enforced for all web traffic
- **End-to-end encryption** for sensitive data

### Data Protection
- Local data encrypted using AES-256
- Passwords hashed using bcrypt
- PCI-DSS compliant payment processing

### User Authentication
- Multi-factor authentication (MFA) available
- Role-based access control (RBAC)
- Session timeout after inactivity

---

## 8. Robinsons-Specific Configuration

### SFTP Setup for Data Transmission
To enable automated data transmission to Robinsons:

1. **Obtain SFTP Credentials** from Robinsons IT:
   - SFTP Server Address
   - Username
   - Password/SSH Key
   - Target Directory

2. **Configure in POS System**:
   - Navigate to: Settings → BIR Compliance → SM/Robinsons Integration
   - Enter SFTP credentials
   - Test connection
   - Enable automatic daily transmission

### Store Configuration Required
- **Tenant ID** (provided by Robinsons)
- **Terminal Numbers** (Terminal 1, Terminal 2, etc.)
- **Store Code** (Robinsons store location code)

---

## 9. Maintenance & Updates

### Automatic Updates
- Web application updates automatically (no user action required)
- Desktop app checks for updates on startup
- Security patches applied immediately

### Manual Updates (Desktop App Only)
```bash
# Check for updates
croffle-pos --check-updates

# Apply updates
croffle-pos --update
```

### Backup Recommendations
- **Daily**: Automated cloud backup (included)
- **Weekly**: Local backup to external drive
- **Monthly**: Full system backup for disaster recovery

---

## 10. Troubleshooting

### Common Issues

**Issue: Browser Compatibility**
- Solution: Use Google Chrome (latest version)
- Clear browser cache and cookies

**Issue: Network Connectivity**
- Solution: Check firewall settings
- Verify internet connection stability

**Issue: Anti-Virus False Positives**
- Solution: Whitelist `*.lovable.app` and `*.supabase.co`

**Issue: Slow Performance**
- Solution: Close unnecessary browser tabs
- Upgrade to recommended hardware specs

---

## 11. Support & Contact

### Technical Support
- **Email**: support@crofflestore.com
- **Phone**: +63 XXX-XXXX-XXX
- **Live Chat**: Available in-app (9 AM - 6 PM PHT)

### Robinsons Accreditation Support
- For Robinsons-specific compliance questions
- For SFTP connectivity issues
- For file format validation

---

## 12. Compliance Checklist

Before going live with Robinsons:

- [ ] Operating system meets minimum requirements
- [ ] Anti-virus software installed and updated
- [ ] Modern web browser installed (Chrome recommended)
- [ ] Internet connection speed tested (10+ Mbps)
- [ ] SFTP credentials configured and tested
- [ ] Tenant ID and Terminal Numbers configured
- [ ] BIR compliance settings verified
- [ ] Test data transmission successful
- [ ] Staff trained on EOD procedures
- [ ] Backup systems in place

---

## Document Version
- **Version**: 1.0
- **Last Updated**: December 2025
- **Prepared For**: Robinsons Land Corporation Accreditation
- **Contact**: Croffle Store Technical Team

---

**Note**: This document should be reviewed and updated whenever system requirements change or when Robinsons updates their accreditation criteria.
