
import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { RecipeTemplateDialogContent } from './RecipeTemplateDialogContent';

interface RecipeTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template?: any | null;
  onSuccess: () => void;
}

export const RecipeTemplateDialog: React.FC<RecipeTemplateDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSuccess
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <RecipeTemplateDialogContent
        template={template}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
};
