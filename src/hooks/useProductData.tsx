
import { useState, useEffect } from "react";
import { Product, Category } from "@/types";
import { toast } from "sonner";

export function useProductData(storeId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        if (!storeId) {
          setIsLoading(false);
          return;
        }

        // In a real implementation, we would pass the store ID to these functions
        const productsResponse = await fetch(`/api/products?storeId=${storeId}`);
        const categoriesResponse = await fetch(`/api/categories?storeId=${storeId}`);
        
        if (!productsResponse.ok || !categoriesResponse.ok) {
          throw new Error("Failed to fetch data");
        }
        
        // Mock data for now
        const mockProducts: Product[] = [
          {
            id: "1",
            name: "Classic Croffle",
            description: "Original butter croffle with sugar",
            price: 129,
            category_id: "classic",
            categoryId: "classic",
            image_url: "https://images.unsplash.com/photo-1596068587619-e4b11c7a3488",
            image: "https://images.unsplash.com/photo-1596068587619-e4b11c7a3488",
            is_active: true,
            isActive: true,
            stock_quantity: 50,
            stockQuantity: 50,
            sku: "CRF-CLS-001"
          },
          {
            id: "2",
            name: "Chocolate Croffle",
            description: "Butter croffle with chocolate drizzle",
            price: 149,
            category_id: "classic",
            categoryId: "classic",
            image_url: "https://images.unsplash.com/photo-1605265036003-3f548c1d5fbe",
            image: "https://images.unsplash.com/photo-1605265036003-3f548c1d5fbe",
            is_active: true,
            isActive: true,
            stock_quantity: 45,
            stockQuantity: 45,
            sku: "CRF-CLS-002"
          },
          {
            id: "3",
            name: "Strawberry Croffle",
            description: "Butter croffle with fresh strawberries",
            price: 159,
            category_id: "fruity",
            categoryId: "fruity",
            image_url: "https://images.unsplash.com/photo-1527515848755-3cd4faffd671",
            image: "https://images.unsplash.com/photo-1527515848755-3cd4faffd671",
            is_active: true,
            isActive: true,
            stock_quantity: 35,
            stockQuantity: 35,
            sku: "CRF-FRT-001"
          },
          {
            id: "4",
            name: "Blueberry Croffle",
            description: "Butter croffle with blueberry compote",
            price: 159,
            category_id: "fruity",
            categoryId: "fruity",
            image_url: "https://images.unsplash.com/photo-1585241938243-379a196fe14e",
            image: "https://images.unsplash.com/photo-1585241938243-379a196fe14e",
            is_active: true,
            isActive: true,
            stock_quantity: 30,
            stockQuantity: 30,
            sku: "CRF-FRT-002"
          },
          {
            id: "5",
            name: "Premium Nutella Croffle",
            description: "Butter croffle with premium Nutella and nuts",
            price: 189,
            category_id: "premium",
            categoryId: "premium",
            image_url: "https://images.unsplash.com/photo-1663149287692-5cb81f1c544c",
            image: "https://images.unsplash.com/photo-1663149287692-5cb81f1c544c",
            is_active: true,
            isActive: true,
            stock_quantity: 25,
            stockQuantity: 25,
            sku: "CRF-PRM-001"
          },
          {
            id: "6",
            name: "Premium Matcha Croffle",
            description: "Butter croffle with premium matcha cream",
            price: 189,
            category_id: "premium",
            categoryId: "premium",
            image_url: "https://images.unsplash.com/photo-1638984496691-fdd2fc3c92ba",
            image: "https://images.unsplash.com/photo-1638984496691-fdd2fc3c92ba",
            is_active: true,
            isActive: true,
            stock_quantity: 20,
            stockQuantity: 20,
            sku: "CRF-PRM-002"
          }
        ];
        
        const mockCategories: Category[] = [
          {
            id: "classic",
            name: "Classic Croffle",
            is_active: true,
            isActive: true
          },
          {
            id: "fruity",
            name: "Fruity",
            is_active: true,
            isActive: true
          },
          {
            id: "premium",
            name: "Premium Croffle",
            is_active: true,
            isActive: true
          }
        ];
        
        setProducts(mockProducts);
        setCategories(mockCategories);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [storeId]);

  return { products, categories, isLoading };
}
