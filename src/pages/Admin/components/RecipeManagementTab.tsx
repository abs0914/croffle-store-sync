
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Plus, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RecipeTemplateCard } from './RecipeTemplateCard';
import { RecipeTemplateDialog } from './RecipeTemplateDialog';
import { DeleteRecipeTemplateDialog } from './DeleteRecipeTemplateDialog';
import { RecipeDeploymentDialog } from './RecipeDeploymentDialog';
import { getRecipeTemplates } from '@/services/recipeManagement/recipeTemplateService';
import { deleteRecipeTemplate, duplicateRecipeTemplate } from '@/services/recipeManagement/recipeCrudService';
import { RecipeTemplate } from '@/services/recipeManagement/types';
import { toast } from 'sonner';

export const RecipeManagementTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [templates, setTemplates] = useState<RecipeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<RecipeTemplate | null>(null);
  const [templateToDeploy, setTemplateToDeploy] = useState<RecipeTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getRecipeTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching recipe templates:', error);
      toast.error('Failed to fetch recipe templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleDuplicate = async (template: RecipeTemplate) => {
    const success = await duplicateRecipeTemplate(template.id);
    if (success) {
      await fetchTemplates();
    }
  };

  const handleDelete = (template: RecipeTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    const success = await deleteRecipeTemplate(templateToDelete.id);
    if (success) {
      await fetchTemplates();
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDeploy = (template: RecipeTemplate) => {
    setTemplateToDeploy(template);
    setIsDeployDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchTemplates();
    setIsDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleDeploySuccess = () => {
    setIsDeployDialogOpen(false);
    setTemplateToDeploy(null);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && template.is_active) ||
                         (filterStatus === 'inactive' && !template.is_active);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recipe Templates</h2>
          <p className="text-muted-foreground">
            Create and manage recipe templates that can be deployed to stores
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipe templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recipe Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
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

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && (
        <Card className="p-12 text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Recipe Templates</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterStatus !== 'all' 
              ? 'No templates match your current filters'
              : 'Create your first recipe template to get started'
            }
          </p>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Card>
      )}

      {/* Dialogs */}
      <RecipeTemplateDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        template={selectedTemplate}
        onSuccess={handleDialogSuccess}
      />

      <DeleteRecipeTemplateDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }}
        template={templateToDelete}
        onConfirm={handleConfirmDelete}
      />

      <RecipeDeploymentDialog
        isOpen={isDeployDialogOpen}
        onClose={() => {
          setIsDeployDialogOpen(false);
          setTemplateToDeploy(null);
        }}
        template={templateToDeploy}
        onSuccess={handleDeploySuccess}
      />
    </div>
  );
};
