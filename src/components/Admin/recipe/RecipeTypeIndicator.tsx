import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Package, Layers, Component, Zap } from 'lucide-react';

interface RecipeTypeIndicatorProps {
  recipeType: 'single' | 'combo' | 'component';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const RECIPE_TYPE_CONFIG = {
  single: {
    icon: Package,
    label: 'Single',
    variant: 'default' as const,
    description: 'Standard single-item recipe'
  },
  combo: {
    icon: Layers,
    label: 'Combo',
    variant: 'secondary' as const,
    description: 'Multi-component combo recipe'
  },
  component: {
    icon: Component,
    label: 'Component',
    variant: 'outline' as const,
    description: 'Reusable recipe component'
  }
};

export function RecipeTypeIndicator({ 
  recipeType, 
  size = 'default', 
  showIcon = true,
  className 
}: RecipeTypeIndicatorProps) {
  const config = RECIPE_TYPE_CONFIG[recipeType];
  const IconComponent = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`${className} ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}
      title={config.description}
    >
      {showIcon && <IconComponent className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />}
      {config.label}
    </Badge>
  );
}

export function RecipeComplexityIndicator({ 
  ingredientCount, 
  hasComponents,
  className 
}: { 
  ingredientCount: number;
  hasComponents?: boolean;
  className?: string;
}) {
  let complexity: 'simple' | 'moderate' | 'complex';
  let icon = Package;
  let label = 'Simple';
  let variant: 'default' | 'secondary' | 'destructive' = 'default';

  if (hasComponents || ingredientCount > 10) {
    complexity = 'complex';
    icon = Zap;
    label = 'Complex';
    variant = 'destructive';
  } else if (ingredientCount > 5) {
    complexity = 'moderate';
    icon = Layers;
    label = 'Moderate';
    variant = 'secondary';
  }

  return (
    <Badge variant={variant} className={className}>
      {React.createElement(icon, { className: "h-3 w-3 mr-1" })}
      {label} ({ingredientCount} ingredients)
    </Badge>
  );
}