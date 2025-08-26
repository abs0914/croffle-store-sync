import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { processYourRecipeTable } from '@/services/recipeUpload/directTableProcessor';
import { toast } from 'sonner';

export function QuickProcessButton() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuickProcess = async () => {
    setIsProcessing(true);
    try {
      const success = await processYourRecipeTable();
      if (success) {
        toast.success('Successfully processed your recipe table!');
      }
    } catch (error) {
      console.error('Quick process error:', error);
      toast.error('Failed to process recipe table');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleQuickProcess}
      disabled={isProcessing}
      variant="default"
      className="w-full"
    >
      <Zap className="h-4 w-4 mr-2" />
      {isProcessing ? 'Processing Your Table...' : 'Quick Process Your Table Data'}
    </Button>
  );
}