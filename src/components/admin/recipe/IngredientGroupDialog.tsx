import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, ChefHat, Droplets, Utensils } from 'lucide-react';

interface IngredientGroup {
  id: string;
  name: string;
  selectionType: 'required_one' | 'optional_one' | 'multiple';
  isOptional: boolean;
  displayOrder: number;
}

interface IngredientGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (group: Omit<IngredientGroup, 'id'>) => void;
  existingGroups: IngredientGroup[];
}

const GROUP_TEMPLATES = [
  { name: 'Base Ingredients', icon: ChefHat, selectionType: 'multiple' as const, isOptional: false },
  { name: 'Toppings', icon: Utensils, selectionType: 'multiple' as const, isOptional: true },
  { name: 'Sauces', icon: Droplets, selectionType: 'optional_one' as const, isOptional: true },
  { name: 'Protein', icon: ChefHat, selectionType: 'required_one' as const, isOptional: false },
  { name: 'Sides', icon: Utensils, selectionType: 'multiple' as const, isOptional: true },
];

const SELECTION_TYPE_LABELS = {
  required_one: 'Choose 1 (Required)',
  optional_one: 'Choose 1 (Optional)',
  multiple: 'Choose Multiple'
};

export function IngredientGroupDialog({
  isOpen,
  onClose,
  onCreateGroup,
  existingGroups
}: IngredientGroupDialogProps) {
  const [groupName, setGroupName] = useState('');
  const [selectionType, setSelectionType] = useState<'required_one' | 'optional_one' | 'multiple'>('multiple');
  const [isOptional, setIsOptional] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleTemplateSelect = (template: typeof GROUP_TEMPLATES[0]) => {
    setGroupName(template.name);
    setSelectionType(template.selectionType);
    setIsOptional(template.isOptional);
    setSelectedTemplate(template.name);
  };

  const handleCreate = () => {
    if (!groupName.trim()) return;

    const nextDisplayOrder = Math.max(0, ...existingGroups.map(g => g.displayOrder)) + 1;

    onCreateGroup({
      name: groupName.trim(),
      selectionType,
      isOptional,
      displayOrder: nextDisplayOrder
    });

    // Reset form
    setGroupName('');
    setSelectionType('multiple');
    setIsOptional(false);
    setSelectedTemplate(null);
    onClose();
  };

  const isNameTaken = existingGroups.some(g => 
    g.name.toLowerCase() === groupName.toLowerCase().trim()
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Ingredient Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Templates */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quick Templates</Label>
            <div className="grid grid-cols-2 gap-2">
              {GROUP_TEMPLATES.map((template) => (
                <Button
                  key={template.name}
                  variant={selectedTemplate === template.name ? "default" : "outline"}
                  size="sm"
                  className="h-auto p-3 flex flex-col items-center gap-2"
                  onClick={() => handleTemplateSelect(template)}
                  disabled={existingGroups.some(g => 
                    g.name.toLowerCase() === template.name.toLowerCase()
                  )}
                >
                  <template.icon className="h-4 w-4" />
                  <span className="text-xs text-center">{template.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="space-y-4">
              {/* Group Name */}
              <div>
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Toppings, Sauces, Protein"
                  className={isNameTaken ? "border-destructive" : ""}
                />
                {isNameTaken && (
                  <p className="text-sm text-destructive mt-1">
                    A group with this name already exists
                  </p>
                )}
              </div>

              {/* Selection Type */}
              <div>
                <Label htmlFor="selection-type">Selection Rules</Label>
                <Select value={selectionType} onValueChange={(value: any) => setSelectionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required_one">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                        Choose 1
                      </div>
                    </SelectItem>
                    <SelectItem value="optional_one">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                        Choose 1
                      </div>
                    </SelectItem>
                    <SelectItem value="multiple">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Multiple</Badge>
                        Choose Multiple
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectionType === 'required_one' && 'Customers must select exactly one ingredient from this group'}
                  {selectionType === 'optional_one' && 'Customers can optionally select one ingredient from this group'}
                  {selectionType === 'multiple' && 'Customers can select multiple ingredients from this group'}
                </p>
              </div>

              {/* Optional Group Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-optional"
                  checked={isOptional}
                  onCheckedChange={(checked) => setIsOptional(checked as boolean)}
                />
                <Label htmlFor="is-optional" className="text-sm">
                  This entire group is optional
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!groupName.trim() || isNameTaken}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}