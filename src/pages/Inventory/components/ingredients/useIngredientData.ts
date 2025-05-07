import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Ingredient } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  fetchIngredients, 
  createIngredient,
  updateIngredient,
  updateIngredientStock
} from "@/services/ingredient";

export const useIngredientData = () => {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState<Ingredient | null>(null);
  
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
  
  const handleAddIngredient = (newIngredient: Partial<Ingredient>) => {
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

  const handleUpdateIngredient = (ingredient: Ingredient) => {
    if (!ingredient.id) return;

    updateMutation.mutate({
      id: ingredient.id,
      updates: {
        name: ingredient.name,
        unit_type: ingredient.unit_type,
        cost_per_unit: Number(ingredient.cost_per_unit || 0),
        is_active: ingredient.is_active
      }
    });
  };

  const handleStockAdjustment = (
    id: string, 
    quantity: number, 
    type: string, 
    notes: string
  ) => {
    const ingredient = ingredients.find(i => i.id === id);
    if (!ingredient) return;
    
    const newQuantity = type === 'adjustment'
      ? Number(quantity)
      : type === 'purchase'
        ? Number(ingredient.stock_quantity) + Number(quantity)
        : Math.max(0, Number(ingredient.stock_quantity) - Number(quantity));

    stockMutation.mutate({
      id,
      newQuantity,
      type: type as any,
      notes
    });
  };

  const openEditModal = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    setIsEditModalOpen(true);
  };

  const openStockModal = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    setIsStockModalOpen(true);
  };
  
  return {
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
    setCurrentIngredient,
    createMutation,
    updateMutation,
    stockMutation,
    handleAddIngredient,
    handleUpdateIngredient,
    handleStockAdjustment,
    openEditModal,
    openStockModal
  };
};
