export class DotMatrixFormatter {
  // Initialize printer - simpler for dot matrix
  static init(): string {
    return '\x1B@'; // ESC @ - Initialize printer
  }

  // Text formatting
  static bold(text: string): string {
    return `\x1B[1m${text}\x1B[0m`; // ANSI bold
  }

  // Alignment (for 80-column dot matrix)
  static center(): string {
    return '\x1B[a\x01'; // Center alignment
  }

  static left(): string {
    return '\x1B[a\x00'; // Left alignment
  }

  static right(): string {
    return '\x1B[a\x02'; // Right alignment
  }

  // Font sizes (more limited than thermal)
  static condensedFont(): string {
    return '\x0F'; // SI - Condensed font
  }

  static normalFont(): string {
    return '\x12'; // DC2 - Normal font
  }

  static expandedFont(): string {
    return '\x0E'; // SO - Expanded font
  }

  static resetFont(): string {
    return '\x12'; // DC2 - Cancel condensed
  }

  // Layout controls
  static lineFeed(lines: number = 1): string {
    return '\n'.repeat(lines);
  }

  static formFeed(): string {
    return '\x0C'; // Form feed for continuous paper
  }

  static carriageReturn(): string {
    return '\r';
  }

  // Horizontal line for 80-column format
  static horizontalLine(width: number = 80): string {
    return '-'.repeat(Math.min(width, 80)) + '\n';
  }

  // Currency formatting for wider format (80 columns vs 32 for thermal)
  static formatCurrency(amount: number, width: number = 10): string {
    const formatted = amount.toFixed(2);
    return formatted.padStart(width);
  }

  static formatCurrencyWithSymbol(amount: number, width: number = 12): string {
    const formatted = `P${amount.toFixed(2)}`;
    return formatted.padStart(width);
  }

  // Line formatting for 80-column layout
  static formatLine(left: string, right: string, width: number = 80): string {
    const maxLeft = width - right.length - 1;
    const truncatedLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left;
    const padding = width - truncatedLeft.length - right.length;
    return truncatedLeft + ' '.repeat(Math.max(0, padding)) + right + '\n';
  }

  // Item line formatting for wider format
  static formatItemLine(
    name: string, 
    price: string, 
    quantity: number, 
    total: string, 
    width: number = 80
  ): string {
    // Format: "Item Name                    Price x Qty = Total"
    const qtyStr = `x${quantity}`;
    const rightPart = `${price} ${qtyStr} = ${total}`;
    const maxNameWidth = width - rightPart.length - 2;
    const truncatedName = name.length > maxNameWidth ? 
      name.substring(0, maxNameWidth - 3) + '...' : name;
    
    const padding = width - truncatedName.length - rightPart.length;
    return truncatedName + ' '.repeat(Math.max(1, padding)) + rightPart + '\n';
  }

  // Header formatting for business info
  static formatHeader(storeName: string, address: string, width: number = 80): string {
    let header = this.center();
    header += this.bold(storeName) + '\n';
    header += address + '\n';
    header += this.horizontalLine(width);
    header += this.left();
    return header;
  }

  // Footer with form feed for continuous paper
  static formatFooter(width: number = 80): string {
    let footer = '\n';
    footer += this.horizontalLine(width);
    footer += this.center();
    footer += 'Thank you for your business!\n';
    footer += this.left();
    footer += this.lineFeed(2);
    footer += this.formFeed(); // Advance to next form/page
    return footer;
  }

  // Receipt header with timestamp
  static formatReceiptHeader(receiptNumber: string, cashier: string, width: number = 80): string {
    const timestamp = new Date().toLocaleString();
    let header = '';
    header += this.formatLine('Receipt #:', receiptNumber, width);
    header += this.formatLine('Cashier:', cashier, width);
    header += this.formatLine('Date/Time:', timestamp, width);
    header += this.horizontalLine(width);
    return header;
  }

  // Column headers for items
  static formatColumnHeaders(width: number = 80): string {
    // Format: "Item                           Price  Qty   Total"
    const headers = 'Item' + ' '.repeat(30) + 'Price  Qty   Total';
    return headers.substring(0, width) + '\n' + this.horizontalLine(width);
  }

  // Totals section
  static formatTotals(subtotal: number, tax: number, total: number, width: number = 80): string {
    let totals = this.horizontalLine(width);
    totals += this.formatLine('Subtotal:', this.formatCurrencyWithSymbol(subtotal), width);
    if (tax > 0) {
      totals += this.formatLine('Tax:', this.formatCurrencyWithSymbol(tax), width);
    }
    totals += this.formatLine('TOTAL:', this.bold(this.formatCurrencyWithSymbol(total)), width);
    return totals;
  }

  // Payment information
  static formatPayment(method: string, amount: number, change?: number, width: number = 80): string {
    let payment = this.horizontalLine(width);
    payment += this.formatLine('Payment Method:', method.toUpperCase(), width);
    payment += this.formatLine('Amount Paid:', this.formatCurrencyWithSymbol(amount), width);
    if (change !== undefined && change > 0) {
      payment += this.formatLine('Change:', this.formatCurrencyWithSymbol(change), width);
    }
    return payment;
  }

  // Beep command (may not work on all dot matrix printers)
  static beep(count: number = 1): string {
    return '\x07'.repeat(count); // BEL character
  }

  // Test pattern for printer testing
  static testPattern(width: number = 80): string {
    let pattern = this.init();
    pattern += this.center();
    pattern += this.bold('DOT MATRIX PRINTER TEST') + '\n';
    pattern += this.left();
    pattern += this.horizontalLine(width);
    
    // Font tests
    pattern += this.normalFont() + 'Normal Font Test\n';
    pattern += this.condensedFont() + 'Condensed Font Test (smaller)\n';
    pattern += this.expandedFont() + 'Expanded Font Test\n';
    pattern += this.resetFont();
    
    pattern += this.horizontalLine(width);
    
    // Alignment tests
    pattern += this.left() + 'Left Aligned Text\n';
    pattern += this.center() + 'Center Aligned Text\n';
    pattern += this.right() + 'Right Aligned Text\n';
    pattern += this.left();
    
    pattern += this.horizontalLine(width);
    
    // Sample data formatting
    pattern += this.formatLine('Item Test:', 'P123.45', width);
    pattern += this.formatItemLine('Sample Product Name', 'P100.00', 2, 'P200.00', width);
    
    pattern += this.horizontalLine(width);
    pattern += this.center();
    pattern += 'Test completed successfully!\n';
    pattern += this.left();
    pattern += this.formFeed();
    
    return pattern;
  }
}