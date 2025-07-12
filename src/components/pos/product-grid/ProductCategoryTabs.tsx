
import React from "react";
import { Category } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shouldDisplayCategoryInPOS } from "@/utils/categoryOrdering";

interface ProductCategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

export default function ProductCategoryTabs({ 
  categories, 
  activeCategory, 
  setActiveCategory 
}: ProductCategoryTabsProps) {
  // Filter out categories that shouldn't appear in main menu
  // Note: Categories are already sorted by the categoryFetch service
  const filteredCategories = categories.filter(category =>
    shouldDisplayCategoryInPOS(category.name)
  );
  
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
      <button
        onClick={() => setActiveCategory("all")}
        className={`px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 touch-manipulation min-w-[80px] ${
          activeCategory === "all"
            ? "bg-blue-100 text-blue-700 shadow-sm"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        All Items
      </button>
      {filteredCategories.map(category => (
        <button
          key={category.id}
          onClick={() => setActiveCategory(category.id)}
          className={`px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 touch-manipulation min-w-[80px] ${
            activeCategory === category.id
              ? "bg-blue-100 text-blue-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
