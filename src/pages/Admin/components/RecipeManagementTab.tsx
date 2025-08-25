
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
import { ConsolidatedRecipeDeploymentDialog } from '@/components/Admin/components/ConsolidatedRecipeDeploymentDialog';
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

      {/* Templates List */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {filteredTemplates.map((template, index) => (
              <div 
                key={template.id} 
                className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                  index !== filteredTemplates.length - 1 ? 'border-b' : ''
                }`}
              >
                {/* Template Info */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      v{template.version || 1}
                    </Badge>
                    {template.category_name && (
                      <Badge variant="outline" className="text-xs">
                        {template.category_name}
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {template.ingredients?.length || 0} ingredients
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Yield: {template.yield_quantity || 0}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeploy(template)}
                  >
                    <Rocket className="h-4 w-4 mr-1" />
                    Deploy
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
      <ConsolidatedRecipeDeploymentDialog
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
