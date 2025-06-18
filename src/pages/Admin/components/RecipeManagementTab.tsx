
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { RecipeTemplateDialog } from './RecipeTemplateDialog';
import { DeployRecipeDialog } from './DeployRecipeDialog';
import { RecipeTemplateCard } from './RecipeTemplateCard';
import { RecipeTemplate } from '@/services/recipeManagement/types';
import { 
  getRecipeTemplates, 
  duplicateRecipeTemplate, 
  deleteRecipeTemplate 
} from '@/services/recipeManagement/recipeTemplateService';

export const RecipeManagementTab: React.FC = () => {
  const [templates, setTemplates] = useState<RecipeTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RecipeTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, categoryFilter, statusFilter]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getRecipeTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch recipe templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => 
        template.category_name?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(template => template.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(template => !template.is_active);
      }
    }

    setFilteredTemplates(filtered);
  };

  const handleEdit = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDuplicate = async (template: RecipeTemplate) => {
    const success = await duplicateRecipeTemplate(template.id);
    if (success) {
      fetchTemplates();
    }
  };

  const handleDelete = async (template: RecipeTemplate) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      const success = await deleteRecipeTemplate(template.id);
      if (success) {
        fetchTemplates();
      }
    }
  };

  const handleDeploy = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setIsDeployDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchTemplates();
  };

  const categories = [...new Set(templates.map(t => t.category_name).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Recipe Templates</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-64 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recipe Templates</h2>
          <p className="text-muted-foreground">
            Create and manage recipe templates for deployment to stores
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category!}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">No recipe templates found</h3>
          <p className="text-muted-foreground mt-2">
            {templates.length === 0 
              ? "Create your first recipe template to get started" 
              : "Try adjusting your search or filter criteria"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleDialogSuccess}
      />

      <RecipeTemplateDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSuccess={handleDialogSuccess}
      />

      <DeployRecipeDialog
        isOpen={isDeployDialogOpen}
        onClose={() => {
          setIsDeployDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
};
