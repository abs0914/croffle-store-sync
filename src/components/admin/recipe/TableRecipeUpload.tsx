import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Table } from 'lucide-react';
import { processTableRecipes } from '@/services/recipeUpload/tableRecipeProcessor';
import { toast } from 'sonner';
import { QuickProcessButton } from './QuickProcessButton';

export function TableRecipeUpload() {
  const [tableData, setTableData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTableUpload = async () => {
    if (!tableData.trim()) {
      toast.error('Please paste your recipe table data');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await processTableRecipes(tableData);
      if (success) {
        setTableData('');
      }
    } catch (error) {
      console.error('Table upload error:', error);
      toast.error('Failed to process recipe table');
    } finally {
      setIsProcessing(false);
    }
  };

  const sampleTableData = `| Product             | category | Ingredient Name     | Unit of Measure | Quantity | Cost per Unit | price |
|---------------------|----------|---------------------|-----------------|----------|---------------|-------|
| Tiramisu            | Classic  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Tiramisu            | Classic  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Table className="h-5 w-5" />
          <CardTitle>Upload Recipes from Table</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="table-data">Recipe Table Data</Label>
          <Textarea
            id="table-data"
            placeholder="Paste your recipe table data here..."
            value={tableData}
            onChange={(e) => setTableData(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Expected format:</p>
          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
            {sampleTableData}
          </pre>
          <p className="mt-2">
            Paste your complete table with headers. Each row should contain: Product, Category, Ingredient Name, Unit, Quantity, Cost per Unit, and Price.
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleTableUpload}
            disabled={isProcessing || !tableData.trim()}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing Recipes...' : 'Upload Recipe Table'}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">or</div>
          
          <QuickProcessButton />
        </div>
      </CardContent>
    </Card>
  );
}