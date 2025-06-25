
import { Product, Category, Customer, Shift } from "@/types";

const mockTimestamp = new Date().toISOString();

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Classic Croffle",
    description: "Our signature croissant-waffle hybrid with butter and powdered sugar",
    price: 120,
    categoryId: "1",
    category_id: "1", 
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9",
    image_url: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9",
    isActive: true,
    is_active: true,
    sku: "CRF-001",
    barcode: "8901234567890",
    cost: 50,
    stockQuantity: 50,
    stock_quantity: 50,
    store_id: "1",
    storeId: "1",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
    variations: [
      {
        id: "1-1",
        name: "With Ice Cream",
        price: 150,
        is_active: true,
        isActive: true,
        stockQuantity: 30,
        stock_quantity: 30,
        product_id: "1",
        productId: "1",
        sku: "CRF-001-IC",
        created_at: mockTimestamp,
        updated_at: mockTimestamp
      },
      {
        id: "1-2",
        name: "With Chocolate Sauce",
        price: 135,
        is_active: true,
        isActive: true,
        stockQuantity: 40,
        stock_quantity: 40,
        product_id: "1",
        productId: "1",
        sku: "CRF-001-CS",
        created_at: mockTimestamp,
        updated_at: mockTimestamp
      },
    ],
  },
  {
    id: "2",
    name: "Chocolate Croffle",
    description: "Delicious croffle filled with rich chocolate cream",
    price: 140,
    categoryId: "1",
    category_id: "1",
    image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07",
    image_url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07",
    isActive: true,
    is_active: true,
    sku: "CRF-002",
    barcode: "8901234567891",
    cost: 60,
    stockQuantity: 45,
    stock_quantity: 45,
    store_id: "1",
    storeId: "1",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  },
  {
    id: "3",
    name: "Strawberry Croffle",
    description: "Sweet croffle topped with fresh strawberries and cream",
    price: 160,
    categoryId: "1",
    category_id: "1",
    image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901",
    image_url: "https://images.unsplash.com/photo-1582562124811-c09040d0a901",
    isActive: true,
    is_active: true,
    sku: "CRF-003",
    barcode: "8901234567892",
    cost: 70,
    stockQuantity: 35,
    stock_quantity: 35,
    store_id: "1",
    storeId: "1",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  },
  {
    id: "4",
    name: "Matcha Croffle",
    description: "Japanese-inspired croffle with matcha cream",
    price: 150,
    categoryId: "1",
    category_id: "1",
    image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04",
    image_url: "https://images.unsplash.com/photo-1721322800607-8c38375eef04",
    isActive: true,
    is_active: true,
    sku: "CRF-004",
    barcode: "8901234567893",
    cost: 65,
    stockQuantity: 40,
    stock_quantity: 40,
    store_id: "1",
    storeId: "1",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  },
  {
    id: "5",
    name: "Iced Coffee",
    description: "Refreshing cold brew coffee",
    price: 90,
    categoryId: "2",
    category_id: "2",
    isActive: true,
    is_active: true,
    sku: "DRK-001",
    barcode: "8901234567894",
    cost: 30,
    stockQuantity: 100,
    stock_quantity: 100,
    store_id: "1",
    storeId: "1",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
    variations: [
      {
        id: "5-1",
        name: "Large",
        price: 110,
        is_active: true,
        isActive: true,
        stockQuantity: 70,
        stock_quantity: 70,
        product_id: "5",
        productId: "5",
        sku: "DRK-001-L",
        created_at: mockTimestamp,
        updated_at: mockTimestamp
      },
    ],
  },
  {
    id: "6",
    name: "Hot Chocolate",
    description: "Rich and creamy hot chocolate",
    price: 100,
    categoryId: "2",
    category_id: "2",
    isActive: true,
    is_active: true,
    sku: "DRK-002",
    barcode: "8901234567895",
    cost: 40,
    stockQuantity: 80,
    stock_quantity: 80,
    store_id: "1",
    storeId: "1",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  },
];

export const mockCategories: Category[] = [
  {
    id: "1",
    name: "Croffles",
    description: "Our signature croissant-waffle hybrids",
    isActive: true,
    is_active: true,
    storeId: "1",
    store_id: "1",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  },
  {
    id: "2",
    name: "Drinks",
    description: "Beverages to complement your croffle",
    isActive: true,
    is_active: true,
    storeId: "1",
    store_id: "1",
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  },
];

export const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    phone: "555-123-4567",
    address: "123 Main St",
    store_id: "1",
    storeId: "1",
    storeName: "Main Store",
    loyaltyPoints: 150,
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "555-987-6543",
    store_id: "1",
    storeId: "1",
    storeName: "Main Store",
    loyaltyPoints: 75,
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
  },
];

export const mockShift: Shift = {
  id: "1",
  userId: "1",
  storeId: "1",
  startTime: new Date().toISOString(),
  startingCash: 1000,
  status: "active",
};

// Simulate fetch calls with a delay
export const fetchProducts = async (): Promise<Product[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockProducts), 500);
  });
};

export const fetchCategories = async (): Promise<Category[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockCategories), 500);
  });
};

export const fetchCustomers = async (): Promise<Customer[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockCustomers), 500);
  });
};

export const fetchActiveShift = async (
  userId: string,
  storeId: string
): Promise<Shift | null> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockShift), 500);
  });
};
