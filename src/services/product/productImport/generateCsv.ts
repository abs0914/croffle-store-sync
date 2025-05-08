
import { Product } from "@/types";
import { mapProductToCSVRow } from './utils';

export const generateProductsCSV = (products: Product[]): string => {
  const headers = ['name', 'sku', 'description', 'stock_quantity', 'is_active', 'has_variations', 'regular_price', 'mini_price', 'overload_price'];
  const csvRows = [headers.join(',')];
  
  products.forEach(product => {
    const row = mapProductToCSVRow(product);
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
    'category_id',
    'stock_quantity',
    'is_active',
    'has_variations',
    'regular_price',
    'mini_price',
    'overload_price'
  ];
  
  // Create the CSV string with headers
  const csvContent = headers.join(',');
  
  // Add example rows
  const exampleRow1 = [
    '"Product Without Variations"',
    '"SKU123"',
    '"Product description"',
    '"classic"',
    '100',
    'true',
    'false',
    '10.99',
    '',
    ''
  ].join(',');
  
  const exampleRow2 = [
    '"Product With Size Variations"',
    '"SKU456"',
    '"Product with Regular, Mini, and Overload sizes"',
    '"premium"',
    '300',
    'true',
    'true',
    '15.99',
    '11.99',
    '19.99'
  ].join(',');
  
  return `${csvContent}\n${exampleRow1}\n${exampleRow2}`;
};
