
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCustomerForm } from "./hooks/useCustomerForm";
import { LoadingState } from "./components/CustomerForm/LoadingState";
import { ErrorState } from "./components/CustomerForm/ErrorState";
import { SuccessState } from "./components/CustomerForm/SuccessState";
import { CustomerFormView } from "./components/CustomerForm/CustomerFormView";

export default function CustomerForm() {
  const { storeId } = useParams();
  
  const {
    store,
    isLoading,
    isSubmitting,
    isSuccess,
    error,
    formData,
    updateFormField,
    fetchStore,
    handleSubmit,
    setIsSuccess
  } = useCustomerForm({ storeId });
  
  useEffect(() => {
    if (storeId) {
      fetchStore();
    }
  }, [storeId]);
  
  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }
  
  // Error state
  if (error || !store) {
    return <ErrorState errorMessage={error || "Failed to load store information"} />;
  }
  
  // Success state
  if (isSuccess) {
    return <SuccessState store={store} onRegisterAnother={() => setIsSuccess(false)} />;
  }
  
  // Default form view
  return (
    <CustomerFormView
      store={store}
      isSubmitting={isSubmitting}
      formData={formData}
      updateFormField={updateFormField}
      onSubmit={handleSubmit}
    />
  );
}
