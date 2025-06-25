
import React from 'react';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
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
          {categories.map((category) => (
            <tr key={category.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {category.image_url && (
                    <img
                      className="h-10 w-10 rounded-full mr-3 object-cover"
                      src={category.image_url}
                      alt={category.name}
                    />
                  )}
                  <div className="text-sm font-medium text-gray-900">
                    {category.name}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {category.description || 'No description'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {categories.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No categories found</p>
        </div>
      )}
    </div>
  );
}
