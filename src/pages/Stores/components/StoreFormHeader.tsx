
import React from "react";

interface StoreFormHeaderProps {
  isEditing: boolean;
}

export const StoreFormHeader = ({ isEditing }: StoreFormHeaderProps) => {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-croffle-primary">
        {isEditing ? "Edit Store" : "Add New Store"}
      </h1>
      <p className="text-gray-500">
        {isEditing 
          ? "Update your store information" 
          : "Fill in the details to add a new store"}
      </p>
    </div>
  );
};
