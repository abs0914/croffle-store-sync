
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';
import { toast } from 'sonner';

export interface CategoryFormData {
  name: string;
  description: string;
  image_url: string;
  is_active: boolean;
}

export const fetchCategories = async (storeId: string): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data || [];
};

export const createCategory = async (categoryData: CategoryFormData & { store_id: string }): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert([categoryData])
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    toast.error('Failed to create category');
    throw error;
  }

  toast.success('Category created successfully');
  return data;
};

export const updateCategory = async (categoryId: string, categoryData: CategoryFormData): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update(categoryData)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    toast.error('Failed to update category');
    throw error;
  }

  toast.success('Category updated successfully');
  return data;
};

export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('Error deleting category:', error);
    toast.error('Failed to delete category');
    return false;
  }

  toast.success('Category deleted successfully');
  return true;
};

export const createDefaultCategories = async (storeId: string): Promise<void> => {
  const defaultCategories = [
    { name: 'Croffles', description: 'Croissant waffles in various flavors', store_id: storeId, is_active: true, image_url: '' },
    { name: 'Beverages', description: 'Hot and cold drinks', store_id: storeId, is_active: true, image_url: '' },
    { name: 'Desserts', description: 'Sweet treats and desserts', store_id: storeId, is_active: true, image_url: '' },
    { name: 'Snacks', description: 'Light snacks and appetizers', store_id: storeId, is_active: true, image_url: '' },
  ];

  const { error } = await supabase
    .from('categories')
    .insert(defaultCategories);

  if (error) {
    console.error('Error creating default categories:', error);
    throw error;
  }
};
