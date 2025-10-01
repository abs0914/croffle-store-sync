import { useMemo } from "react";
import { Product, Category } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export function useComboService() {
  // Dynamic combo pricing from database combo products
  const getComboPrice = (croffleCategory: string, espressoType: string): number => {
    // TODO: Replace with database lookup once combo products are created
    // For now, keep existing pricing logic for backward compatibility
    const comboPricing = {
      "Classic": {
        "Hot Espresso": 170,
        "Cold Espresso": 175
      },
      "Plain": {
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
      },
      "Choco Overload": {
        "Hot Espresso": 170,
        "Cold Espresso": 175
      },
      "Croffle Overload": {
        "Hot Espresso": 170,
        "Cold Espresso": 175
      }
    };
    
    return comboPricing[croffleCategory as keyof typeof comboPricing]?.[espressoType as "Hot Espresso" | "Cold Espresso"] || 0;
  };

  const getComboProducts = async (storeId: string) => {
    const { data: comboProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .not('combo_main', 'is', null)
      .not('combo_add_on', 'is', null)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching combo products:', error);
      return [];
    }

    return comboProducts || [];
  };

  const getEspressoProducts = (products: Product[], categories: Category[]): Product[] => {
    // Try multiple approaches to find espresso products
    let espressoProducts: Product[] = [];
    
    // Approach 1: Find by category name "Espresso"
    const espressoCategory = categories.find(c => c.name === "Espresso");
    if (espressoCategory) {
      espressoProducts = products.filter(p => 
        p.category_id === espressoCategory.id && p.is_active
      );
    }
    
    // Approach 2: If no products found, search by product names containing espresso keywords
    if (espressoProducts.length === 0) {
      espressoProducts = products.filter(p => 
        p.is_active && p.name && (
          p.name.toLowerCase().includes('espresso') ||
          p.name.toLowerCase().includes('americano') ||
          (p.name.toLowerCase().includes('latte') && !p.name.toLowerCase().includes('caramel')) ||
          p.name.toLowerCase().includes('cappuccino') ||
          p.name.toLowerCase().includes('macchiato')
        )
      );
    }
    
    // Approach 3: Try finding category with different variations of "Espresso"
    if (espressoProducts.length === 0) {
      const possibleEspressoCategories = categories.filter(c => 
        c.is_active && c.name && (
          c.name.toLowerCase().includes('espresso') ||
          c.name.toLowerCase().includes('coffee') ||
          c.name.toLowerCase().includes('beverage') ||
          c.name.toLowerCase().includes('drink')
        )
      );
      
      for (const category of possibleEspressoCategories) {
        const categoryProducts = products.filter(p => 
          p.category_id === category.id && p.is_active
        );
        espressoProducts.push(...categoryProducts);
      }
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
        id: `combo_${croffle.id}_${espresso.id}`,
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
    getComboProducts
  };
}