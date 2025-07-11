import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getUserRoleDefinition } from '@/types/rolePermissions';
import { Shield, Crown, Package, Factory, Users, CreditCard } from 'lucide-react';

interface UserRoleIndicatorProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const ROLE_ICONS = {
  admin: Shield,
  owner: Crown,
  stock_user: Package,
  production_user: Factory,
  manager: Users,
  cashier: CreditCard,
};

export function UserRoleIndicator({ 
  role, 
  size = 'md', 
  showTooltip = true, 
  className 
}: UserRoleIndicatorProps) {
  const roleDefinition = getUserRoleDefinition(role);
  
  if (!roleDefinition) {
    return (
      <Badge variant="outline" className={className}>
        Unknown Role
      </Badge>
    );
  }

  const IconComponent = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || Shield;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5',
  };

  const badgeContent = (
    <Badge 
      className={`${roleDefinition.color} ${sizeClasses[size]} ${className} flex items-center gap-1`}
      variant="outline"
    >
      <IconComponent className={iconSizes[size]} />
      {roleDefinition.name}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{roleDefinition.name}</div>
            <div className="text-sm text-muted-foreground">
              {roleDefinition.description}
            </div>
            <div className="text-xs">
              <div className="font-medium mb-1">Permissions:</div>
              <div className="space-y-1">
                {Object.entries(roleDefinition.permissions)
                  .filter(([_, hasAccess]) => hasAccess)
                  .map(([permission]) => (
                    <div key={permission} className="text-green-600">
                      • {permission.replace('_', ' ').toUpperCase()}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}