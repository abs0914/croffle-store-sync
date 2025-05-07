
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import InventoryHeader from "./components/InventoryHeader";
import { useIngredientData } from "./components/ingredients/useIngredientData";
import { IngredientList } from "./components/ingredients/IngredientList";
import { AddIngredientForm } from "./components/ingredients/AddIngredientForm";
import { EditIngredientForm } from "./components/ingredients/EditIngredientForm";
import { StockAdjustmentModal } from "./components/ingredients/StockAdjustmentModal";

export default function Ingredients() {
  const {
    currentStore,
    ingredients,
    isLoading,
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isStockModalOpen,
    setIsStockModalOpen,
    currentIngredient,
    createMutation,
    updateMutation,
    stockMutation,
    handleAddIngredient,
    handleUpdateIngredient,
    handleStockAdjustment,
    openEditModal,
    openStockModal
  } = useIngredientData();

  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Inventory Stock Management</h1>
        <p>Please select a store first</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <InventoryHeader 
        title="Inventory Stock Management" 
        description="Manage your raw materials, ingredients, and supplies"
      />
      
      <div className="flex justify-end mb-4">
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Inventory Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <IngredientList 
            ingredients={ingredients}
            isLoading={isLoading}
            onEdit={openEditModal}
            onStockAdjust={openStockModal}
          />
        </CardContent>
      </Card>

      {/* Add Ingredient Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <AddIngredientForm 
          onSave={handleAddIngredient}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Dialog>

      {/* Edit Ingredient Modal */}
      {currentIngredient && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <EditIngredientForm
            ingredient={currentIngredient}
            onUpdate={handleUpdateIngredient}
            onCancel={() => setIsEditModalOpen(false)}
            isLoading={updateMutation.isPending}
          />
        </Dialog>
      )}

      {/* Stock Adjustment Modal */}
      {currentIngredient && (
        <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
          <StockAdjustmentModal
            ingredient={currentIngredient}
            onSave={handleStockAdjustment}
            onCancel={() => setIsStockModalOpen(false)}
            isLoading={stockMutation.isPending}
          />
        </Dialog>
      )}
    </div>
  );
}
