
import { useParams } from "react-router-dom";
import { useStoreData } from "./useStoreData";
import { useQRCodeValue } from "./useQRCodeValue";

export const useStoreQR = () => {
  const { id } = useParams();
  const { isLoading, store, error, fetchStore } = useStoreData(id);
  const qrValue = useQRCodeValue(store);
  
  return {
    isLoading,
    store,
    qrValue,
    error,
    fetchStore
  };
};

// Export sub-hooks for more granular usage
export { useStoreData } from "./useStoreData";
export { useQRCodeValue } from "./useQRCodeValue";
