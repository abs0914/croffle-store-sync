
import React from "react";
import { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { shouldDisplayCategoryInPOS } from "@/utils/categoryOrdering";

interface ProductCategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  onCategorySelect?: (categoryId: string) => void;
}

export default function ProductCategoryTabs({ 
  categories, 
  activeCategory, 
  setActiveCategory,
  onCategorySelect
}: ProductCategoryTabsProps) {
  // Filter out categories that shouldn't appear in main menu, but include Combo
  // Note: Categories are already sorted by the categoryFetch service
  const filteredCategories = categories.filter(category =>
    shouldDisplayCategoryInPOS(category.name) || category.name === "Combo"
  );

  const handleCategoryClick = (categoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      setActiveCategory(categoryId);
    }
  };
  
  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4 pb-2 px-1">
      <Button
        onClick={() => setActiveCategory("all")}
        variant={activeCategory === "all" ? "default" : "outline"}
        size="lg"
        className="min-h-12 min-w-[100px] px-6 whitespace-nowrap font-medium text-sm md:text-base shrink-0 touch-manipulation"
      >
        All Items
      </Button>
      {filteredCategories.map(category => (
        <Button
          key={category.id}
          onClick={() => handleCategoryClick(category.id)}
          variant={activeCategory === category.id ? "default" : "outline"}
          size="lg"
          className="min-h-12 min-w-[100px] px-6 whitespace-nowrap font-medium text-sm md:text-base shrink-0 touch-manipulation"
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}
