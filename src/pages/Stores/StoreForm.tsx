
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { StoreFormHeader } from "./components/StoreFormHeader";
import { StoreFormContent } from "./components/StoreFormContent";
import { StoreFormActions } from "./components/StoreFormActions";
import { useStoreForm } from "./hooks/useStoreForm";

export default function StoreForm() {
  const { id } = useParams();
  
  const {
    isEditing,
    isLoading,
    isSaving,
    formData,
    handleChange,
    handleSelectChange,
    handleSwitchChange,
    handleSubmit,
  } = useStoreForm(id);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <Loader2 className="h-8 w-8 animate-spin text-croffle-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <StoreFormHeader isEditing={isEditing} />
        
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Store Information</CardTitle>
            </CardHeader>
            <StoreFormContent 
              formData={formData}
              handleChange={handleChange}
              handleSelectChange={handleSelectChange}
              handleSwitchChange={handleSwitchChange}
            />
            <StoreFormActions 
              isEditing={isEditing} 
              isSaving={isSaving} 
            />
          </Card>
        </form>
      </div>
    </div>
  );
};
