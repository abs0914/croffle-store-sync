import { useState, useEffect } from 'react';
import { Category } from '@/types';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  createDefaultCategories 
} from "@/services/inventoryManagement/categoryService";
import { CategoryFormData } from '../components/categories/CategoryForm';

export const useCategoryData = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { currentStore } = useStore();

  const fetchCategories = async () => {
    if (!currentStore) return;
    setIsLoading(true);
    try {
      const data = await fetchCategories(currentStore.id);
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [currentStore]);

  useEffect(() => {
    if (!searchTerm) {
      fetchCategories();
      return;
    }

    const filtered = categories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setCategories(filtered);
  }, [searchTerm]);

  const handleAdd = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!category.id) return;
    
    try {
      const success = await deleteCategory(category.id);
      if (success) {
        await fetchCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleSubmit = async (formData: CategoryFormData) => {
    if (!currentStore) return;

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await createCategory({ ...formData, store_id: currentStore.id });
      }
      
      setIsDialogOpen(false);
      setEditingCategory(null);
      await fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleCreateDefaultCategories = async () => {
    if (!currentStore) return;

    try {
      setIsLoading(true);
      await createDefaultCategories(currentStore.id);
      toast.success('Default categories created successfully!');
      await fetchCategories();
    } catch (error) {
      console.error('Error creating default categories:', error);
      toast.error('Failed to create default categories');
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
};
