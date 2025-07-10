import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Users, Settings2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchIngredientGroups,
  createIngredientGroup,
  validateIngredientGroup
} from '@/services/advancedRecipeService';
import type { RecipeIngredientGroup } from '@/types/advancedRecipe';

interface RecipeTemplateIngredientGroupsProps {
  templateId?: string;
  onGroupsChange?: (groups: RecipeIngredientGroup[]) => void;
}

export const RecipeTemplateIngredientGroups: React.FC<RecipeTemplateIngredientGroupsProps> = ({
  templateId,
  onGroupsChange
}) => {
  const [groups, setGroups] = useState<RecipeIngredientGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    selection_type: 'required_one' as const,
    min_selections: 1,
    max_selections: undefined as number | undefined,
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    if (templateId) {
      loadGroups();
    }
  }, [templateId]);

  const loadGroups = async () => {
    if (!templateId) return;
    
    setLoading(true);
    try {
      const fetchedGroups = await fetchIngredientGroups(templateId);
      setGroups(fetchedGroups);
      onGroupsChange?.(fetchedGroups);
    } catch (error) {
      console.error('Error loading ingredient groups:', error);
      toast.error('Failed to load ingredient groups');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!templateId) {
      toast.error('Template ID is required');
      return;
    }

    const errors = validateIngredientGroup({
      ...newGroup,
      id: '',
      recipe_template_id: templateId,
      created_at: '',
      updated_at: ''
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);
    try {
      const result = await createIngredientGroup(templateId, newGroup);
      if (result) {
        toast.success('Ingredient group created successfully');
        setNewGroup({
          name: '',
          description: '',
          selection_type: 'required_one',
          min_selections: 1,
          max_selections: undefined,
          display_order: groups.length,
          is_active: true
        });
        setShowAddForm(false);
        loadGroups();
      }
    } catch (error) {
      console.error('Error creating ingredient group:', error);
      toast.error('Failed to create ingredient group');
    } finally {
      setLoading(false);
    }
  };

  const getSelectionTypeLabel = (type: string) => {
    switch (type) {
      case 'required_one': return 'Required (Choose One)';
      case 'optional_one': return 'Optional (Choose One)';
      case 'multiple': return 'Multiple Selection';
      case 'required_all': return 'Required (All)';
      default: return type;
    }
  };

  const getSelectionTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'required_one': return 'destructive';
      case 'optional_one': return 'secondary';
      case 'multiple': return 'default';
      case 'required_all': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ingredient Groups
            </CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Group Form */}
          {showAddForm && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="group-name">Group Name</Label>
                    <Input
                      id="group-name"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Choose your Croffle"
                    />
                  </div>
                  <div>
                    <Label htmlFor="selection-type">Selection Type</Label>
                    <Select 
                      value={newGroup.selection_type} 
                      onValueChange={(value: any) => setNewGroup(prev => ({ ...prev, selection_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required_one">Required (Choose One)</SelectItem>
                        <SelectItem value="optional_one">Optional (Choose One)</SelectItem>
                        <SelectItem value="multiple">Multiple Selection</SelectItem>
                        <SelectItem value="required_all">Required (All)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="min-selections">Minimum Selections</Label>
                    <Input
                      id="min-selections"
                      type="number"
                      min="0"
                      value={newGroup.min_selections}
                      onChange={(e) => setNewGroup(prev => ({ 
                        ...prev, 
                        min_selections: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-selections">Maximum Selections (Optional)</Label>
                    <Input
                      id="max-selections"
                      type="number"
                      min="1"
                      value={newGroup.max_selections || ''}
                      onChange={(e) => setNewGroup(prev => ({ 
                        ...prev, 
                        max_selections: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="group-description">Description (Optional)</Label>
                    <Textarea
                      id="group-description"
                      value={newGroup.description}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this group for customers"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddGroup} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Group'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Groups */}
          <div className="space-y-4">
            {groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No ingredient groups yet</p>
                <p className="text-sm">
                  Create groups to organize ingredients into customer-selectable categories
                </p>
              </div>
            ) : (
              groups.map((group, index) => (
                <Card key={group.id} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          <h3 className="font-semibold">{group.name}</h3>
                          <Badge variant={getSelectionTypeBadgeVariant(group.selection_type)}>
                            {getSelectionTypeLabel(group.selection_type)}
                          </Badge>
                        </div>
                        
                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-2">{group.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Min: {group.min_selections}</span>
                          {group.max_selections && <span>Max: {group.max_selections}</span>}
                          <span>Order: {group.display_order}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Selection Types</span>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li><strong>Required (Choose One):</strong> Customer must select exactly one option</li>
                  <li><strong>Optional (Choose One):</strong> Customer can select one option or none</li>
                  <li><strong>Multiple Selection:</strong> Customer can select multiple options</li>
                  <li><strong>Required (All):</strong> Customer must select all options</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Best Practices</span>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Group similar ingredients together</li>
                  <li>• Use clear, customer-friendly names</li>
                  <li>• Set appropriate min/max selections</li>
                  <li>• Order groups logically for the customer flow</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
