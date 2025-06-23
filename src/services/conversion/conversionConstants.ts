
// Valid units that match the database constraint
export const VALID_UNITS = [
  'kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs', 
  '1 Box', '1 Kilo', '1 Liter', '900 grams', '2500 grams', 
  '5000 grams', '1000 grams', '750 grams', '454 grams', 
  '500 grams', '680 grams', '6000 grams', '630 grams', 
  'Piece', 'Pack of 25', 'Pack of 50', 'Pack of 100', 
  'Pack of 20', 'Pack of 32', 'Pack of 24', 'Pack of 27',
  'Box', 'Piping Bag', 'liter', 'pack', 'piece'
];

// Map common unit variations to valid database units
export const UNIT_MAPPING: Record<string, string> = {
  'box': 'Box',
  'boxes': 'Box', 
  'piece': 'piece',
  'pieces': 'piece',
  'kg': '1 Kilo',
  'kilo': '1 Kilo',
  'kilos': '1 Kilo',
  'liter': 'liter',
  'liters': 'liter',
  'ml': 'ml',
  'g': 'g',
  'grams': 'g',
  'pack': 'pack',
  'packs': 'packs',
  'piping bag': 'Piping Bag',
  'piping_bag': 'Piping Bag'
};
