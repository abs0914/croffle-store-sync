import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  ChefHat, 
  Plus,
  Search,
  Edit,
  Trash2,
  Calculator,
  Package,
  AlertCircle,
  Filter,
  CheckCircle,
  Download,
  Upload,
  FileText,
  MoreVertical,
  Rocket,
  Copy,
  Grid3X3,
  List,
  Database,
  Zap
} from 'lucide-react';
import { 
  fetchRecipeTemplates,
  cloneRecipeTemplate,
  deleteRecipeTemplate
} from '@/services/recipeManagement/recipeTemplateService';
import { RecipeTemplateDialog } from './components/RecipeTemplateDialog';
import { OptimizedRecipeDeploymentDialog } from '@/components/Admin/recipe/OptimizedRecipeDeploymentDialog';
import { BulkDeploymentDialog } from '@/components/Admin/recipe/BulkDeploymentDialog';
import { useGlobalRecipeTemplateImportExport } from '@/hooks/useGlobalRecipeTemplateImportExport';
import { RecipeTemplate } from '@/services/recipeManagement/types';
import { toast } from 'sonner';

const GlobalRecipeManagement: React.FC = () => {
  const [templates, setTemplates] = useState<RecipeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showSqlBulkDeployment, setShowSqlBulkDeployment] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchRecipeTemplates();
      console.log('Loaded global templates:', data);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load recipe templates');
    } finally {
      setLoading(false);
    }
  };

  // Import/Export functionality
  const importExport = useGlobalRecipeTemplateImportExport(templates, loadTemplates);

  // Get unique categories from templates
  const categories = Array.from(new Set(templates.map(t => t.category_name).filter(Boolean)));

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || template.category_name === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate template cost
  const getTemplateCost = (template: RecipeTemplate): number => {
    if (!template.ingredients) return 0;
    return template.ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
  };

  const handleDuplicate = async (template: RecipeTemplate) => {
    const newName = prompt(`Enter name for duplicated template:`, `${template.name} (Copy)`);
    if (!newName || newName.trim() === '') return;

    try {
      await cloneRecipeTemplate(template.id, newName);
      await loadTemplates();
    } catch (error) {
      console.error('Duplicate failed:', error);
    }
  };

  const handleEdit = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setShowEditDialog(true);
  };

  const handleDeploy = (template: RecipeTemplate) => {
    setSelectedTemplate(template);
    setShowDeployDialog(true);
  };

  const handleDelete = async (templateId: string) => {
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

  const renderTemplateCard = (template: RecipeTemplate) => {
    const templateCost = getTemplateCost(template);
    
    return (
      <Card key={template.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">v{template.version || 1}</Badge>
              {template.category_name && (
                <Badge variant="outline">{template.category_name}</Badge>
              )}
            </div>
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {template.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
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
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                ₱{templateCost.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Cost</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => handleDeploy(template)}
              className="flex-1"
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
    );
  };

  const renderTemplateList = (template: RecipeTemplate) => {
    const templateCost = getTemplateCost(template);
    
    return (
      <div key={template.id} className="p-4 border rounded-lg space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-lg">{template.name}</h3>
              <Badge variant="secondary">v{template.version || 1}</Badge>
              {template.category_name && (
                <Badge variant="outline">{template.category_name}</Badge>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {template.ingredients?.length || 0} ingredients
              </span>
              <span className="flex items-center gap-1">
                <Calculator className="h-3 w-3" />
                ₱{templateCost.toFixed(2)} cost
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {template.yield_quantity || 0} yield
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
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
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ChefHat className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Global Recipe Management</h1>
          <p className="text-muted-foreground">
            Create and manage recipe templates for deployment to any store
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk Deployment Actions */}
          <Button 
            onClick={() => setShowSqlBulkDeployment(true)}
            className="gap-2"
            variant="default"
          >
            <Database className="h-4 w-4" />
            SQL Bulk Deploy (Fast)
          </Button>
          
          {/* View Mode Toggle */}
          <div className="flex border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Import/Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4 mr-2" />
                Import/Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={importExport.handleExportCSV}
                disabled={importExport.isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Templates (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={importExport.handleImportCSV}
                disabled={importExport.isImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Templates (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={importExport.handleDownloadTemplate}>
                <FileText className="h-4 w-4 mr-2" />
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recipe Templates ({filteredTemplates.length}{filteredTemplates.length !== templates.length ? ` of ${templates.length}` : ''})</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <ChefHat className="h-3 w-3" />
                {templates.length} Templates
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Calculator className="h-3 w-3" />
                ₱{templates.reduce((sum, t) => sum + getTemplateCost(t), 0).toFixed(2)} Total Cost
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {categories.length} Categories
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card>

      {/* Templates Display */}
      {filteredTemplates.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {searchTerm || categoryFilter !== 'all' 
              ? `No templates found matching your filters` 
              : 'No recipe templates created yet. Click "Create Template" to get started.'
            }
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(renderTemplateCard)}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map(renderTemplateList)}
            </div>
          )}
        </>
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
      <OptimizedRecipeDeploymentDialog
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

      {/* SQL Bulk Deployment Dialog */}
      <BulkDeploymentDialog
        isOpen={showSqlBulkDeployment}
        onClose={() => setShowSqlBulkDeployment(false)}
      />
    </div>
  );
};

export default GlobalRecipeManagement;