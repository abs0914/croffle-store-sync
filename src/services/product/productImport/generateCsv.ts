
import { Product } from "@/types";
import { mapProductToCSVRow } from './utils';

export const generateProductsCSV = (products: Product[]): string => {
  const headers = ['name', 'sku', 'description', 'category_id', 'stock_quantity', 'is_active', 'has_variations', 'regular_price', 'mini_price', 'overload_price'];
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
  
  // Add example rows based on the provided template
  const exampleRow1 = [
    'Tiramisu',
    'CRFFLE-001',
    '',
    'Classic',
    '50',
    'TRUE',
    'TRUE',
    '125',
    '65',
    ''
  ].join(',');
  
  const exampleRow2 = [
    'Choco Nut',
    'CRFFLE-002',
    '',
    'Classic',
    '50',
    'TRUE',
    'TRUE',
    '125',
    '65',
    ''
  ].join(',');
  
  const exampleRow3 = [
    'Croffle Overload',
    'CRFFLE-015',
    '',
    'Overload',
    '50',
    'TRUE',
    'FALSE',
    '',
    '',
    '99'
  ].join(',');
  
  return `${csvContent}\n${exampleRow1}\n${exampleRow2}\n${exampleRow3}`;
};
