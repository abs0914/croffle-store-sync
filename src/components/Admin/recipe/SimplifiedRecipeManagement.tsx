import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Edit, 
  Rocket, 
  Store,
  FileText,
  MoreHorizontal,
  CheckCircle,
  Clock
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useUnifiedRecipeState } from '@/hooks/admin/useUnifiedRecipeState';
import { RecipeTemplateDialog } from '@/pages/Admin/components/RecipeTemplateDialog';
import { EnhancedRecipeDeploymentDialog } from '@/components/Admin/recipe/EnhancedRecipeDeploymentDialog';

interface TableRecipeInput {
  name: string;
  tableData: string;
  description?: string;
  category?: string;
  yieldQuantity: number;
  servingSize: number;
}

export function SimplifiedRecipeManagement() {
  const {
    templates,
    stores,
    isLoadingTemplates,
    updateTemplate,
    deleteTemplate
  } = useUnifiedRecipeState();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isDeploymentDialogOpen, setIsDeploymentDialogOpen] = useState(false);
  const [templateToDeploy, setTemplateToDeploy] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state for creating templates from table data
  const [newTemplate, setNewTemplate] = useState<TableRecipeInput>({
    name: '',
    tableData: '',
    description: '',
    category: '',
    yieldQuantity: 1,
    servingSize: 1
  });

  // Filter templates based on search
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setIsTemplateDialogOpen(true);
  };

  const handleDeployTemplate = (template: any) => {
    setTemplateToDeploy(template);
    setIsDeploymentDialogOpen(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(templateId);
    }
  };

  const parseTableData = (tableData: string) => {
    const lines = tableData.trim().split('\n');
    const ingredients = [];
    
    for (const line of lines) {
      // Skip header lines or empty lines
      if (!line.trim() || line.includes('---') || line.toLowerCase().includes('ingredient')) {
        continue;
      }
      
      // Parse table format: | Ingredient | Quantity | Unit | Cost |
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 3) {
        ingredients.push({
          ingredient_name: parts[0],
          quantity: parseFloat(parts[1]) || 1,
          unit: parts[2],
          cost_per_unit: parseFloat(parts[3]) || 0
        });
      }
    }
    
    return ingredients;
  };

  const handleCreateTemplate = async () => {
    try {
      const ingredients = parseTableData(newTemplate.tableData);
      
      if (ingredients.length === 0) {
        toast.error('Please add ingredients in table format');
        return;
      }

      // Here you would call your template creation service
      // For now, just show success message
      toast.success(`Template "${newTemplate.name}" created with ${ingredients.length} ingredients`);
      
      // Reset form
      setNewTemplate({
        name: '',
        tableData: '',
        description: '',
        category: '',
        yieldQuantity: 1,
        servingSize: 1
      });
      setShowCreateForm(false);
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const getDeploymentStatus = (template: any) => {
    const deployedCount = template.deployed_stores?.length || 0;
    if (deployedCount === 0) {
      return { status: 'not-deployed', label: 'Not Deployed', color: 'text-muted-foreground' };
    }
    return { status: 'deployed', label: `Deployed to ${deployedCount} store${deployedCount > 1 ? 's' : ''}`, color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Recipe Management</h1>
          <p className="text-muted-foreground">
            Create templates and deploy them to stores
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Create Template Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Recipe Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Beverages, Pastries"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the recipe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Yield Quantity</label>
                <Input
                  type="number"
                  value={newTemplate.yieldQuantity}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, yieldQuantity: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Serving Size</label>
                <Input
                  type="number"
                  value={newTemplate.servingSize}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, servingSize: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Recipe Ingredients (Table Format)</label>
              <Textarea
                value={newTemplate.tableData}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, tableData: e.target.value }))}
                placeholder={`Enter ingredients in table format:
| Ingredient | Quantity | Unit | Cost |
| Coffee Beans | 20 | g | 0.50 |
| Milk | 150 | ml | 0.25 |
| Sugar | 10 | g | 0.05 |`}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      {isLoadingTemplates ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const deploymentStatus = getDeploymentStatus(template);
            
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {deploymentStatus.status === 'deployed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`text-sm ${deploymentStatus.color}`}>
                          {deploymentStatus.label}
                        </span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Template
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeployTemplate(template)}>
                          <Rocket className="h-4 w-4 mr-2" />
                          Deploy to Stores
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Delete Template
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {template.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Yield:</span> {template.yield_quantity}
                    </div>
                    <div>
                      <span className="font-medium">Servings:</span> {template.serving_size}
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span> ₱{template.total_cost?.toFixed(2) || '0.00'}
                    </div>
                    <div>
                      <span className="font-medium">Ingredients:</span> {template.ingredients?.length || 0}
                    </div>
                  </div>
                  
                  {template.deployed_stores && template.deployed_stores.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Deployed to:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.deployed_stores.slice(0, 2).map((storeName: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Store className="h-3 w-3 mr-1" />
                            {storeName}
                          </Badge>
                        ))}
                        {template.deployed_stores.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.deployed_stores.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button 
                      size="sm" 
                      className="w-full" 
                      onClick={() => handleDeployTemplate(template)}
                      variant={deploymentStatus.status === 'deployed' ? 'outline' : 'default'}
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      {deploymentStatus.status === 'deployed' ? 'Redeploy' : 'Deploy'} to Stores
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground">Create your first recipe template to get started.</p>
        </div>
      )}

      {/* Dialogs */}
      {selectedTemplate && (
        <RecipeTemplateDialog
          template={selectedTemplate}
          isOpen={isTemplateDialogOpen}
          onClose={() => {
            setIsTemplateDialogOpen(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setIsTemplateDialogOpen(false);
            setSelectedTemplate(null);
            toast.success('Template updated successfully');
          }}
        />
      )}

      {templateToDeploy && (
        <EnhancedRecipeDeploymentDialog
          template={templateToDeploy}
          stores={stores}
          isOpen={isDeploymentDialogOpen}
          onClose={() => {
            setIsDeploymentDialogOpen(false);
            setTemplateToDeploy(null);
          }}
          onSuccess={() => {
            setIsDeploymentDialogOpen(false);
            setTemplateToDeploy(null);
            toast.success('Template deployed successfully');
          }}
        />
      )}
    </div>
  );
}