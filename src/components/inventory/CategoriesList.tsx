
import { useState } from "react";
import { Category } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Category as CategoryIcon } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { saveCategory } from "@/services/inventoryService";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface CategoriesListProps {
  categories: Category[];
  onDataChanged: () => void;
}

export default function CategoriesList({ categories, onDataChanged }: CategoriesListProps) {
  const { currentStore } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryData, setCategoryData] = useState<Category>({
    id: "",
    name: "",
    description: "",
    isActive: true,
  });

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setCategoryData({
      id: "",
      name: "",
      description: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryData({
      id: category.id,
      name: category.name,
      description: category.description || "",
      isActive: category.isActive,
      image: category.image,
    });
    setIsDialogOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCategoryData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setCategoryData(prev => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentStore) {
      toast.error("No store selected");
      return;
    }
    
    try {
      setIsSaving(true);
      
      await saveCategory(categoryData, currentStore.id);
      
      toast.success(`Category ${categoryData.id ? "updated" : "created"} successfully!`);
      setIsDialogOpen(false);
      onDataChanged();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Categories</CardTitle>
          
          <Button
            size="sm"
            className="bg-croffle-accent hover:bg-croffle-accent/90 flex items-center"
            onClick={handleAddCategory}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            type="search"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-croffle-primary/30 focus-visible:ring-croffle-accent"
          />
        </div>
        
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <CategoryIcon className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No categories found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery ? "Try changing your search query" : "Get started by adding your first category"}
            </p>
            {!searchQuery && (
              <Button 
                className="mt-4 bg-croffle-accent hover:bg-croffle-accent/90"
                onClick={handleAddCategory}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {filteredCategories.map(category => (
              <Card 
                key={category.id} 
                className={`cursor-pointer hover:border-croffle-primary/50 transition-all ${!category.isActive ? 'opacity-60' : ''}`}
                onClick={() => handleEditCategory(category)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold truncate">{category.name}</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                      e.stopPropagation();
                      handleEditCategory(category);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Category Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{categoryData.id ? `Edit ${categoryData.name}` : "Add New Category"}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={categoryData.name}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    name="description"
                    value={categoryData.description || ""}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="isActive" 
                    checked={categoryData.isActive} 
                    onCheckedChange={handleSwitchChange} 
                  />
                  <Label htmlFor="isActive">Active Category</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : categoryData.id ? "Update Category" : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
