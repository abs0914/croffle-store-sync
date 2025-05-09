
import { useState, useMemo } from "react";
import { Product } from "@/types";

export function useProductFilters(products: Product[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // First apply category filter
      const matchesCategory = activeCategory === "all" || 
                             (product.category_id === activeCategory);
      
      // Then apply search filter
      const matchesSearch = !searchTerm || 
                            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchTerm]);

  return { 
    searchTerm, 
    setSearchTerm, 
    activeCategory, 
    setActiveCategory, 
    filteredProducts 
  };
}
