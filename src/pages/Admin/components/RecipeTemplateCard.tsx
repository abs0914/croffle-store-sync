import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Edit, 
  Copy, 
  Trash2, 
  Rocket, 
  ChefHat,
  Clock,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecipeTemplate } from '@/services/recipeManagement/types';

interface RecipeTemplateCardProps {
  template: RecipeTemplate;
  onEdit: (template: RecipeTemplate) => void;
  onDuplicate: (template: RecipeTemplate) => void;
  onDelete: (template: RecipeTemplate) => void;
  onDeploy: (template: RecipeTemplate) => void;
}

export const RecipeTemplateCard: React.FC<RecipeTemplateCardProps> = ({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onDeploy
}) => {
  const totalCost = template.ingredients.reduce((sum, ingredient) => 
    sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
  );

  const costPerServing = template.serving_size ? totalCost / template.serving_size : totalCost;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        {/* Recipe Image */}
        {template.image_url ? (
          <div className="w-full h-32 mb-3 rounded-md overflow-hidden">
            <img 
              src={template.image_url} 
              alt={template.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Failed to load image:', template.image_url);
                // Hide the image and show placeholder on error
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-full h-32 bg-gray-100 flex items-center justify-center hidden">
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        ) : (
          <div className="w-full h-32 mb-3 rounded-md bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {template.name}
            </CardTitle>
            {template.category_name && (
              <Badge variant="outline" className="mt-2">
                {template.category_name}
              </Badge>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeploy(template)}>
                <Rocket className="h-4 w-4 mr-2" />
                Deploy to Stores
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(template)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Yield: {template.yield_quantity}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Serving: {template.serving_size || 1}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Cost:</span>
            <span className="font-medium">₱{totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost per Serving:</span>
            <span className="font-medium">₱{costPerServing.toFixed(2)}</span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            {template.ingredients.length} ingredient{template.ingredients.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1">
            {template.ingredients.slice(0, 3).map((ingredient, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="truncate">{ingredient.commissary_item_name}</span>
                <span className="text-muted-foreground">
                  {ingredient.quantity} {ingredient.unit}
                </span>
              </div>
            ))}
            {template.ingredients.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{template.ingredients.length - 3} more...
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <Badge variant="secondary" className="text-xs">
            v{template.version}
          </Badge>
          <Button
            size="sm"
            onClick={() => onDeploy(template)}
            className="flex items-center gap-1"
          >
            <Rocket className="h-3 w-3" />
            Deploy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
