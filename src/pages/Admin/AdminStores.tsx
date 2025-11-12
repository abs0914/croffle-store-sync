
import React, { useState } from 'react';
import { AdminStoresHeader } from './components/AdminStoresHeader';
import { AdminStoresMetrics } from './components/AdminStoresMetrics';
import { AdminStoresList } from './components/AdminStoresList';
import { AdminBulkActions } from './components/AdminBulkActions';
import { useAdminStoresData } from './hooks/useAdminStoresData';

export default function AdminStores() {
  console.log('🏪 AdminStores component rendering...');
  
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const {
    stores,
    filteredStores,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    locationFilter,
    setLocationFilter,
    ownershipFilter,
    setOwnershipFilter,
    isLoading,
    refreshStores,
    storeMetrics
  } = useAdminStoresData();

  console.log('🏪 AdminStores state:', {
    storesCount: stores.length,
    filteredCount: filteredStores.length,
    isLoading,
    viewMode,
    selectedCount: selectedStores.length
  });

  const handleSelectStore = (storeId: string) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSelectAll = () => {
    setSelectedStores(
      selectedStores.length === filteredStores.length 
        ? [] 
        : filteredStores.map(store => store.id)
    );
  };

  const handleBulkAction = async (action: string) => {
    // Handle bulk actions
    console.log('Bulk action:', action, 'on stores:', selectedStores);
    setSelectedStores([]);
    await refreshStores();
  };

  console.log('🏪 Rendering AdminStores UI');
  
  return (
    <div className="space-y-6">
      <AdminStoresHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        ownershipFilter={ownershipFilter}
        setOwnershipFilter={setOwnershipFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      
      <AdminStoresMetrics metrics={storeMetrics} />
      
      {selectedStores.length > 0 && (
        <AdminBulkActions 
          selectedCount={selectedStores.length}
          onBulkAction={handleBulkAction}
          onClearSelection={() => setSelectedStores([])}
        />
      )}
      
      <AdminStoresList
        stores={filteredStores}
        selectedStores={selectedStores}
        viewMode={viewMode}
        isLoading={isLoading}
        onSelectStore={handleSelectStore}
        onSelectAll={handleSelectAll}
        onRefresh={refreshStores}
      />
    </div>
  );
}
