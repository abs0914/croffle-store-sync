
import React from "react";
import { Category } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  // Filter out any "Desserts" category from the tabs
  const filteredCategories = categories.filter(
    category => category.name.toLowerCase() !== "desserts"
  );
  
  return (
    <TabsList className="mb-6 bg-white border border-gray-200 overflow-x-auto flex w-full h-auto p-1 rounded-lg shadow-sm">
      <TabsTrigger
        value="all"
        className="data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm"
      >
        All Items
      </TabsTrigger>
      {filteredCategories.map(category => (
        <TabsTrigger
          key={category.id}
          value={category.id}
          className="data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm whitespace-nowrap"
        >
          {category.name}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
