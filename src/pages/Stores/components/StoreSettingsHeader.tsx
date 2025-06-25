
import React from 'react';
import { Store } from "@/types";

interface StoreSettingsHeaderProps {
  store: Store | null;
}

export const StoreSettingsHeader = ({ store }: StoreSettingsHeaderProps) => {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-croffle-primary">Store Settings</h1>
      <p className="text-gray-500">Configure settings for {store?.name}</p>
    </div>
  );
};
