import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RecipeInstructionsFormProps {
  instructions: string;
  onChange: (instructions: string) => void;
}

export function RecipeInstructionsForm({ instructions, onChange }: RecipeInstructionsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instructions</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Label htmlFor="instructions">Cooking Instructions</Label>
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter step-by-step cooking instructions..."
            rows={8}
            className="mt-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}