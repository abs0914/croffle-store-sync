
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Settings, Power, Download, Copy } from 'lucide-react';

interface AdminBulkActionsProps {
  selectedCount: number;
  onBulkAction: (action: string) => void;
  onClearSelection: () => void;
}

export const AdminBulkActions: React.FC<AdminBulkActionsProps> = ({
  selectedCount,
  onBulkAction,
  onClearSelection
}) => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-blue-900">
              {selectedCount} store{selectedCount > 1 ? 's' : ''} selected
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('configure')}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('activate')}
              className="border-green-200 text-green-700 hover:bg-green-100"
            >
              <Power className="h-4 w-4 mr-2" />
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('deactivate')}
              className="border-red-200 text-red-700 hover:bg-red-100"
            >
              <Power className="h-4 w-4 mr-2" />
              Deactivate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('duplicate')}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('export')}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
