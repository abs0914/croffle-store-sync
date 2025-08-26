import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChefHat, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  yield_quantity: number;
  image_url?: string;
  category_name?: string;
  ingredients: any[];
  total_cost?: number;
  cost_per_serving?: number;
}

interface RecipeTemplateSelectorProps {
  selectedTemplate: RecipeTemplate | null;
  onTemplateSelect: (template: RecipeTemplate) => void;
}

export const RecipeTemplateSelector: React.FC<RecipeTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect
}) => {
  const [templates, setTemplates] = useState<RecipeTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RecipeTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipeTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, selectedCategory]);

  const loadRecipeTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          recipe_template_ingredients(
            ingredient_name,
            quantity,
            unit,
            cost_per_unit,
            location_type,
            inventory_stock_id,
            supports_fractional
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const templatesWithIngredients = (data || []).map(template => ({
        ...template,
        ingredients: template.recipe_template_ingredients || [],
        total_cost: template.recipe_template_ingredients?.reduce(
          (sum: number, ing: any) => sum + (ing.cost_per_unit * ing.quantity), 0
        ) || 0,
        cost_per_serving: template.recipe_template_ingredients?.reduce(
          (sum: number, ing: any) => sum + (ing.cost_per_unit * ing.quantity), 0
        ) / Math.max(template.yield_quantity, 1) || 0
      }));

      setTemplates(templatesWithIngredients);

      // Extract unique categories
      const uniqueCategories = [...new Set(
        templatesWithIngredients
          .map(t => t.category_name)
          .filter(Boolean)
      )];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading recipe templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category_name === selectedCategory);
    }

    setFilteredTemplates(filtered);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          Select Recipe Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipe templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Template Display */}
        {selectedTemplate && (
          <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selectedTemplate.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="secondary">
                    Yield: {selectedTemplate.yield_quantity} servings
                  </Badge>
                  <Badge variant="outline">
                    Cost per serving: ₱{selectedTemplate.cost_per_serving?.toFixed(2) || '0.00'}
                  </Badge>
                  <Badge variant="outline">
                    {selectedTemplate.ingredients.length} ingredients
                  </Badge>
                </div>
              </div>
              <Button variant="outline" onClick={() => onTemplateSelect(null)}>
                Change Recipe
              </Button>
            </div>
          </div>
        )}

        {/* Template Grid */}
        {!selectedTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recipe templates found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredTemplates.map(template => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onTemplateSelect(template)}
                >
                  <CardContent className="p-4">
                    {template.image_url && (
                      <img
                        src={template.image_url}
                        alt={template.name}
                        className="w-full h-32 object-cover rounded-md mb-3"
                      />
                    )}
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Yield:</span>
                        <span>{template.yield_quantity} servings</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Cost/serving:</span>
                        <span>₱{template.cost_per_serving?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Ingredients:</span>
                        <span>{template.ingredients.length}</span>
                      </div>
                    </div>
                    {template.category_name && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {template.category_name}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};