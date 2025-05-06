
import { Product, Category, Customer, Shift } from "@/types";

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Classic Croffle",
    description: "Our signature croissant-waffle hybrid with butter and powdered sugar",
    price: 120,
    categoryId: "1",
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9",
    isActive: true,
    sku: "CRF-001",
    barcode: "8901234567890",
    cost: 50,
    stockQuantity: 50,
    variations: [
      {
        id: "1-1",
        name: "With Ice Cream",
        price: 150,
        isActive: true,
        stockQuantity: 30,
      },
      {
        id: "1-2",
        name: "With Chocolate Sauce",
        price: 135,
        isActive: true,
        stockQuantity: 40,
      },
    ],
  },
  {
    id: "2",
    name: "Chocolate Croffle",
    description: "Delicious croffle filled with rich chocolate cream",
    price: 140,
    categoryId: "1",
    image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07",
    isActive: true,
    sku: "CRF-002",
    barcode: "8901234567891",
    cost: 60,
    stockQuantity: 45,
  },
  {
    id: "3",
    name: "Strawberry Croffle",
    description: "Sweet croffle topped with fresh strawberries and cream",
    price: 160,
    categoryId: "1",
    image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901",
    isActive: true,
    sku: "CRF-003",
    barcode: "8901234567892",
    cost: 70,
    stockQuantity: 35,
  },
  {
    id: "4",
    name: "Matcha Croffle",
    description: "Japanese-inspired croffle with matcha cream",
    price: 150,
    categoryId: "1",
    image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04",
    isActive: true,
    sku: "CRF-004",
    barcode: "8901234567893",
    cost: 65,
    stockQuantity: 40,
  },
  {
    id: "5",
    name: "Iced Coffee",
    description: "Refreshing cold brew coffee",
    price: 90,
    categoryId: "2",
    isActive: true,
    sku: "DRK-001",
    barcode: "8901234567894",
    cost: 30,
    stockQuantity: 100,
    variations: [
      {
        id: "5-1",
        name: "Large",
        price: 110,
        isActive: true,
        stockQuantity: 70,
      },
    ],
  },
  {
    id: "6",
    name: "Hot Chocolate",
    description: "Rich and creamy hot chocolate",
    price: 100,
    categoryId: "2",
    isActive: true,
    sku: "DRK-002",
    barcode: "8901234567895",
    cost: 40,
    stockQuantity: 80,
  },
];

export const mockCategories: Category[] = [
  {
    id: "1",
    name: "Croffles",
    description: "Our signature croissant-waffle hybrids",
    isActive: true,
  },
  {
    id: "2",
    name: "Drinks",
    description: "Beverages to complement your croffle",
    isActive: true,
  },
];

export const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    phone: "555-123-4567",
    address: "123 Main St",
    loyaltyPoints: 150,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "555-987-6543",
    loyaltyPoints: 75,
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
