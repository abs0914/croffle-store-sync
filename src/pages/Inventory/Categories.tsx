
import { useCategoryData } from "./hooks/useCategoryData";
import { CategoryList } from "./components/categories/CategoryList";
import { CategoryForm } from "./components/categories/CategoryForm";
import { CategoriesHeader } from "./components/categories/CategoriesHeader";
import { CategorySearch } from "./components/categories/CategorySearch";
import { useStore } from "@/contexts/StoreContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Store } from "lucide-react";

export default function Categories() {
  const { currentStore } = useStore();
  const {
    categories,
    isLoading,
    searchTerm,
    setSearchTerm,
    isDialogOpen,
    setIsDialogOpen,
    editingCategory,
    handleAdd,
    handleEdit,
    handleSubmit,
    handleDelete,
    handleCreateDefaultCategories
  } = useCategoryData();
  
  // Return a consistent "no store selected" UI if no store is selected
  if (!currentStore) {
    return (
      <div className="space-y-6">
        <CategoriesHeader onAdd={() => {}} onCreateDefault={() => {}} />
        
        <Alert className="bg-amber-50 border-amber-200">
          <Store className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800">No store selected</AlertTitle>
          <AlertDescription className="text-amber-700">
            Please select a store from the header dropdown to view and manage categories.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <CategoriesHeader 
        onAdd={handleAdd} 
        onCreateDefault={handleCreateDefaultCategories} 
      />
      
      <CategorySearch 
        searchTerm={searchTerm} 
        onChange={setSearchTerm} 
      />
      
      <CategoryList 
        categories={categories} 
        isLoading={isLoading} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
      />
      
      <CategoryForm
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        editingCategory={editingCategory}
      />
    </div>
  );
}
