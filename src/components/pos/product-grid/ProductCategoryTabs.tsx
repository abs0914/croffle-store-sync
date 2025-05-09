
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
    <TabsList className="mb-4 bg-croffle-background overflow-x-auto flex w-full">
      <TabsTrigger 
        value="all" 
        className="data-[state=active]:bg-croffle-primary data-[state=active]:text-white"
      >
        All
      </TabsTrigger>
      {filteredCategories.map(category => (
        <TabsTrigger 
          key={category.id} 
          value={category.id}
          className="data-[state=active]:bg-croffle-primary data-[state=active]:text-white whitespace-nowrap"
        >
          {category.name}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
