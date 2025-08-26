
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
  console.log('🔥 RecipeTemplateDialogContent RENDERING with NEW UI');
  
  return (
    <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0">
      <DialogHeader className="px-6 py-4 border-b bg-card/50">
        <DialogTitle className="text-xl flex items-center gap-2">
          {template ? 'Edit Recipe Template' : 'Create Recipe Template'}
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-normal">
            NEW UI v2.0
          </span>
        </DialogTitle>
        <DialogDescription className="text-sm">
          {template ? 'Update the recipe template details and ingredients.' : 'Create a new recipe template with ingredients and instructions.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto p-6">
        <RecipeTemplateForm
          template={template}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </DialogContent>
  );
};
