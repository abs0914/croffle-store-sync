
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  ChefHat,
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { RecipeTemplateDialog } from './RecipeTemplateDialog';
import { DeleteRecipeTemplateDialog } from './DeleteRecipeTemplateDialog';
import { RecipeTemplateCard } from './RecipeTemplateCard';
import { DeployRecipeDialog } from './DeployRecipeDialog';
import { getRecipeTemplates } from '@/services/recipeManagement/recipeDataService';
import { 
  deleteRecipeTemplate, 
  duplicateRecipeTemplate 
} from '@/services/recipeManagement/recipeCrudService';
import { RecipeTemplate } from '@/services/recipeManagement/types';

export const RecipeManagementTab: React.FC = () => {
  const [templates, setTemplates] = useState<RecipeTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RecipeTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplate | null>(null);

  // Load recipe templates
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getRecipeTemplates();
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (error) {
      console.error('Error loading recipe templates:', error);
      toast.error('Failed to load recipe templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter templates based on search and category
  useEffect(() => {
    let filtered = templates;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        (template.description && template.description.toLowerCase().includes(query)) ||
        (template.category_name && template.category_name.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category_name === categoryFilter);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchQuery, categoryFilter]);

  // Get unique categories for filter
  const categories = Array.from(new Set(templates.map(t => t.category_name).filter(Boolean)));

  const handleEdit = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setShowEditDialog(true);
  };

  const handleDuplicate = async (template: RecipeTemplate) => {
    const success = await duplicateRecipeTemplate(template.id);
    if (success) {
      await loadTemplates();
    }
  };

  const handleDelete = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const handleDeploy = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setShowDeployDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;
    
    const success = await deleteRecipeTemplate(selectedTemplate.id);
    if (success) {
      await loadTemplates();
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    }
  };

  const handleDialogSuccess = async () => {
    await loadTemplates();
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setSelectedTemplate(null);
  };

  const handleDeploySuccess = async () => {
    setShowDeployDialog(false);
    setSelectedTemplate(null);
    toast.success('Recipe template deployed successfully!');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Recipe Management</h2>
          <p className="text-muted-foreground">
            Create and manage recipe templates for deployment to stores
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Recipe Management</h2>
          <p className="text-muted-foreground">
            Create and manage recipe templates for deployment to stores
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadTemplates} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipe Template
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipe templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
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
              
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ChefHat className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                <span className="text-xs">✓</span>
              </Badge>
              <div>
                <p className="text-sm font-medium">Active Templates</p>
                <p className="text-2xl font-bold">
                  {templates.filter(t => t.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center">
                <span className="text-xs">#</span>
              </Badge>
              <div>
                <p className="text-sm font-medium">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                <span className="text-xs">F</span>
              </Badge>
              <div>
                <p className="text-sm font-medium">Filtered</p>
                <p className="text-2xl font-bold">{filteredTemplates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Grid/List */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {templates.length === 0 ? 'No Recipe Templates' : 'No Templates Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {templates.length === 0 
                ? 'Create your first recipe template to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {templates.length === 0 && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Recipe Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "space-y-4"
        }>
          {filteredTemplates.map(template => (
            <RecipeTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onDeploy={handleDeploy}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <RecipeTemplateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleDialogSuccess}
      />

      <RecipeTemplateDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        template={selectedTemplate}
        onSuccess={handleDialogSuccess}
      />

      <DeleteRecipeTemplateDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        template={selectedTemplate}
        onConfirm={confirmDelete}
      />

      <DeployRecipeDialog
        isOpen={showDeployDialog}
        onClose={() => setShowDeployDialog(false)}
        template={selectedTemplate}
        onSuccess={handleDeploySuccess}
      />
    </div>
  );
};
