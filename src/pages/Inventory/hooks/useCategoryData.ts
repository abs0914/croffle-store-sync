
import { useState, useEffect } from 'react';
import { Category } from '@/types';
import { useStore } from '@/contexts/StoreContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  createDefaultCategories,
  CategoryFormData
} from '@/services/inventoryManagement/categoryService';
import { toast } from 'sonner';

export const useCategoryData = () => {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories', currentStore?.id],
    queryFn: () => currentStore?.id ? fetchCategories(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => createCategory({ ...data, store_id: currentStore!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentStore?.id] });
      setIsFormOpen(false);
      toast.success('Category created successfully');
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormData }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentStore?.id] });
      setIsFormOpen(false);
      setEditingCategory(null);
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentStore?.id] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  });

  const createDefaultMutation = useMutation({
    mutationFn: () => createDefaultCategories(currentStore!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentStore?.id] });
      toast.success('Default categories created successfully');
    },
    onError: (error) => {
      console.error('Error creating default categories:', error);
      toast.error('Failed to create default categories');
    }
  });

  const handleAdd = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const handleSubmit = async (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCreateDefaultCategories = () => {
    if (window.confirm('This will create default categories for your store. Continue?')) {
      createDefaultMutation.mutate();
    }
  };

  return {
    categories,
    isLoading,
    error,
    editingCategory,
    isFormOpen,
    setIsFormOpen,
    searchTerm,
    setSearchTerm,
    isDialogOpen: isFormOpen,
    setIsDialogOpen: setIsFormOpen,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSubmit,
    handleCreateDefaultCategories,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
