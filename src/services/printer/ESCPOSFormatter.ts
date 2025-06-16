
export class ESCPOSFormatter {
  private static readonly ESC = '\x1B';
  private static readonly GS = '\x1D';

  // Initialize printer
  static init(): string {
    return this.ESC + '@'; // Initialize printer only - let it use default font
  }

  // Text formatting (simplified - no font interference)
  static bold(text: string): string {
    return this.ESC + 'E' + '\x01' + text + this.ESC + 'E' + '\x00';
  }

  static center(): string {
    return this.ESC + 'a' + '\x01';
  }

  static left(): string {
    return this.ESC + 'a' + '\x00';
  }

  static right(): string {
    return this.ESC + 'a' + '\x02';
  }

  // Font size controls (optimized for thermal printers)
  static smallFont(): string {
    return this.ESC + '!' + '\x01'; // Small font (Font B)
  }

  static normalFont(): string {
    return this.ESC + '!' + '\x00'; // Normal font (Font A)
  }

  static doubleWidth(): string {
    return this.GS + '!' + '\x10'; // Double width only
  }

  static doubleHeight(): string {
    return this.GS + '!' + '\x01'; // Double height only
  }

  static doubleSize(): string {
    return this.GS + '!' + '\x11'; // Double width and height
  }

  static normalSize(): string {
    return this.GS + '!' + '\x00' + this.ESC + '!' + '\x00'; // Reset both GS and ESC font controls
  }

  // Use normal font (Font A) - more reliable than Font B
  static useNormalFont(): string {
    return this.ESC + '!' + '\x00'; // Font A, normal size
  }

  // Use smaller font only if needed (Font B)
  static useSmallFont(): string {
    return this.ESC + '!' + '\x01'; // Font B (smaller)
  }

  // Reset to normal size (no double width/height)
  static resetSize(): string {
    return this.GS + '!' + '\x00'; // Normal character size
  }

  // Legacy method for compatibility
  static normalWidth(): string {
    return this.normalSize();
  }
  
  // Line feeds
  static lineFeed(lines: number = 1): string {
    return '\n'.repeat(lines);
  }
  
  // Cut paper
  static cut(): string {
    return this.GS + 'V' + String.fromCharCode(65) + String.fromCharCode(0);
  }
  
  // QR Code (simplified - no font interference)
  static qrCode(data: string): string {
    const qrCommands = [
      this.GS + '(k' + String.fromCharCode(4, 0, 49, 65, 50, 0), // QR model
      this.GS + '(k' + String.fromCharCode(3, 0, 49, 67, 4), // QR size = 4 (medium size)
      this.GS + '(k' + String.fromCharCode(3, 0, 49, 69, 48), // QR error correction
      this.GS + '(k' + String.fromCharCode(data.length + 3, 0, 49, 80, 48) + data, // QR data
      this.GS + '(k' + String.fromCharCode(3, 0, 49, 81, 48) // QR print
    ];
    return qrCommands.join('');
  }
  
  // Horizontal line (adjusted for thermal printer width)
  static horizontalLine(width: number = 32): string {
    return '-'.repeat(width) + this.lineFeed();
  }

  // Format currency for thermal printer (avoid problematic peso symbol)
  static formatCurrency(amount: number, width: number = 10): string {
    // Use simple number formatting without currency symbol to avoid encoding issues
    const formatted = amount.toFixed(2);
    return formatted.padStart(width);
  }

  // Format currency with peso symbol (use safe ASCII representation)
  static formatCurrencyWithSymbol(amount: number, width: number = 12): string {
    const formatted = 'P' + amount.toFixed(2); // Use 'P' instead of ₱ symbol
    return formatted.padStart(width);
  }

  // Format line with left and right text (optimized for thermal printer)
  static formatLine(left: string, right: string, width: number = 32): string {
    // Ensure we don't exceed the line width
    const maxLeftWidth = width - right.length - 1; // Leave space for at least 1 space
    const truncatedLeft = left.length > maxLeftWidth ? left.substring(0, maxLeftWidth - 3) + '...' : left;

    const totalLength = truncatedLeft.length + right.length;
    const padding = Math.max(1, width - totalLength); // At least 1 space

    return truncatedLeft + ' '.repeat(padding) + right + this.lineFeed();
  }

  // Format item line (special formatting for product items)
  static formatItemLine(name: string, price: string, quantity: number, total: string, width: number = 32): string {
    // Format: "Product Name"
    //         "  P10.00 x 2        P20.00"
    let result = name + this.lineFeed();

    const qtyLine = `  P${price} x ${quantity}`;
    const totalFormatted = `P${total}`;

    const padding = Math.max(1, width - qtyLine.length - totalFormatted.length);
    result += qtyLine + ' '.repeat(padding) + totalFormatted + this.lineFeed();

    return result;
  }
}
