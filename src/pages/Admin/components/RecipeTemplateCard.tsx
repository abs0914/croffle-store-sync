
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Copy, 
  Trash2, 
  Rocket,
  Users,
  Clock,
  ChefHat,
  ImageIcon
} from 'lucide-react';
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

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      {/* Recipe Image */}
      <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
        {template.image_url ? (
          <img 
            src={template.image_url} 
            alt={template.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-200 ${template.image_url ? 'hidden' : ''}`}>
          <div className="text-center text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-2" />
            <span className="text-sm">No Image</span>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={template.is_active ? "default" : "secondary"}>
            {template.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
        {template.description && (
          <CardDescription className="line-clamp-2">
            {template.description}
          </CardDescription>
        )}
        {template.category_name && (
          <Badge variant="outline" className="w-fit">
            {template.category_name}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Recipe Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Yield: {template.yield_quantity}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Serving: {template.serving_size || 1}</span>
          </div>
          <div className="flex items-center gap-1">
            <ChefHat className="h-4 w-4 text-muted-foreground" />
            <span>{template.ingredients.length} items</span>
          </div>
        </div>

        {/* Cost Information */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Cost:</span>
            <span className="font-medium">₱{totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">Cost per Serving:</span>
            <span className="font-medium">₱{(totalCost / (template.serving_size || 1)).toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto space-y-2">
          <Button 
            onClick={() => onDeploy(template)} 
            className="w-full"
            variant="default"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Deploy to Stores
          </Button>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => onEdit(template)} 
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            
            <Button 
              onClick={() => onDuplicate(template)} 
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            
            <Button 
              onClick={() => onDelete(template)} 
              variant="outline" 
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
