
import React from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface RecipeEditDialogFooterProps {
  isSubmitting: boolean;
  onClose: () => void;
}

export function RecipeEditDialogFooter({ isSubmitting, onClose }: RecipeEditDialogFooterProps) {
  return (
    <div className="flex justify-end space-x-4 pt-4 border-t">
      <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
        Update Recipe
      </Button>
    </div>
  );
}
