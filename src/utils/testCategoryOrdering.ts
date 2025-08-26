/**
 * Test utility to verify category ordering implementation
 * Use this in browser console for testing: testCategoryOrdering()
 */

import { Category } from "@/types";
import { sortCategoriesForPOS, prepareCategoriesForPOS, CATEGORY_ORDER } from "./categoryOrdering";

export const testCategoryOrdering = () => {
  console.log('🧪 Testing Category Ordering Implementation');
  
  // Mock categories for testing
  const mockCategories: Category[] = [
    { id: '1', name: 'Beverages', is_active: true, store_id: 'test' },
    { id: '2', name: 'Classic', is_active: true, store_id: 'test' },
    { id: '3', name: 'Espresso', is_active: true, store_id: 'test' },
    { id: '4', name: 'Premium', is_active: true, store_id: 'test' },
    { id: '5', name: 'Other', is_active: true, store_id: 'test' },
    { id: '6', name: 'Fruity', is_active: true, store_id: 'test' },
    { id: '7', name: 'Mix & Match', is_active: true, store_id: 'test' },
    { id: '8', name: 'Add-ons', is_active: true, store_id: 'test' },
    { id: '9', name: 'Combo', is_active: true, store_id: 'test' },
    { id: '10', name: 'Cold', is_active: true, store_id: 'test' },
    { id: '11', name: 'Glaze', is_active: true, store_id: 'test' },
    { id: '12', name: 'Blended', is_active: true, store_id: 'test' },
  ];

  console.log('📋 Expected Order:', CATEGORY_ORDER);
  
  // Test sorting
  const sorted = sortCategoriesForPOS(mockCategories);
  console.log('✅ Sorted Categories:', sorted.map(c => c.name));
  
  // Test preparation (filtering + sorting)
  const prepared = prepareCategoriesForPOS(mockCategories);
  console.log('🎯 Prepared for POS (filtered & sorted):', prepared.map(c => c.name));
  
  // Verify expected order
  const expectedOrder = [
    'Classic', 'Premium', 'Fruity', 'Glaze', 'Cold', 'Blended', 'Mix & Match',
    'Espresso', 'Beverages', 'Add-ons', 'Combo'
  ];
  
  const actualOrder = prepared.map(c => c.name);
  const isCorrect = JSON.stringify(expectedOrder) === JSON.stringify(actualOrder);
  
  console.log(isCorrect ? '✅ Order is CORRECT!' : '❌ Order is INCORRECT!');
  console.log('Expected:', expectedOrder);
  console.log('Actual:', actualOrder);
  
  return {
    isCorrect,
    expected: expectedOrder,
    actual: actualOrder,
    mockCategories,
    sorted,
    prepared
  };
};

// Export for global testing
if (typeof window !== 'undefined') {
  (window as any).testCategoryOrdering = testCategoryOrdering;
}