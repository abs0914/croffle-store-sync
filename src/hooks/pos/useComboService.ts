import { useMemo } from "react";
import { Product, Category } from "@/types";

export function useComboService() {
  // Combo pricing rules based on the provided table
  const comboPricing = useMemo(() => ({
    "Classic": {
      "Hot Espresso": 170,
      "Cold Espresso": 175
    },
    "Glaze": {
      "Hot Espresso": 125,
      "Cold Espresso": 130
    },
    "Fruity": {
      "Hot Espresso": 170,
      "Cold Espresso": 175
    },
    "Premium": {
      "Hot Espresso": 170,
      "Cold Espresso": 175
    },
    "Mini Croffle": {
      "Hot Espresso": 110,
      "Cold Espresso": 115
    }
  }), []);

  const getComboPrice = (croffleCategory: string, espressoType: string): number => {
    return comboPricing[croffleCategory as keyof typeof comboPricing]?.[espressoType as "Hot Espresso" | "Cold Espresso"] || 0;
  };

  const getEspressoProducts = (products: Product[], categories: Category[]): Product[] => {
    console.log('🔍 getEspressoProducts debug:', {
      productsCount: products.length,
      categoriesCount: categories.length,
      allCategories: categories.map(c => ({ name: c.name, id: c.id })),
      allProducts: products.map(p => ({ name: p.name, category_id: p.category_id, is_active: p.is_active }))
    });
    
    // Try multiple approaches to find espresso products
    let espressoProducts: Product[] = [];
    
    // Approach 1: Find by category name "Espresso"
    const espressoCategory = categories.find(c => c.name === "Espresso");
    if (espressoCategory) {
      console.log('✅ Espresso category found:', { 
        id: espressoCategory.id, 
        name: espressoCategory.name,
        store_id: espressoCategory.store_id 
      });
      
      espressoProducts = products.filter(p => 
        p.category_id === espressoCategory.id && p.is_active
      );
    }
    
    // Approach 2: If no products found, search by product names containing espresso keywords
    if (espressoProducts.length === 0) {
      console.log('🔍 No products found by category, searching by product names...');
      espressoProducts = products.filter(p => 
        p.is_active && p.name && (
          p.name.toLowerCase().includes('espresso') ||
          p.name.toLowerCase().includes('americano') ||
          p.name.toLowerCase().includes('latte') ||
          p.name.toLowerCase().includes('cappuccino') ||
          p.name.toLowerCase().includes('macchiato')
        )
      );
    }
    
    // Approach 3: Try finding category with different variations of "Espresso"
    if (espressoProducts.length === 0) {
      console.log('🔍 Searching for espresso categories with different names...');
      const possibleEspressoCategories = categories.filter(c => 
        c.is_active && c.name && (
          c.name.toLowerCase().includes('espresso') ||
          c.name.toLowerCase().includes('coffee') ||
          c.name.toLowerCase().includes('beverage') ||
          c.name.toLowerCase().includes('drink')
        )
      );
      
      console.log('🔍 Possible espresso categories:', possibleEspressoCategories.map(c => c.name));
      
      for (const category of possibleEspressoCategories) {
        const categoryProducts = products.filter(p => 
          p.category_id === category.id && p.is_active
        );
        espressoProducts.push(...categoryProducts);
      }
    }
    
    console.log('🔍 Final espresso products:', {
      count: espressoProducts.length,
      products: espressoProducts.map(p => ({ 
        name: p.name, 
        id: p.id, 
        category_id: p.category_id,
        price: p.price 
      }))
    });
    
    if (espressoProducts.length === 0) {
      console.error('❌ No espresso products found after all attempts!');
      console.log('🔧 Available categories:', categories.map(c => c.name));
      console.log('🔧 Sample products:', products.slice(0, 10).map(p => ({ name: p.name, category_id: p.category_id })));
    }
    
    return espressoProducts;
  };

  const createComboCartItem = (
    croffle: Product,
    espresso: Product,
    comboPrice: number,
    comboName: string
  ) => {
    return {
      product: {
        ...croffle,
        id: `combo-${croffle.id}-${espresso.id}`,
        name: comboName,
        price: comboPrice,
        description: `${croffle.name} with ${espresso.name}`,
        product_type: 'combo' as const
      },
      quantity: 1,
      variation: null,
      customization: {
        croffle: {
          id: croffle.id,
          name: croffle.name,
          price: croffle.price
        },
        espresso: {
          id: espresso.id,
          name: espresso.name,
          price: espresso.price
        },
        comboPrice,
        savings: (croffle.price + espresso.price) - comboPrice
      }
    };
  };

  return {
    getComboPrice,
    getEspressoProducts,
    createComboCartItem,
    comboPricing
  };
}