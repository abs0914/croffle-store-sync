
import React, { useState } from 'react';
import { Product, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StockAdjustmentButton } from './product/StockAdjustmentButton';
import { StockAdjustmentModal } from './product/StockAdjustmentModal';
import { ProductDeleteDialog } from './product/ProductDeleteDialog';

interface ProductsTableProps {
  products: Product[];
  categories: Category[];
  onRefresh: () => void;
}

export function ProductsTable({ products, categories, onRefresh }: ProductsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const navigate = useNavigate();

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string | undefined) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown';
  };

  const handleStockAdjustment = (product: Product) => {
    setAdjustingProduct(product);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <Button onClick={() => navigate('/inventory/products/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {product.image_url && (
                      <img
                        className="h-10 w-10 rounded-full mr-3 object-cover"
                        src={product.image_url}
                        alt={product.name}
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getCategoryName(product.category_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₱{product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${product.stock_quantity < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock_quantity}
                    </span>
                    <StockAdjustmentButton onClick={() => handleStockAdjustment(product)} />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={product.is_active ? 'default' : 'secondary'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/inventory/products/${product.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProduct(product)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>

      {adjustingProduct && (
        <StockAdjustmentModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onSuccess={onRefresh}
        />
      )}

      {deletingProduct && (
        <ProductDeleteDialog
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
