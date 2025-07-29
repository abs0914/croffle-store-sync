import { useMemo } from "react";
import { Product, Category } from "@/types/product";
import { UnifiedProduct } from "@/services/product/unifiedProductService";

export function useComboService() {
  // Combo pricing rules based on the provided table
  const comboPricing = useMemo(() => ({
    "Classic": {
      "Hot Espresso": 110,
      "Iced Espresso": 115
    },
    "Glaze": {
      "Hot Espresso": 125,
      "Iced Espresso": 130
    },
    "Fruity": {
      "Hot Espresso": 110,
      "Iced Espresso": 115
    },
    "Premium": {
      "Hot Espresso": 110,
      "Iced Espresso": 115
    },
    "Mini Croffle": {
      "Hot Espresso": 170,
      "Iced Espresso": 175
    }
  }), []);

  const getComboPrice = (croffleCategory: string, espressoType: string): number => {
    return comboPricing[croffleCategory as keyof typeof comboPricing]?.[espressoType as "Hot Espresso" | "Iced Espresso"] || 0;
  };

  const getEspressoProducts = (products: UnifiedProduct[], categories: Category[]): UnifiedProduct[] => {
    console.log('getEspressoProducts debug:', {
      productsCount: products.length,
      categoriesCount: categories.length,
      allCategories: categories.map(c => c.name),
      espressoCategory: categories.find(c => c.name === "Espresso")
    });
    
    const espressoCategory = categories.find(c => c.name === "Espresso");
    if (!espressoCategory) {
      console.log('No Espresso category found');
      return [];
    }
    
    const espressoProducts = products.filter(p => 
      p.category_id === espressoCategory.id && p.is_active
    );
    
    console.log('Espresso products found:', espressoProducts.length, espressoProducts.map(p => p.name));
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