
export class ESCPOSFormatter {
  private static readonly ESC = '\x1B';
  private static readonly GS = '\x1D';
  
  // Initialize printer
  static init(): string {
    return this.ESC + '@';
  }
  
  // Text formatting
  static bold(text: string): string {
    return this.ESC + 'E1' + text + this.ESC + 'E0';
  }
  
  static center(): string {
    return this.ESC + 'a1';
  }
  
  static left(): string {
    return this.ESC + 'a0';
  }
  
  static doubleWidth(): string {
    return this.GS + '!1';
  }
  
  static normalWidth(): string {
    return this.GS + '!0';
  }
  
  // Line feeds
  static lineFeed(lines: number = 1): string {
    return '\n'.repeat(lines);
  }
  
  // Cut paper
  static cut(): string {
    return this.GS + 'V' + String.fromCharCode(65) + String.fromCharCode(0);
  }
  
  // QR Code
  static qrCode(data: string): string {
    const qrCommands = [
      this.GS + '(k' + String.fromCharCode(4, 0, 49, 65, 50, 0), // QR model
      this.GS + '(k' + String.fromCharCode(3, 0, 49, 67, 8), // QR size
      this.GS + '(k' + String.fromCharCode(3, 0, 49, 69, 48), // QR error correction
      this.GS + '(k' + String.fromCharCode(data.length + 3, 0, 49, 80, 48) + data, // QR data
      this.GS + '(k' + String.fromCharCode(3, 0, 49, 81, 48) // QR print
    ];
    return qrCommands.join('');
  }
  
  // Horizontal line
  static horizontalLine(width: number = 32): string {
    return '-'.repeat(width) + this.lineFeed();
  }
  
  // Format currency for thermal printer (right-aligned)
  static formatCurrency(amount: number, width: number = 32): string {
    const formatted = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
    
    return formatted.padStart(width);
  }
  
  // Format line with left and right text
  static formatLine(left: string, right: string, width: number = 32): string {
    const totalLength = left.length + right.length;
    const padding = Math.max(0, width - totalLength);
    return left + ' '.repeat(padding) + right + this.lineFeed();
  }
}
