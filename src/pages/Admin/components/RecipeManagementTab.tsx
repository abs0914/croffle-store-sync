
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  TrendingUp,
  DollarSign,
  Users,
  Rocket
} from 'lucide-react';
import { 
  fetchRecipeTemplates,
  cloneRecipeTemplate,
  deleteRecipeTemplate,
  RecipeTemplateWithMetrics
} from '@/services/recipeManagement/recipeTemplateService';
import { RecipeTemplateDialog } from './RecipeTemplateDialog';
import { DeployRecipeDialog } from './DeployRecipeDialog';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

export const RecipeManagementTab: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchRecipeTemplates();
      console.log('Loaded templates:', data);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load recipe templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (template: any) => {
    console.log('Duplicate template called with:', template);
    
    if (!template || !template.id) {
      console.error('Invalid template provided to duplicate:', template);
      toast.error('Invalid template selected for duplication');
      return;
    }

    const newName = prompt(`Enter name for duplicated template:`, `${template.name} (Copy)`);
    if (!newName || newName.trim() === '') {
      console.log('Duplicate cancelled - no name provided');
      return;
    }

    console.log('Duplicating template with ID:', template.id, 'New name:', newName);
    
    try {
      const cloned = await cloneRecipeTemplate(template.id, newName);
      if (cloned) {
        console.log('Duplicate successful, refreshing templates...');
        await loadTemplates();
      }
    } catch (error) {
      console.error('Duplicate failed:', error);
      // Error handling is already done in cloneRecipeTemplate
    }
  };

  const handleEdit = (template: any) => {
    console.log('Edit template:', template);
    setSelectedTemplate(template);
    setShowEditDialog(true);
  };

  const handleDeploy = (template: any) => {
    console.log('Deploy template:', template);
    setSelectedTemplate(template);
    setShowDeployDialog(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!templateId) {
      toast.error('Invalid template ID');
      return;
    }

    if (window.confirm('Are you sure you want to delete this template?')) {
      const success = await deleteRecipeTemplate(templateId);
      if (success) {
        toast.success('Template deleted successfully');
        await loadTemplates();
      } else {
        toast.error('Failed to delete template');
      }
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Recipe Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage recipe templates for deployment to stores
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="secondary">
                  v{template.version || 1}
                </Badge>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {template.yield_quantity || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Yield</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {template.ingredients?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Ingredients</div>
                </div>
              </div>

              {/* Category */}
              {template.category_name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Category</span>
                  <Badge variant="outline">
                    {template.category_name}
                  </Badge>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeploy(template)}
                >
                  <Rocket className="h-4 w-4 mr-1" />
                  Deploy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDuplicate(template)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No templates match your search.' : 'Get started by creating your first recipe template.'}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      )}

      {/* Create Template Dialog */}
      <RecipeTemplateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false);
          loadTemplates();
        }}
      />

      {/* Edit Template Dialog */}
      <RecipeTemplateDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSuccess={() => {
          setShowEditDialog(false);
          setSelectedTemplate(null);
          loadTemplates();
        }}
      />

      {/* Deploy Template Dialog */}
      <DeployRecipeDialog
        isOpen={showDeployDialog}
        onClose={() => {
          setShowDeployDialog(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSuccess={() => {
          setShowDeployDialog(false);
          setSelectedTemplate(null);
          loadTemplates();
        }}
      />
    </div>
  );
};
