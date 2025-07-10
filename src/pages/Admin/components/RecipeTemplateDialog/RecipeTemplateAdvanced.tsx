import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, DollarSign, Settings } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchIngredientGroups,
  fetchPricingMatrix,
  fetchAddonCategories,
  fetchComboPricingRules,
  upsertPricingMatrix,
  createComboPricingRule
} from '@/services/advancedRecipeService';
import type {
  RecipeIngredientGroup,
  RecipePricingMatrix,
  AddonCategory,
  ComboPricingRule,
  RecipePricingMatrixForm
} from '@/types/advancedRecipe';

interface RecipeTemplateAdvancedProps {
  templateId?: string;
  onDataChange?: (data: any) => void;
}

export const RecipeTemplateAdvanced: React.FC<RecipeTemplateAdvancedProps> = ({
  templateId,
  onDataChange
}) => {
  const [activeTab, setActiveTab] = useState('pricing');
  const [loading, setLoading] = useState(false);

  // State for different sections
  const [ingredientGroups, setIngredientGroups] = useState<RecipeIngredientGroup[]>([]);
  const [pricingMatrix, setPricingMatrix] = useState<RecipePricingMatrix[]>([]);
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([]);
  const [comboRules, setComboRules] = useState<ComboPricingRule[]>([]);

  // Form states
  const [newPricing, setNewPricing] = useState<RecipePricingMatrixForm>({
    size_category: '',
    temperature_category: '',
    base_price: 0,
    price_modifier: 0
  });

  const [newComboRule, setNewComboRule] = useState({
    name: '',
    base_category: '',
    combo_category: '',
    combo_price: 0,
    discount_amount: 0,
    priority: 0
  });

  useEffect(() => {
    if (templateId) {
      loadAdvancedData();
    }
  }, [templateId]);

  const loadAdvancedData = async () => {
    if (!templateId) return;
    
    setLoading(true);
    try {
      const [groups, matrix, categories, rules] = await Promise.all([
        fetchIngredientGroups(templateId),
        fetchPricingMatrix(templateId),
        fetchAddonCategories(),
        fetchComboPricingRules()
      ]);

      setIngredientGroups(groups);
      setPricingMatrix(matrix);
      setAddonCategories(categories);
      setComboRules(rules);
    } catch (error) {
      console.error('Error loading advanced data:', error);
      toast.error('Failed to load advanced features data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPricing = async () => {
    if (!templateId || !newPricing.size_category || !newPricing.temperature_category) {
      toast.error('Please fill in all pricing fields');
      return;
    }

    const success = await upsertPricingMatrix(templateId, {
      ...newPricing,
      is_active: true
    });

    if (success) {
      toast.success('Pricing rule added successfully');
      setNewPricing({
        size_category: '',
        temperature_category: '',
        base_price: 0,
        price_modifier: 0
      });
      loadAdvancedData();
    }
  };

  const handleAddComboRule = async () => {
    if (!newComboRule.name || !newComboRule.base_category || !newComboRule.combo_category) {
      toast.error('Please fill in all combo rule fields');
      return;
    }

    const success = await createComboPricingRule({
      ...newComboRule,
      is_active: true
    });

    if (success) {
      toast.success('Combo rule added successfully');
      setNewComboRule({
        name: '',
        base_category: '',
        combo_category: '',
        combo_price: 0,
        discount_amount: 0,
        priority: 0
      });
      loadAdvancedData();
    }
  };

  const sizeOptions = [
    { value: 'mini', label: 'Mini Croffle' },
    { value: 'regular', label: 'Regular Croffle' },
    { value: 'glaze', label: 'Glaze Croffle' },
    { value: 'overload', label: 'Overload' }
  ];

  const temperatureOptions = [
    { value: 'hot', label: 'Hot' },
    { value: 'ice', label: 'Ice' },
    { value: 'room_temp', label: 'Room Temperature' }
  ];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing">Pricing Matrix</TabsTrigger>
          <TabsTrigger value="combos">Combo Rules</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="groups">Ingredient Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Pricing */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                  <Label>Size Category</Label>
                  <Select value={newPricing.size_category} onValueChange={(value) => 
                    setNewPricing(prev => ({ ...prev, size_category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Temperature</Label>
                  <Select value={newPricing.temperature_category} onValueChange={(value) => 
                    setNewPricing(prev => ({ ...prev, temperature_category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select temp" />
                    </SelectTrigger>
                    <SelectContent>
                      {temperatureOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Base Price (₱)</Label>
                  <Input
                    type="number"
                    value={newPricing.base_price}
                    onChange={(e) => setNewPricing(prev => ({ 
                      ...prev, 
                      base_price: Number(e.target.value) 
                    }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddPricing} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Existing Pricing Matrix */}
              <div className="space-y-2">
                {pricingMatrix.map((pricing, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">
                        {sizeOptions.find(s => s.value === pricing.size_category)?.label}
                      </Badge>
                      <Badge variant="outline">
                        {temperatureOptions.find(t => t.value === pricing.temperature_category)?.label}
                      </Badge>
                      <span className="font-semibold">₱{pricing.base_price}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Combo Pricing Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Combo Rule */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <Label>Rule Name</Label>
                  <Input
                    value={newComboRule.name}
                    onChange={(e) => setNewComboRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Mini Croffle + Hot Espresso"
                  />
                </div>
                <div>
                  <Label>Base Category</Label>
                  <Select value={newComboRule.base_category} onValueChange={(value) => 
                    setNewComboRule(prev => ({ ...prev, base_category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mini_croffle">Mini Croffle</SelectItem>
                      <SelectItem value="regular_croffle">Regular Croffle</SelectItem>
                      <SelectItem value="glaze_croffle">Glaze Croffle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Combo Category</Label>
                  <Select value={newComboRule.combo_category} onValueChange={(value) => 
                    setNewComboRule(prev => ({ ...prev, combo_category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select combo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot_espresso">Hot Espresso</SelectItem>
                      <SelectItem value="ice_espresso">Ice Espresso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Combo Price (₱)</Label>
                  <Input
                    type="number"
                    value={newComboRule.combo_price}
                    onChange={(e) => setNewComboRule(prev => ({ 
                      ...prev, 
                      combo_price: Number(e.target.value) 
                    }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Discount Amount (₱)</Label>
                  <Input
                    type="number"
                    value={newComboRule.discount_amount}
                    onChange={(e) => setNewComboRule(prev => ({ 
                      ...prev, 
                      discount_amount: Number(e.target.value) 
                    }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddComboRule} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </div>

              {/* Existing Combo Rules */}
              <div className="space-y-2">
                {comboRules.map((rule, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant="outline">₱{rule.combo_price}</Badge>
                      {rule.discount_amount > 0 && (
                        <Badge variant="secondary">-₱{rule.discount_amount}</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addons">
          <Card>
            <CardHeader>
              <CardTitle>Add-on Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {addonCategories.map(category => (
                  <div key={category.id} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">{category.name}</h3>
                    <Badge variant="outline">{category.category_type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Ingredient Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Ingredient groups allow you to create organized selections for customers.</p>
                <p className="text-sm">Coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
