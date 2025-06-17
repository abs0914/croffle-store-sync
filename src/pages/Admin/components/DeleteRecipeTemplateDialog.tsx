
import React from 'react';
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
import { RecipeTemplate } from '@/services/recipeManagement/types';

interface DeleteRecipeTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: RecipeTemplate | null;
  onConfirm: () => void;
}

export const DeleteRecipeTemplateDialog: React.FC<DeleteRecipeTemplateDialogProps> = ({
  isOpen,
  onClose,
  template,
  onConfirm
}) => {
  if (!template) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recipe Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the recipe template "{template.name}"? 
            This action cannot be undone and will permanently remove the template 
            and all its ingredients.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
