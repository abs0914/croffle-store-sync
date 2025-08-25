
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Rocket,
  Filter,
  FileBarChart,
  Download
} from 'lucide-react';
import { 
  fetchRecipeTemplates,
  cloneRecipeTemplate,
  deleteRecipeTemplate,
  RecipeTemplateWithMetrics
} from '@/services/recipeManagement/recipeTemplateService';
import { fetchCategories } from '@/services/category/categoryFetch';
import { Category } from '@/types';
import { RecipeTemplateDialog } from './RecipeTemplateDialog';
import { ConsolidatedRecipeDeploymentDialog } from '@/components/Admin/components/ConsolidatedRecipeDeploymentDialog';
import { RecipeAuditDialog } from '@/components/Admin/RecipeAuditDialog';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

export const RecipeManagementTab: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadCategories();
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

  const loadCategories = async () => {
    try {
      // Get all unique categories from templates since this is admin view
      const data = await fetchRecipeTemplates();
      const uniqueCategories = new Set<string>();
      
      data?.forEach(template => {
        if (template.category_name) {
          uniqueCategories.add(template.category_name);
        }
      });

      // Convert to Category objects for consistency
      const categoryList: Category[] = Array.from(uniqueCategories).map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        is_active: true,
        isActive: true,
        store_id: '',
        storeId: ''
      }));

      setCategories(categoryList);
    } catch (error) {
      console.error('Error loading categories:', error);
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

  const filteredTemplates = templates.filter(template => {
    // Search filter
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Category filter
    const matchesCategory = selectedCategory === 'all' || 
      template.category_name === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAuditDialog(true)}>
            <FileBarChart className="h-4 w-4 mr-2" />
            Audit & Sync
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border shadow-md z-50">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
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
                    <p className="text-sm text-muted-foreground mb-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-xs">
                      {template.ingredients?.length || 0} ingredients
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Yield: {template.yield_quantity || 1}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeploy(template)}
                    className="h-8 w-8 p-0"
                    title="Deploy"
                  >
                    <Rocket className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                    className="h-8 w-8 p-0"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Delete"
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

      {/* Recipe Audit Dialog */}
      <RecipeAuditDialog
        isOpen={showAuditDialog}
        onClose={() => setShowAuditDialog(false)}
      />
    </div>
  );
};
