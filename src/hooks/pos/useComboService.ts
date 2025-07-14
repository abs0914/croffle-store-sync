import { useMemo } from "react";
import { Product, Category } from "@/types/product";

export function useComboService() {
  // Combo pricing rules based on the provided table
  const comboPricing = useMemo(() => ({
    "Classic": {
      "Hot Espresso": 130,
      "Iced Espresso": 135
    },
    "Glaze": {
      "Hot Espresso": 129,
      "Iced Espresso": 134
    },
    "Fruity": {
      "Hot Espresso": 140,
      "Iced Espresso": 145
    },
    "Premium": {
      "Hot Espresso": 165,
      "Iced Espresso": 170
    },
    "Mini Croffle": {
      "Hot Espresso": 110,
      "Iced Espresso": 115
    }
  }), []);

  const getComboPrice = (croffleCategory: string, espressoType: string): number => {
    return comboPricing[croffleCategory as keyof typeof comboPricing]?.[espressoType as "Hot Espresso" | "Iced Espresso"] || 0;
  };

  const getEspressoProducts = (products: Product[], categories: Category[]): Product[] => {
    const espressoCategory = categories.find(c => c.name === "Espresso");
    if (!espressoCategory) return [];
    
    return products.filter(p => 
      p.category_id === espressoCategory.id && p.is_active
    );
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