
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RecipeTemplateInstructionsProps {
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
}

export const RecipeTemplateInstructions: React.FC<RecipeTemplateInstructionsProps> = ({
  instructions,
  onInstructionsChange
}) => {
  return (
    <div>
      <Label htmlFor="instructions">Instructions</Label>
      <Textarea
        id="instructions"
        value={instructions}
        onChange={(e) => onInstructionsChange(e.target.value)}
        placeholder="Preparation instructions"
        rows={5}
      />
    </div>
  );
};
