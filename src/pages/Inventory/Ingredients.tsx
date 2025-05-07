
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Ingredient } from "@/types";
import { 
  fetchIngredients, 
  createIngredient,
  updateIngredient,
  updateIngredientStock
} from "@/services/ingredientService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import InventoryHeader from "./components/InventoryHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Edit, Minus } from "lucide-react";

export default function Ingredients() {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState<Ingredient | null>(null);
  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    name: "",
    unit_type: "pieces",
    stock_quantity: 0,
    cost_per_unit: 0,
    is_active: true
  });
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    type: "adjustment",
    notes: ""
  });
  const queryClient = useQueryClient();

  // Query to fetch ingredients
  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['ingredients', currentStore?.id],
    queryFn: () => currentStore ? fetchIngredients(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id
  });

  // Mutation for creating an ingredient
  const createMutation = useMutation({
    mutationFn: createIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients', currentStore?.id] });
      setIsAddModalOpen(false);
      resetNewIngredientForm();
    }
  });

  // Mutation for updating an ingredient
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<Ingredient> }) => 
      updateIngredient(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients', currentStore?.id] });
      setIsEditModalOpen(false);
    }
  });

  // Mutation for updating stock
  const stockMutation = useMutation({
    mutationFn: ({ id, newQuantity, type, notes }: { 
      id: string, 
      newQuantity: number, 
      type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'transfer',
      notes: string
    }) => {
      if (!currentStore || !user) return Promise.resolve(false);
      return updateIngredientStock(
        id, 
        newQuantity, 
        type as any, 
        currentStore.id, 
        user.id,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients', currentStore?.id] });
      setIsStockModalOpen(false);
    }
  });

  const resetNewIngredientForm = () => {
    setNewIngredient({
      name: "",
      unit_type: "pieces",
      stock_quantity: 0,
      cost_per_unit: 0,
      is_active: true
    });
  };

  const handleAddIngredient = () => {
    if (!currentStore?.id) {
      toast.error("Please select a store first");
      return;
    }

    if (!newIngredient.name) {
      toast.error("Ingredient name is required");
      return;
    }

    createMutation.mutate({
      ...newIngredient,
      store_id: currentStore.id,
      stock_quantity: Number(newIngredient.stock_quantity || 0),
      cost_per_unit: Number(newIngredient.cost_per_unit || 0),
      is_active: true
    } as Omit<Ingredient, "id">);
  };

  const handleUpdateIngredient = () => {
    if (!currentIngredient?.id) return;

    updateMutation.mutate({
      id: currentIngredient.id,
      updates: {
        name: currentIngredient.name,
        unit_type: currentIngredient.unit_type,
        cost_per_unit: Number(currentIngredient.cost_per_unit || 0),
        is_active: currentIngredient.is_active
      }
    });
  };

  const handleStockAdjustment = () => {
    if (!currentIngredient?.id) return;
    
    const newQuantity = stockAdjustment.type === 'adjustment'
      ? Number(stockAdjustment.quantity)
      : stockAdjustment.type === 'purchase'
        ? Number(currentIngredient.stock_quantity) + Number(stockAdjustment.quantity)
        : Math.max(0, Number(currentIngredient.stock_quantity) - Number(stockAdjustment.quantity));

    stockMutation.mutate({
      id: currentIngredient.id,
      newQuantity,
      type: stockAdjustment.type as any,
      notes: stockAdjustment.notes
    });
  };

  const openEditModal = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    setIsEditModalOpen(true);
  };

  const openStockModal = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    setStockAdjustment({
      quantity: ingredient.stock_quantity,
      type: "adjustment",
      notes: ""
    });
    setIsStockModalOpen(true);
  };

  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Ingredients</h1>
        <p>Please select a store first</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <InventoryHeader 
        title="Ingredients" 
        description="Manage your raw materials and ingredients"
      />
      
      <div className="flex justify-end mb-4">
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Ingredient
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : ingredients.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <p>No ingredients found. Add your first ingredient to get started.</p>
            </div>
          ) : (
            <Table>
              <TableCaption>List of ingredients and raw materials</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Stock Quantity</TableHead>
                  <TableHead className="text-right">Cost Per Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>{ingredient.unit_type}</TableCell>
                    <TableCell className="text-right">{ingredient.stock_quantity}</TableCell>
                    <TableCell className="text-right">
                      {ingredient.cost_per_unit 
                        ? `₱${ingredient.cost_per_unit.toFixed(2)}` 
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {ingredient.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => openStockModal(ingredient)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => openEditModal(ingredient)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Ingredient Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Ingredient</DialogTitle>
            <DialogDescription>
              Add a new ingredient or raw material to your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit_type" className="text-right">
                Unit Type
              </Label>
              <Select 
                value={newIngredient.unit_type} 
                onValueChange={(value) => setNewIngredient({...newIngredient, unit_type: value as any})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pieces">Pieces</SelectItem>
                  <SelectItem value="portion">Portion</SelectItem>
                  <SelectItem value="serving">Serving</SelectItem>
                  <SelectItem value="scoop">Scoop</SelectItem>
                  <SelectItem value="grams">Grams</SelectItem>
                  <SelectItem value="milliliters">Milliliters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock_quantity" className="text-right">
                Initial Stock
              </Label>
              <Input
                id="stock_quantity"
                type="number"
                value={newIngredient.stock_quantity || 0}
                onChange={(e) => setNewIngredient({...newIngredient, stock_quantity: Number(e.target.value)})}
                className="col-span-3"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-right">
                Cost Per Unit
              </Label>
              <Input
                id="cost"
                type="number"
                value={newIngredient.cost_per_unit || 0}
                onChange={(e) => setNewIngredient({...newIngredient, cost_per_unit: Number(e.target.value)})}
                className="col-span-3"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddIngredient}
              disabled={createMutation.isPending}
              className="bg-croffle-accent hover:bg-croffle-accent/90"
            >
              {createMutation.isPending ? <Spinner className="mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Ingredient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ingredient Modal */}
      {currentIngredient && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Ingredient</DialogTitle>
              <DialogDescription>
                Update the details of this ingredient.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={currentIngredient.name}
                  onChange={(e) => setCurrentIngredient({...currentIngredient, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-unit_type" className="text-right">
                  Unit Type
                </Label>
                <Select 
                  value={currentIngredient.unit_type} 
                  onValueChange={(value) => setCurrentIngredient({...currentIngredient, unit_type: value as any})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="portion">Portion</SelectItem>
                    <SelectItem value="serving">Serving</SelectItem>
                    <SelectItem value="scoop">Scoop</SelectItem>
                    <SelectItem value="grams">Grams</SelectItem>
                    <SelectItem value="milliliters">Milliliters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-cost" className="text-right">
                  Cost Per Unit
                </Label>
                <Input
                  id="edit-cost"
                  type="number"
                  value={currentIngredient.cost_per_unit || 0}
                  onChange={(e) => setCurrentIngredient({...currentIngredient, cost_per_unit: Number(e.target.value)})}
                  className="col-span-3"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <Select 
                  value={currentIngredient.is_active ? "active" : "inactive"} 
                  onValueChange={(value) => setCurrentIngredient({
                    ...currentIngredient, 
                    is_active: value === "active"
                  })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateIngredient}
                disabled={updateMutation.isPending}
                className="bg-croffle-accent hover:bg-croffle-accent/90"
              >
                {updateMutation.isPending ? <Spinner className="mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Stock Adjustment Modal */}
      {currentIngredient && (
        <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock - {currentIngredient.name}</DialogTitle>
              <DialogDescription>
                Update the stock quantity of this ingredient.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock-type" className="text-right">
                  Update Type
                </Label>
                <Select 
                  value={stockAdjustment.type} 
                  onValueChange={(value) => setStockAdjustment({...stockAdjustment, type: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Set Exact Quantity</SelectItem>
                    <SelectItem value="purchase">Add to Stock</SelectItem>
                    <SelectItem value="sale">Remove from Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock-quantity" className="text-right">
                  {stockAdjustment.type === 'adjustment' ? 'New Quantity' : 'Quantity to Change'}
                </Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, quantity: Number(e.target.value)})}
                  className="col-span-3"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock-notes" className="text-right">
                  Notes
                </Label>
                <Input
                  id="stock-notes"
                  value={stockAdjustment.notes}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, notes: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional notes about this change"
                />
              </div>

              {stockAdjustment.type !== 'adjustment' && (
                <div className="col-span-4 text-center">
                  <p>
                    Current Stock: <strong>{currentIngredient.stock_quantity}</strong> {currentIngredient.unit_type}
                  </p>
                  <p className="mt-2">
                    New Stock After Change: <strong>
                      {stockAdjustment.type === 'purchase'
                        ? Number(currentIngredient.stock_quantity) + Number(stockAdjustment.quantity)
                        : Math.max(0, Number(currentIngredient.stock_quantity) - Number(stockAdjustment.quantity))
                      }
                    </strong> {currentIngredient.unit_type}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStockModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleStockAdjustment}
                disabled={stockMutation.isPending}
                className="bg-croffle-accent hover:bg-croffle-accent/90"
              >
                {stockMutation.isPending ? <Spinner className="mr-2" /> : null}
                Update Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
