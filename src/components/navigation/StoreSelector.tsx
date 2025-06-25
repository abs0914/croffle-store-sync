
import React from 'react';
import { useStore } from "@/contexts/StoreContext";

export function StoreSelector() {
  const { currentStore, setCurrentStore, stores } = useStore();

  return (
    <div>
      <p className="text-sm font-medium px-4">Current Store</p>
      <select
        className="w-full h-10 rounded-md bg-muted px-4"
        value={currentStore?.id}
        onChange={(e) => {
          const selectedStore = stores.find(store => store.id === e.target.value);
          setCurrentStore(selectedStore || null);
        }}
      >
        <option value="">Select a store</option>
        {stores.map(store => (
          <option key={store.id} value={store.id}>{store.name}</option>
        ))}
      </select>
    </div>
  );
}
