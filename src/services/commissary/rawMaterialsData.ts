
// Raw materials data based on the screenshot provided
export const RAW_MATERIALS_DATA = [
  // Croissants - Pre-made, ready for conversion
  {
    name: "Regular Croissant",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "1 Box",
    unit_cost: 150.00,
    current_stock: 10,
    minimum_threshold: 2,
    sku: "RAW-CROIS-REG",
    storage_location: "Cold Storage"
  },
  
  // Biscoff products
  {
    name: "Biscoff Crushed",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "1 kilo",
    unit_cost: 180.00,
    current_stock: 5,
    minimum_threshold: 1,
    sku: "RAW-BISC-CRUSH",
    storage_location: "Dry Storage"
  },
  {
    name: "Biscoff Spread",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "680 grams",
    unit_cost: 320.00,
    current_stock: 8,
    minimum_threshold: 2,
    sku: "RAW-BISC-SPREAD",
    storage_location: "Dry Storage"
  },
  
  // Chocolate products
  {
    name: "Chocolate Bar Crushed",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "500 grams",
    unit_cost: 250.00,
    current_stock: 6,
    minimum_threshold: 1,
    sku: "RAW-CHOC-CRUSH",
    storage_location: "Dry Storage"
  },
  {
    name: "Chocolate Chips",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "1 kilo",
    unit_cost: 380.00,
    current_stock: 4,
    minimum_threshold: 1,
    sku: "RAW-CHOC-CHIPS",
    storage_location: "Dry Storage"
  },
  {
    name: "Chocolate Syrup",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "630 grams",
    unit_cost: 200.00,
    current_stock: 12,
    minimum_threshold: 3,
    sku: "RAW-CHOC-SYR",
    storage_location: "Dry Storage"
  },
  
  // Cream and dairy
  {
    name: "Whipped Cream",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "1 liter",
    unit_cost: 120.00,
    current_stock: 15,
    minimum_threshold: 3,
    sku: "RAW-CREAM-WHIP",
    storage_location: "Cold Storage"
  },
  {
    name: "Ice Cream",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "2500 grams",
    unit_cost: 280.00,
    current_stock: 8,
    minimum_threshold: 2,
    sku: "RAW-ICECREAM",
    storage_location: "Freezer"
  },
  
  // Nuts and toppings
  {
    name: "Almonds Crushed",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "454 grams",
    unit_cost: 420.00,
    current_stock: 5,
    minimum_threshold: 1,
    sku: "RAW-ALMOND-CRUSH",
    storage_location: "Dry Storage"
  },
  {
    name: "Almonds Sliced",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "454 grams",
    unit_cost: 400.00,
    current_stock: 6,
    minimum_threshold: 1,
    sku: "RAW-ALMOND-SLICE",
    storage_location: "Dry Storage"
  },
  {
    name: "Peanuts",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "1 kilo",
    unit_cost: 180.00,
    current_stock: 4,
    minimum_threshold: 1,
    sku: "RAW-PEANUTS",
    storage_location: "Dry Storage"
  },
  
  // Fruits
  {
    name: "Banana",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "1 kilo",
    unit_cost: 80.00,
    current_stock: 20,
    minimum_threshold: 5,
    sku: "RAW-BANANA",
    storage_location: "Room Temperature"
  },
  {
    name: "Strawberry",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "500 grams",
    unit_cost: 150.00,
    current_stock: 10,
    minimum_threshold: 3,
    sku: "RAW-STRAWBERRY",
    storage_location: "Cold Storage"
  },
  
  // Sauces and spreads
  {
    name: "Caramel Sauce",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "750 grams",
    unit_cost: 180.00,
    current_stock: 8,
    minimum_threshold: 2,
    sku: "RAW-CARAMEL",
    storage_location: "Dry Storage"
  },
  {
    name: "Nutella",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "900 grams",
    unit_cost: 450.00,
    current_stock: 6,
    minimum_threshold: 2,
    sku: "RAW-NUTELLA",
    storage_location: "Dry Storage"
  },
  {
    name: "Peanut Butter",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "510 grams",
    unit_cost: 220.00,
    current_stock: 7,
    minimum_threshold: 2,
    sku: "RAW-PB",
    storage_location: "Dry Storage"
  },
  
  // Beverages
  {
    name: "Milk",
    category: "raw_materials" as const,
    item_type: "raw_material" as const,
    uom: "1 liter",
    unit_cost: 65.00,
    current_stock: 25,
    minimum_threshold: 5,
    sku: "RAW-MILK",
    storage_location: "Cold Storage"
  },
  
  // Packaging materials
  {
    name: "Croissant Box",
    category: "packaging_materials" as const,
    item_type: "supply" as const,
    uom: "pack of 50",
    unit_cost: 125.00,
    current_stock: 20,
    minimum_threshold: 5,
    sku: "PKG-CROIS-BOX",
    storage_location: "Storage Room"
  },
  {
    name: "Food Container Small",
    category: "packaging_materials" as const,
    item_type: "supply" as const,
    uom: "pack of 100",
    unit_cost: 180.00,
    current_stock: 15,
    minimum_threshold: 3,
    sku: "PKG-CONT-SM",
    storage_location: "Storage Room"
  },
  {
    name: "Food Container Large",
    category: "packaging_materials" as const,
    item_type: "supply" as const,
    uom: "pack of 50",
    unit_cost: 220.00,
    current_stock: 12,
    minimum_threshold: 3,
    sku: "PKG-CONT-LG",
    storage_location: "Storage Room"
  }
];
