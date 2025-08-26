import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: { id: string; name: string } | null;
}

export const DeleteRecipeDialog: React.FC<DeleteRecipeDialogProps> = ({
  isOpen,
  onClose,
  recipe
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!recipe) return;
    
    setIsDeleting(true);
    try {
      // Delete recipe ingredients first
      await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipe.id);

      // Unlink products
      await supabase
        .from('products')
        .update({ recipe_id: null })
        .eq('recipe_id', recipe.id);

      // Delete the recipe
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      if (error) throw error;

      toast.success(`Recipe "${recipe.name}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error('Failed to delete recipe');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the recipe "{recipe?.name}"? 
            This will unlink all associated products and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Recipe'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};