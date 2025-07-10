import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Plus, TrendingUp, Coffee, Cookie } from 'lucide-react';
import { POSIntegrationService } from '@/services/posIntegration';
import type { POSComboRule, POSAddon } from '@/services/posIntegration';

interface ComboRecommendationsProps {
  baseCategory: string;
  currentAddons: string[];
  onComboSelect?: (combo: POSComboRule) => void;
  onAddonSelect?: (addon: POSAddon) => void;
  className?: string;
}

export const ComboRecommendations: React.FC<ComboRecommendationsProps> = ({
  baseCategory,
  currentAddons,
  onComboSelect,
  onAddonSelect,
  className = ''
}) => {
  const [comboRules, setComboRules] = useState<POSComboRule[]>([]);
  const [popularAddons, setPopularAddons] = useState<POSAddon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [baseCategory]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const [combos, addons] = await Promise.all([
        POSIntegrationService.getRecommendedCombos(baseCategory),
        POSIntegrationService.getPopularAddons(baseCategory, 6)
      ]);
      setComboRules(combos);
      setPopularAddons(addons);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('espresso') || category.includes('coffee')) {
      return <Coffee className="h-4 w-4" />;
    }
    if (category.includes('topping') || category.includes('sauce')) {
      return <Cookie className="h-4 w-4" />;
    }
    return <Plus className="h-4 w-4" />;
  };

  const formatSavings = (discount: number) => {
    return discount > 0 ? `Save ₱${discount.toFixed(2)}` : '';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Combo Recommendations */}
      {comboRules.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Zap className="h-5 w-5" />
              Combo Deals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {comboRules.map((combo) => (
              <div
                key={`${combo.base_category}-${combo.combo_category}`}
                className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-orange-200 hover:bg-white/90 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getCategoryIcon(combo.combo_category)}
                    <span className="font-medium text-gray-800">
                      {combo.base_category.replace('_', ' ')} + {combo.combo_category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      ₱{combo.combo_price}
                    </Badge>
                    {combo.discount_amount > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {formatSavings(combo.discount_amount)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onComboSelect?.(combo)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Add Combo
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Popular Add-ons */}
      {popularAddons.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Plus className="h-5 w-5" />
              Popular Add-ons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {popularAddons.map((addon) => {
                const isSelected = currentAddons.includes(addon.id);
                return (
                  <Button
                    key={addon.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => onAddonSelect?.(addon)}
                    className={`
                      h-auto p-3 flex flex-col items-start gap-1
                      ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 border-blue-200'}
                      ${addon.is_premium ? 'border-purple-300' : ''}
                    `}
                    disabled={isSelected}
                  >
                    <div className="flex items-center gap-1 w-full">
                      {getCategoryIcon(addon.category)}
                      <span className="text-xs font-medium truncate">
                        {addon.name}
                      </span>
                      {addon.is_premium && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          Premium
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs opacity-75">
                      +₱{addon.price}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Recommendations */}
      {comboRules.length === 0 && popularAddons.length === 0 && (
        <Card className={className}>
          <CardContent className="p-6 text-center text-gray-500">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recommendations available for this item</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};