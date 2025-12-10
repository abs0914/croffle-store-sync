
import React from "react";
import { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { shouldDisplayCategoryInPOS, sortCategoriesForPOS } from "@/utils/categoryOrdering";

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
  // Filter out inactive categories and categories that shouldn't appear in main menu
  const filteredCategories = categories.filter(category =>
    category.is_active &&
    (shouldDisplayCategoryInPOS(category.name) || category.name === "Combo")
  );

  // Remove duplicates by category name (keep first occurrence)
  const uniqueCategories = filteredCategories.filter((category, index, array) =>
    array.findIndex(c => c.name === category.name) === index
  );

  // Define the main POS categories based on your recipe categories
  // Note: Add-on is hidden from main POS display (used for Mix & Match add-ons only)
  const mainCategoryNames = [
    'Classic', 'Cold', 'Blended', 'Beverages', 
    'Espresso', 'Fruity', 'Plain', 'Mix & Match', 'Premium', 'Combo', 'Glaze'
  ];

  // Filter to only show main categories that exist in the database OR always show Combo
  const mainCategories = uniqueCategories.filter(category =>
    mainCategoryNames.includes(category.name)
  );
  
  // Always ensure Combo appears if it doesn't exist in database categories
  const hasComboCategory = mainCategories.some(cat => cat.name === "Combo");
  if (!hasComboCategory) {
    // Create a virtual Combo category for display
    mainCategories.push({
      id: "combo-virtual",
      name: "Combo",
      is_active: true,
      store_id: categories[0]?.store_id || ""
    } as Category);
  }

  // Sort categories using custom POS ordering
  const sortedCategories = sortCategoriesForPOS(mainCategories);

  const handleCategoryClick = (categoryId: string) => {
    // Special handling for Combo category
    if (categoryId === "combo-virtual" || 
        (categories.find(c => c.id === categoryId)?.name === "Combo")) {
      // Open combo selection dialog instead of filtering products
      if (onCategorySelect) {
        onCategorySelect("combo"); // Pass special combo identifier
      }
      return;
    }

    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      setActiveCategory(categoryId);
    }
  };
  
  // Calculate grid columns based on number of categories (All Items + sorted categories)
  const totalButtons = sortedCategories.length + 1;
  const gridCols = totalButtons <= 4 ? 'grid-cols-4' :
                   totalButtons <= 5 ? 'grid-cols-5' :
                   totalButtons <= 6 ? 'grid-cols-6' :
                   totalButtons <= 8 ? 'grid-cols-4 lg:grid-cols-8' : 'grid-cols-5';

  return (
    <div className={`grid ${gridCols} gap-2 md:gap-3 pb-2 px-1`}>
      <Button
        onClick={() => setActiveCategory("all")}
        variant={activeCategory === "all" ? "default" : "outline"}
        size="lg"
        className={`min-h-12 min-w-[80px] px-3 md:px-4 whitespace-nowrap font-medium text-xs md:text-sm shrink-0 touch-manipulation ${
          activeCategory === "all"
            ? "bg-croffle-primary text-white hover:bg-croffle-dark"
            : "border-2 border-croffle-primary/30 bg-white text-croffle-primary hover:bg-croffle-light hover:border-croffle-primary/50"
        }`}
      >
        All Items
      </Button>
      {sortedCategories.map(category => (
        <Button
          key={category.id}
          onClick={() => handleCategoryClick(category.id)}
          variant={activeCategory === category.id ? "default" : "outline"}
          size="lg"
          className={`min-h-12 min-w-[80px] px-3 md:px-4 whitespace-nowrap font-medium text-xs md:text-sm shrink-0 touch-manipulation ${
            activeCategory === category.id
              ? "bg-croffle-primary text-white hover:bg-croffle-dark"
              : "border-2 border-croffle-primary/30 bg-white text-croffle-primary hover:bg-croffle-light hover:border-croffle-primary/50"
          }`}
        >
          {category.name === "Combo" ? "🍯 Combo" : category.name}
        </Button>
      ))}
    </div>
  );
}
