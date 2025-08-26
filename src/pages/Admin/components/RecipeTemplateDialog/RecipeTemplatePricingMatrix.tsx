import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Trash2, Edit, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchPricingMatrix,
  upsertPricingMatrix,
  validatePricingMatrix
} from '@/services/advancedRecipeService';
import type { RecipePricingMatrix } from '@/types/advancedRecipe';

interface RecipeTemplatePricingMatrixProps {
  templateId?: string;
  onPricingChange?: (pricing: RecipePricingMatrix[]) => void;
}

export const RecipeTemplatePricingMatrix: React.FC<RecipeTemplatePricingMatrixProps> = ({
  templateId,
  onPricingChange
}) => {
  const [pricingMatrix, setPricingMatrix] = useState<RecipePricingMatrix[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ size: string; temp: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const sizeCategories = [
    { value: 'mini', label: 'Mini Croffle', color: 'bg-blue-100 text-blue-800' },
    { value: 'regular', label: 'Regular Croffle', color: 'bg-green-100 text-green-800' },
    { value: 'glaze', label: 'Glaze Croffle', color: 'bg-purple-100 text-purple-800' },
    { value: 'overload', label: 'Overload', color: 'bg-orange-100 text-orange-800' }
  ];

  const temperatureCategories = [
    { value: 'hot', label: 'Hot', icon: '🔥' },
    { value: 'ice', label: 'Ice', icon: '🧊' },
    { value: 'room_temp', label: 'Room Temp', icon: '🌡️' }
  ];

  useEffect(() => {
    if (templateId) {
      loadPricingMatrix();
    }
  }, [templateId]);

  const loadPricingMatrix = async () => {
    if (!templateId) return;
    
    setLoading(true);
    try {
      const matrix = await fetchPricingMatrix(templateId);
      setPricingMatrix(matrix);
      onPricingChange?.(matrix);
    } catch (error) {
      console.error('Error loading pricing matrix:', error);
      toast.error('Failed to load pricing matrix');
    } finally {
      setLoading(false);
    }
  };

  const getPriceForCombo = (sizeValue: string, tempValue: string): number | null => {
    const entry = pricingMatrix.find(
      p => p.size_category === sizeValue && p.temperature_category === tempValue
    );
    return entry ? entry.base_price : null;
  };

  const handleCellClick = (sizeValue: string, tempValue: string) => {
    const currentPrice = getPriceForCombo(sizeValue, tempValue);
    setEditingCell({ size: sizeValue, temp: tempValue });
    setEditValue(currentPrice?.toString() || '');
  };

  const handleSavePrice = async () => {
    if (!editingCell || !templateId) return;

    const price = parseFloat(editValue);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const success = await upsertPricingMatrix(templateId, {
        size_category: editingCell.size,
        temperature_category: editingCell.temp,
        base_price: price,
        price_modifier: 0,
        is_active: true
      });

      if (success) {
        toast.success('Price updated successfully');
        setEditingCell(null);
        setEditValue('');
        loadPricingMatrix();
      }
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSavePrice();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const calculateStatistics = () => {
    if (pricingMatrix.length === 0) return null;

    const prices = pricingMatrix.map(p => p.base_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return { minPrice, maxPrice, avgPrice };
  };

  const stats = calculateStatistics();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Matrix
            </CardTitle>
            {stats && (
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">Min: ₱{stats.minPrice}</Badge>
                <Badge variant="outline">Avg: ₱{stats.avgPrice.toFixed(0)}</Badge>
                <Badge variant="outline">Max: ₱{stats.maxPrice}</Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Visual Pricing Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header Row */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div></div> {/* Empty corner */}
                {temperatureCategories.map(temp => (
                  <div key={temp.value} className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl mb-1">{temp.icon}</div>
                    <div className="font-medium">{temp.label}</div>
                  </div>
                ))}
              </div>

              {/* Data Rows */}
              {sizeCategories.map(size => (
                <div key={size.value} className="grid grid-cols-4 gap-2 mb-3">
                  {/* Row Header */}
                  <div className="flex items-center p-3 bg-muted rounded-lg">
                    <Badge className={size.color}>{size.label}</Badge>
                  </div>

                  {/* Price Cells */}
                  {temperatureCategories.map(temp => {
                    const price = getPriceForCombo(size.value, temp.value);
                    const isEditing = editingCell?.size === size.value && editingCell?.temp === temp.value;

                    return (
                      <div
                        key={`${size.value}-${temp.value}`}
                        className={`
                          relative p-3 border-2 rounded-lg cursor-pointer transition-all
                          ${price ? 'border-green-200 bg-green-50 hover:bg-green-100' : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'}
                          ${isEditing ? 'ring-2 ring-blue-500' : ''}
                        `}
                        onClick={() => handleCellClick(size.value, temp.value)}
                      >
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              placeholder="0.00"
                              className="h-8 text-center"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={handleSavePrice}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={() => setEditingCell(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            {price ? (
                              <div>
                                <div className="text-lg font-semibold text-green-700">₱{price}</div>
                                <div className="text-xs text-muted-foreground">Click to edit</div>
                              </div>
                            ) : (
                              <div>
                                <Plus className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                                <div className="text-xs text-muted-foreground">Add price</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Click any cell to set or edit pricing. Use keyboard shortcuts: Enter to save, Escape to cancel.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Bulk Update
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Import Prices
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Analytics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pricing Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">₱{stats.minPrice}</div>
                <div className="text-sm text-blue-700">Lowest Price</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">₱{stats.avgPrice.toFixed(0)}</div>
                <div className="text-sm text-green-700">Average Price</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">₱{stats.maxPrice}</div>
                <div className="text-sm text-purple-700">Highest Price</div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>• Price range: ₱{stats.maxPrice - stats.minPrice} difference between highest and lowest</p>
              <p>• {pricingMatrix.length} of {sizeCategories.length * temperatureCategories.length} combinations configured</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};