
import { useProductData as useProductDataCore } from "@/hooks/useProductData";
import { useStore } from "@/contexts/StoreContext";

export const useProductData = () => {
  const { currentStore } = useStore();
  const storeId = currentStore?.id || null;
  
  const productData = useProductDataCore(storeId);
  
  return {
    ...productData,
    currentStore
  };
};
