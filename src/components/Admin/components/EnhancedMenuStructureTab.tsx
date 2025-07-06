
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  Package, 
  Rocket,
  BarChart3,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MenuStructureTabProps {
  onCreateRecipeTemplate: (category: string, subcategory?: string) => void;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string;
  hasTemplate: boolean;
  hasDeployment: boolean;
  deploymentCount: number;
}

export const EnhancedMenuStructureTab: React.FC<MenuStructureTabProps> = ({ 
  onCreateRecipeTemplate 
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [deployedRecipes, setDeployedRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needs-template' | 'ready-to-deploy' | 'deployed'>('all');

  // Predefined menu structure
  const menuStructure = {
    croffles: {
      regular: [
        { name: 'Tiramisu', price: 125 },
        { name: 'Choco Nut', price: 125 },
        { name: 'Caramel Delight', price: 125 },
        { name: 'Choco Marshmallows', price: 125 },
        { name: 'Biscoff', price: 125 },
        { name: 'Nutella', price: 125 },
        { name: 'Kitkat', price: 125 },
        { name: 'Cookies & Cream', price: 125 },
        { name: 'Choco Overload', price: 125 },
        { name: 'Matcha', price: 125 },
        { name: 'Dark Chocolate', price: 125 },
        { name: 'Strawberry', price: 125 },
        { name: 'Mango', price: 125 },
        { name: 'Blueberry', price: 125 }
      ],
      varieties: [
        { name: 'Classic Glaze', price: 79 },
        { name: 'Mini Croffle', price: 65 },
        { name: 'Croffle Overload', price: 99 }
      ]
    },
    drinks: {
      espresso: [
        { name: 'Americano Hot', price: 65 },
        { name: 'Americano Iced', price: 70 },
        { name: 'Cappuccino Hot', price: 75 },
        { name: 'Cappuccino Iced', price: 80 },
        { name: 'Cafe Latte Hot', price: 75 },
        { name: 'Cafe Latte Iced', price: 80 },
        { name: 'Cafe Mocha Hot', price: 80 },
        { name: 'Cafe Mocha Iced', price: 85 },
        { name: 'Caramel Latte Hot', price: 80 },
        { name: 'Caramel Latte Iced', price: 85 }
      ],
      specialty: [
        { name: 'Vanilla Caramel', price: 90 },
        { name: 'Matcha Latte', price: 90 },
        { name: 'Strawberry Latte', price: 99 },
        { name: 'Strawberry Kiss', price: 110 },
        { name: 'Oreo Strawberry', price: 110 }
      ],
      others: [
        { name: 'Hot Chocolate', price: 65 },
        { name: 'Iced Tea', price: 60 },
        { name: 'Lemonade', price: 60 }
      ]
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load templates
      const { data: templatesData } = await supabase
        .from('recipe_templates')
        .select('*')
        .eq('is_active', true);

      // Load deployed recipes
      const { data: recipesData } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_active', true);

      setTemplates(templatesData || []);
      setDeployedRecipes(recipesData || []);

      // Process menu items
      const processedItems: MenuItem[] = [];
      
      // Process croffles
      Object.entries(menuStructure.croffles).forEach(([subcategory, items]) => {
        items.forEach(item => {
          const hasTemplate = templatesData?.some(t => 
            t.name.toLowerCase() === item.name.toLowerCase()
          ) || false;
          
          const deploymentCount = recipesData?.filter(r => 
            r.name.toLowerCase().includes(item.name.toLowerCase())
          ).length || 0;

          processedItems.push({
            id: `croffle-${item.name}`,
            name: item.name,
            price: item.price,
            category: 'croffles',
            subcategory,
            hasTemplate,
            hasDeployment: deploymentCount > 0,
            deploymentCount
          });
        });
      });

      // Process drinks
      Object.entries(menuStructure.drinks).forEach(([subcategory, items]) => {
        items.forEach(item => {
          const hasTemplate = templatesData?.some(t => 
            t.name.toLowerCase() === item.name.toLowerCase()
          ) || false;
          
          const deploymentCount = recipesData?.filter(r => 
            r.name.toLowerCase().includes(item.name.toLowerCase())
          ).length || 0;

          processedItems.push({
            id: `drink-${item.name}`,
            name: item.name,
            price: item.price,
            category: 'drinks',
            subcategory,
            hasTemplate,
            hasDeployment: deploymentCount > 0,
            deploymentCount
          });
        });
      });

      setMenuItems(processedItems);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    switch (filter) {
      case 'needs-template':
        return !item.hasTemplate;
      case 'ready-to-deploy':
        return item.hasTemplate && !item.hasDeployment;
      case 'deployed':
        return item.hasDeployment;
      default:
        return true;
    }
  });

  const stats = {
    total: menuItems.length,
    withTemplates: menuItems.filter(i => i.hasTemplate).length,
    deployed: menuItems.filter(i => i.hasDeployment).length,
    readyToDeploy: menuItems.filter(i => i.hasTemplate && !i.hasDeployment).length
  };

  const completionPercentage = Math.round((stats.withTemplates / stats.total) * 100);

  const handleBulkCreateTemplates = async (category: string) => {
    const itemsNeedingTemplates = menuItems.filter(
      item => item.category === category && !item.hasTemplate
    );

    if (itemsNeedingTemplates.length === 0) {
      toast.info(`All ${category} items already have templates`);
      return;
    }

    // This would trigger the creation of templates for all items in the category
    toast.success(`Creating ${itemsNeedingTemplates.length} templates for ${category}...`);
    
    // Trigger template creation for each item
    for (const item of itemsNeedingTemplates) {
      onCreateRecipeTemplate(item.category, item.name);
    }
    
    // Reload data after creation
    setTimeout(() => loadData(), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withTemplates}</div>
            <Progress value={completionPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{completionPercentage}% complete</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready to Deploy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.readyToDeploy}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deployed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.deployed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Items
        </Button>
        <Button
          variant={filter === 'needs-template' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('needs-template')}
        >
          <Clock className="h-4 w-4 mr-1" />
          Needs Template ({menuItems.filter(i => !i.hasTemplate).length})
        </Button>
        <Button
          variant={filter === 'ready-to-deploy' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('ready-to-deploy')}
        >
          <Rocket className="h-4 w-4 mr-1" />
          Ready to Deploy ({stats.readyToDeploy})
        </Button>
        <Button
          variant={filter === 'deployed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('deployed')}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Deployed ({stats.deployed})
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button onClick={() => handleBulkCreateTemplates('croffles')}>
          <Package className="h-4 w-4 mr-2" />
          Create All Croffle Templates
        </Button>
        <Button onClick={() => handleBulkCreateTemplates('drinks')}>
          <Package className="h-4 w-4 mr-2" />
          Create All Drink Templates
        </Button>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize">
                    {item.category} • {item.subcategory}
                  </p>
                </div>
                <Badge variant="outline">₱{item.price}</Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Status Indicators */}
              <div className="flex gap-2">
                {item.hasTemplate ? (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Template Ready
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Needs Template
                  </Badge>
                )}
                
                {item.hasDeployment && (
                  <Badge variant="default" className="text-xs">
                    <Rocket className="h-3 w-3 mr-1" />
                    Deployed ({item.deploymentCount})
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!item.hasTemplate && (
                  <Button 
                    size="sm" 
                    onClick={() => onCreateRecipeTemplate(item.category, item.name)}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Template
                  </Button>
                )}
                
                {item.hasTemplate && !item.hasDeployment && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                  >
                    <Rocket className="h-4 w-4 mr-1" />
                    Deploy
                  </Button>
                )}
                
                {item.hasDeployment && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    View Analytics
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No items found</h3>
          <p className="text-muted-foreground">
            No menu items match the current filter.
          </p>
        </div>
      )}
    </div>
  );
};
