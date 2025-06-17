
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Copy, Settings, Trash2, Download, Upload } from 'lucide-react';

interface AdminRecipeBulkActionsProps {
  selectedCount: number;
  onBulkAction: (action: string) => void;
  onClearSelection: () => void;
}

export const AdminRecipeBulkActions: React.FC<AdminRecipeBulkActionsProps> = ({
  selectedCount,
  onBulkAction,
  onClearSelection
}) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {selectedCount} recipe{selectedCount !== 1 ? 's' : ''} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('deploy')}
            className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
          >
            <Copy className="h-4 w-4 mr-2" />
            Deploy to Stores
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('activate')}
            className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
          >
            Activate
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('configure')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('export')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('delete')}
            className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
