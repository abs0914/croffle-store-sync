
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
    <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0">
      <DialogHeader className="px-6 py-4 border-b bg-card/50">
        <DialogTitle className="text-xl">
          {template ? 'Edit Recipe Template' : 'Create Recipe Template'}
        </DialogTitle>
        <DialogDescription className="text-sm">
          {template ? 'Update the recipe template details and ingredients.' : 'Create a new recipe template with ingredients and instructions.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-hidden">
        <RecipeTemplateForm
          template={template}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </DialogContent>
  );
};
