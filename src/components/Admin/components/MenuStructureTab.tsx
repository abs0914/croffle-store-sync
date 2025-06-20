import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface MenuStructureTabProps {
  onCreateRecipeTemplate: (category: string, subcategory?: string) => void;
}

export const MenuStructureTab: React.FC<MenuStructureTabProps> = ({ onCreateRecipeTemplate }) => {
  const [activeTab, setActiveTab] = useState('croffles');

  const croffleCategories = [
    { name: 'Classic', items: ['Tiramisu', 'Choco Nut', 'Caramel Delight', 'Choco Marshmallows'], price: 125 },
    { name: 'Premium', items: ['Biscoff', 'Nutella', 'Kitkat', 'Cookies & Cream', 'Choco Overload', 'Matcha', 'Dark Chocolate'], price: 125 },
    { name: 'Fruity', items: ['Strawberry', 'Mango', 'Blueberry'], price: 125 }
  ];

  const otherCroffles = [
    { name: 'Classic Glaze', price: 79 },
    { name: 'Mini Croffle', price: 65 },
    { name: 'Croffle Overload', price: 99 }
  ];

  const drinkCategories = [
    {
      name: 'Espresso',
      items: [
        { name: 'Americano', hot: 65, iced: 70 },
        { name: 'Cappuccino', hot: 75, iced: 80 },
        { name: 'Cafe Latte', hot: 75, iced: 80 },
        { name: 'Cafe Mocha', hot: 80, iced: 85 },
        { name: 'Caramel Latte', hot: 80, iced: 85 }
      ]
    },
    {
      name: 'Non-Espresso',
      items: [
        { name: 'Vanilla Caramel', hot: 90, iced: null },
        { name: 'Matcha', hot: 90, iced: null },
        { name: 'Strawberry Latte', hot: null, iced: 99 },
        { name: 'Strawberry Kiss', hot: null, iced: 110 },
        { name: 'Oreo Strawberry', hot: null, iced: 110 }
      ]
    },
    {
      name: 'Others',
      items: [
        { name: 'Hot Choco', hot: 65, iced: null },
        { name: 'Iced Tea', hot: null, iced: 60 },
        { name: 'Lemonade', hot: null, iced: 60 },
        { name: 'Bottled Water', hot: null, iced: 20 }
      ]
    }
  ];

  const combos = [
    { name: 'Mini Croffle + Any Hot Espresso', price: 110 },
    { name: 'Mini Croffle + Any Iced Espresso', price: 115 },
    { name: 'Glaze Croffle + Any Hot Espresso', price: 125 },
    { name: 'Glaze Croffle + Any Iced Espresso', price: 130 },
    { name: 'Regular Croffle + Any Hot Espresso', price: 170 },
    { name: 'Regular Croffle + Any Iced Espresso', price: 175 }
  ];

  const addOns = [
    {
      category: 'Classic Topping',
      items: [
        { name: 'Colored Sprinkles', price: 6 },
        { name: 'Marshmallow', price: 6 },
        { name: 'Chocolate Flakes', price: 6 },
        { name: 'Peanuts', price: 6 }
      ]
    },
    {
      category: 'Classic Sauce',
      items: [
        { name: 'Caramel', price: 6 },
        { name: 'Chocolate', price: 6 },
        { name: 'Tiramisu', price: 6 }
      ]
    },
    {
      category: 'Premium Topping',
      items: [
        { name: 'Biscoff', price: 10 },
        { name: 'Oreo', price: 10 },
        { name: 'Strawberry', price: 10 },
        { name: 'Mango', price: 10 },
        { name: 'Blueberry', price: 10 },
        { name: 'Nutella', price: 10 }
      ]
    },
    {
      category: 'Premium Sauce',
      items: [
        { name: 'Nutella', price: 8 },
        { name: 'Dark Chocolate', price: 8 }
      ]
    },
    {
      category: 'Biscuits',
      items: [
        { name: 'Biscoff Biscuit', price: 10 },
        { name: 'Oreo Biscuit', price: 10 },
        { name: 'Kitkat', price: 10 }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Menu Structure Management</h2>
          <p className="text-muted-foreground">Manage your complete menu structure and create recipe templates</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="croffles">Croffles</TabsTrigger>
          <TabsTrigger value="drinks">Drinks</TabsTrigger>
          <TabsTrigger value="combos">Combos</TabsTrigger>
          <TabsTrigger value="add-ons">Add-ons</TabsTrigger>
        </TabsList>

        <TabsContent value="croffles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Regular Croffles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Regular Croffles (₱125)
                  <Button size="sm" onClick={() => onCreateRecipeTemplate('croffles', 'regular')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Templates
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {croffleCategories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <h4 className="font-semibold text-sm">{category.name}</h4>
                    <div className="flex flex-wrap gap-1">
                      {category.items.map((item) => (
                        <Badge key={item} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Other Varieties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Other Varieties
                  <Button size="sm" onClick={() => onCreateRecipeTemplate('croffles', 'varieties')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Templates
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {otherCroffles.map((item) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <span className="text-sm">{item.name}</span>
                    <Badge variant="outline">₱{item.price}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drinks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {drinkCategories.map((category) => (
              <Card key={category.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {category.name}
                    <Button size="sm" onClick={() => onCreateRecipeTemplate('drinks', category.name.toLowerCase())}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create Templates
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.items.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="flex gap-2 text-xs">
                        {item.hot && <Badge variant="secondary">Hot: ₱{item.hot}</Badge>}
                        {item.iced && <Badge variant="outline">Iced: ₱{item.iced}</Badge>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="combos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Croffle + Coffee Combos
                <Button size="sm" onClick={() => onCreateRecipeTemplate('combos')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Combo Rules
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {combos.map((combo) => (
                <div key={combo.name} className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">{combo.name}</span>
                  <Badge variant="outline">₱{combo.price}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-ons" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addOns.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {category.category}
                    <Button size="sm" onClick={() => onCreateRecipeTemplate('add-ons', category.category.toLowerCase())}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create Templates
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.items.map((item) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <span className="text-sm">{item.name}</span>
                      <Badge variant="secondary">₱{item.price}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
