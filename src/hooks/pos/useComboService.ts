import { useMemo } from "react";
import { Product, Category } from "@/types/product";
import { UnifiedProduct } from "@/services/product/unifiedProductService";

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

  const getEspressoProducts = (products: UnifiedProduct[], categories: Category[]): UnifiedProduct[] => {
    console.log('🔍 getEspressoProducts debug:', {
      productsCount: products.length,
      categoriesCount: categories.length,
      allCategories: categories.map(c => ({ name: c.name, id: c.id })),
      currentUser: { /* Add auth info if needed */ }
    });
    
    const espressoCategory = categories.find(c => c.name === "Espresso");
    if (!espressoCategory) {
      console.error('❌ No Espresso category found! Available categories:', categories.map(c => c.name));
      console.log('🔧 Debugging tip: Check RLS policies for categories table');
      return [];
    }
    
    console.log('✅ Espresso category found:', { 
      id: espressoCategory.id, 
      name: espressoCategory.name,
      store_id: espressoCategory.store_id 
    });
    
    const allActiveProducts = products.filter(p => p.is_active);
    const espressoProducts = products.filter(p => 
      p.category_id === espressoCategory.id && p.is_active
    );
    
    console.log('🔍 Product filtering results:', {
      totalProducts: products.length,
      activeProducts: allActiveProducts.length,
      espressoProducts: espressoProducts.length,
      espressoProductNames: espressoProducts.map(p => ({ name: p.name, id: p.id, store_id: p.store_id }))
    });
    
    if (espressoProducts.length === 0) {
      console.error('❌ No espresso products found! Debugging info:', {
        espressoCategoryId: espressoCategory.id,
        productsInEspressoCategory: products.filter(p => p.category_id === espressoCategory.id),
        allProductCategories: [...new Set(products.map(p => p.category_id))]
      });
      console.log('🔧 Debugging tip: Check RLS policies for products table and user store access');
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