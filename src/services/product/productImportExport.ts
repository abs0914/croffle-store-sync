
import { Product } from "@/types";

// CSV Import/Export
export const parseProductsCSV = (csvData: string): any[] => {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const values = line.split(',').map(value => value.trim());
    const product: any = {};
    
    headers.forEach((header, i) => {
      product[header] = values[i];
    });
    
    return product;
  }).filter(Boolean);
};

export const generateProductsCSV = (products: Product[]): string => {
  const headers = ['name', 'sku', 'description', 'price', 'stock_quantity', 'is_active'];
  const csvRows = [headers.join(',')];
  
  products.forEach(product => {
    const row = [
      `"${product.name}"`,
      `"${product.sku}"`,
      `"${product.description?.replace(/"/g, '""') || ''}"`,
      product.price,
      product.stockQuantity,
      product.isActive ? 'true' : 'false'
    ];
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

export const generateProductImportTemplate = (): string => {
  // Define the headers based on the required fields for product import
  const headers = [
    'name',
    'sku',
    'description',
    'price',
    'stock_quantity',
    'is_active'
  ];
  
  // Create the CSV string with headers
  const csvContent = headers.join(',');
  
  // Add an example row with empty values
  const exampleRow = [
    '"Product Name"',
    '"SKU123"',
    '"Product description"',
    '10.99',
    '100',
    'true'
  ].join(',');
  
  return `${csvContent}\n${exampleRow}`;
};
