
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Camera, Upload, X, Receipt, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { expenseService } from '@/services/expense/expenseService';
import { useStore } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CreateExpenseRequest } from '@/types/expense';

interface MobileExpenseEntryProps {
  onSuccess?: () => void;
}

export default function MobileExpenseEntry({ onSuccess }: MobileExpenseEntryProps) {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);

  const form = useForm<CreateExpenseRequest>({
    defaultValues: {
      store_id: currentStore?.id || '',
      category_id: '',
      amount: 0,
      description: '',
      expense_date: new Date().toISOString().split('T')[0],
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseService.getCategories()
  });

  const createExpenseMutation = useMutation({
    mutationFn: (expenseData: CreateExpenseRequest) => expenseService.createExpense(expenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense created successfully');
      form.reset();
      setReceiptFile(null);
      setReceiptPreview(null);
      setIsOpen(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to create expense');
    }
  });

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Create a simple camera interface
      setUseCamera(true);
      
      // Note: In a real implementation, you'd create a full camera component
      // For now, we'll simulate the camera functionality
      toast.info('Camera functionality would be implemented here');
      
    } catch (error) {
      console.error('Camera access denied:', error);
      toast.error('Camera access denied. Please use file upload instead.');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setReceiptFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setReceiptPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const onSubmit = (data: CreateExpenseRequest) => {
    if (!currentStore) {
      toast.error('No store selected');
      return;
    }

    const expenseData: CreateExpenseRequest = {
      ...data,
      store_id: currentStore.id,
      receipt_url: receiptFile ? `receipts/${Date.now()}_${receiptFile.name}` : undefined
    };

    createExpenseMutation.mutate(expenseData);
  };

  if (!isMobile) {
    return null; // Only show on mobile
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50">
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Quick Expense Entry
          </SheetTitle>
          <SheetDescription>
            Add a new expense for {currentStore?.name}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount - Large input for mobile */}
            <div>
              <Label className="text-lg font-medium">Amount (₱)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="text-2xl h-12 text-center"
                {...form.register('amount', { 
                  required: true,
                  valueAsNumber: true 
                })}
              />
            </div>

            {/* Category */}
            <div>
              <Label>Category</Label>
              <Select 
                onValueChange={(value) => form.setValue('category_id', value)}
                value={form.watch('category_id')}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="What was this expense for?"
                className="min-h-[80px]"
                {...form.register('description', { required: true })}
              />
            </div>

            {/* Date */}
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                className="h-12"
                {...form.register('expense_date', { required: true })}
              />
            </div>

            {/* Receipt Upload */}
            <div className="space-y-3">
              <Label>Receipt</Label>
              
              {!receiptFile ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-20 flex-col"
                    onClick={handleCameraCapture}
                  >
                    <Camera className="h-6 w-6 mb-2" />
                    Camera
                  </Button>
                  
                  <Label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload className="h-6 w-6 mb-2" />
                    Upload
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </Label>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{receiptFile.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {receiptPreview && (
                    <div className="mt-2">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t">
              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={createExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
