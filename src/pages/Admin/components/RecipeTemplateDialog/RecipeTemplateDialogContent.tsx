
import React from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RecipeTemplateForm } from './RecipeTemplateForm';

interface RecipeTemplateDialogContentProps {
  template?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecipeTemplateDialogContent: React.FC<RecipeTemplateDialogContentProps> = ({
  template,
  onClose,
  onSuccess
}) => {
  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {template ? 'Edit Recipe Template' : 'Create Recipe Template'}
        </DialogTitle>
        <DialogDescription>
          {template ? 'Update the recipe template details and ingredients.' : 'Create a new recipe template with ingredients and instructions.'}
        </DialogDescription>
      </DialogHeader>

      <RecipeTemplateForm
        template={template}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </DialogContent>
  );
};
