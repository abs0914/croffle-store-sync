import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { POSIntegrationService } from '@/services/posIntegration';
import type { POSCartItem, PricingCalculationResult } from '@/services/posIntegration';

interface DynamicPricingDisplayProps {
  cartItem: Partial<POSCartItem>;
  showBreakdown?: boolean;
  onPriceUpdate?: (result: PricingCalculationResult) => void;
  className?: string;
}

export const DynamicPricingDisplay: React.FC<DynamicPricingDisplayProps> = ({
  cartItem,
  showBreakdown = true,
  onPriceUpdate,
  className = ''
}) => {
  const [pricing, setPricing] = useState<PricingCalculationResult>({
    base_price: 0,
    addon_total: 0,
    combo_discount: 0,
    final_price: 0,
    breakdown: { base: 0, addons: [], combo_savings: 0 }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cartItem.item) {
      calculatePrice();
    }
  }, [cartItem]);

  const calculatePrice = async () => {
    setLoading(true);
    try {
      const result = await POSIntegrationService.calculateItemPrice(cartItem);
      setPricing(result);
      onPriceUpdate?.(result);
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => `₱${price.toFixed(2)}`;

  const quantity = cartItem.quantity || 1;
  const totalPrice = pricing.final_price * quantity;

  return (
    <Card className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
      <CardContent className="p-4">
        {/* Main Price Display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-700">Dynamic Pricing</span>
            {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-700">
              {formatPrice(totalPrice)}
            </div>
            {quantity > 1 && (
              <div className="text-sm text-gray-600">
                {formatPrice(pricing.final_price)} × {quantity}
              </div>
            )}
          </div>
        </div>

        {showBreakdown && (
          <>
            <Separator className="my-3" />
            
            {/* Price Breakdown */}
            <div className="space-y-2">
              {/* Base Price */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Price</span>
                <span className="font-medium">
                  {formatPrice(pricing.base_price * quantity)}
                </span>
              </div>

              {/* Add-ons */}
              {pricing.breakdown.addons.length > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      Add-ons
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    </span>
                    <span className="font-medium text-green-600">
                      +{formatPrice(pricing.addon_total * quantity)}
                    </span>
                  </div>
                  <div className="ml-4 space-y-1">
                    {pricing.breakdown.addons.map((addon, index) => (
                      <div key={index} className="flex justify-between text-xs text-gray-500">
                        <span>• {addon.name}</span>
                        <span>{formatPrice(addon.price * quantity)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Combo Savings */}
              {pricing.combo_discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    Combo Savings
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  </span>
                  <span className="font-medium text-red-600">
                    -{formatPrice(pricing.combo_discount * quantity)}
                  </span>
                </div>
              )}

              {/* Total Line */}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-blue-700">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            {/* Price Insights */}
            <div className="mt-4 pt-3 border-t border-blue-200">
              <div className="flex flex-wrap gap-2">
                {pricing.combo_discount > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <Zap className="h-3 w-3 mr-1" />
                    Combo Deal
                  </Badge>
                )}
                {pricing.breakdown.addons.some(addon => addon.name.toLowerCase().includes('premium')) && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Premium Selection
                  </Badge>
                )}
                {pricing.addon_total === 0 && (
                  <Badge variant="outline" className="text-gray-600">
                    No Add-ons
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        {/* Recalculate Button */}
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={calculatePrice}
            disabled={loading}
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            {loading ? 'Calculating...' : 'Recalculate Price'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};