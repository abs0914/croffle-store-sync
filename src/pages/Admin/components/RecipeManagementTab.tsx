
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  Filter, 
  ChefHat, 
  Rocket,
  Copy,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RecipeTemplate, getRecipeTemplates, duplicateRecipeTemplate, deleteRecipeTemplate } from '@/services/recipeManagement/recipeTemplateService';
import { RecipeTemplateDialog } from './RecipeTemplateDialog';
import { RecipeDeploymentDialog } from './RecipeDeploymentDialog';
import { RecipeTemplateCard } from './RecipeTemplateCard';

export const RecipeManagementTab: React.FC = () => {
  const [templates, setTemplates] = useState<RecipeTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RecipeTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showDeploymentDialog, setShowDeploymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplate | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, categoryFilter]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getRecipeTemplates();
      setTemplates(data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(t => t.category_name).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load recipe templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        (template.description && template.description.toLowerCase().includes(query)) ||
        template.ingredients.some(ing => 
          ing.commissary_item_name.toLowerCase().includes(query)
        )
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category_name === categoryFilter);
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setShowTemplateDialog(true);
  };

  const handleEditTemplate = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateDialog(true);
  };

  const handleDuplicateTemplate = async (template: RecipeTemplate) => {
    const duplicated = await duplicateRecipeTemplate(template.id);
    if (duplicated) {
      await fetchTemplates();
    }
  };

  const handleDeleteTemplate = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (selectedTemplate) {
      const success = await deleteRecipeTemplate(selectedTemplate.id);
      if (success) {
        await fetchTemplates();
      }
    }
    setShowDeleteDialog(false);
    setSelectedTemplate(null);
  };

  const handleDeployTemplate = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setShowDeploymentDialog(true);
  };

  const handleTemplateSuccess = () => {
    fetchTemplates();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            Recipe Management
          </h2>
          <p className="text-muted-foreground">
            Create and manage recipe templates for deployment across stores
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Recipe Template
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes by name, description, or ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading recipe templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Recipe Templates Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all' 
                ? 'No templates match your current search criteria.'
                : 'Get started by creating your first recipe template.'
              }
            </p>
            {(!searchQuery && categoryFilter === 'all') && (
              <Button onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Recipe Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <RecipeTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
              onDuplicate={handleDuplicateTemplate}
              onDelete={handleDeleteTemplate}
              onDeploy={handleDeployTemplate}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <RecipeTemplateDialog
        isOpen={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        template={selectedTemplate}
        onSuccess={handleTemplateSuccess}
      />

      <RecipeDeploymentDialog
        isOpen={showDeploymentDialog}
        onClose={() => setShowDeploymentDialog(false)}
        template={selectedTemplate}
        onSuccess={handleTemplateSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
              This will also remove the recipe from all stores where it has been deployed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
