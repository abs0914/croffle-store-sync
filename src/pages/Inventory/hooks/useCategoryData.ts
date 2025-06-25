
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from "@/services/categoryService";
import { createDefaultCategories } from "@/services/product/createDefaultCategories";
import { Category } from "@/types";
import { toast } from "sonner";
import { CategoryFormData } from "../components/categories/CategoryForm";

export const useCategoryData = () => {
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ["categories", currentStore?.id],
    queryFn: () => currentStore?.id ? fetchCategories(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id,
  });
  
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAdd = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async (formData: CategoryFormData) => {
    if (!currentStore) {
      toast.error("No store selected");
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    
    try {
      if (editingCategory) {
        // Update existing category
        await updateCategory(editingCategory.id, {
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active
        });
      } else {
        // Create new category
        await createCategory({
          name: formData.name,
          description: formData.description || null,
          store_id: currentStore.id,
          is_active: formData.is_active
        });
      }
      
      refetch();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      refetch();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };
  
  const handleCreateDefaultCategories = async () => {
    if (!currentStore?.id) {
      toast.error("No store selected");
      return;
    }
    
    await createDefaultCategories(currentStore.id);
    refetch();
  };
  
  return {
    categories: filteredCategories,
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
  };
};
