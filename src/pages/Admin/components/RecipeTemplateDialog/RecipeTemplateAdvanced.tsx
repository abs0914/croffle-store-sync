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
import { RecipeTemplateIngredientGroups } from './RecipeTemplateIngredientGroups';
import { RecipeTemplatePricingMatrix } from './RecipeTemplatePricingMatrix';
import { AddOnManagement } from '@/components/admin/recipe/AddOnManagement';

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
          <RecipeTemplatePricingMatrix
            templateId={templateId}
            onPricingChange={setPricingMatrix}
          />
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
          <AddOnManagement />
        </TabsContent>

        <TabsContent value="groups">
          <RecipeTemplateIngredientGroups
            templateId={templateId}
            onGroupsChange={setIngredientGroups}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
