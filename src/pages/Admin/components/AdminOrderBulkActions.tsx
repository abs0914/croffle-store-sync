
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, CheckCircle, XCircle, RefreshCw, Download, FileText } from 'lucide-react';

interface AdminOrderBulkActionsProps {
  selectedCount: number;
  onBulkAction: (action: string) => void;
  onClearSelection: () => void;
}

export const AdminOrderBulkActions: React.FC<AdminOrderBulkActionsProps> = ({
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
              {selectedCount} order{selectedCount > 1 ? 's' : ''} selected
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
              onClick={() => onBulkAction('complete')}
              className="border-green-200 text-green-700 hover:bg-green-100"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('void')}
              className="border-red-200 text-red-700 hover:bg-red-100"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Void Orders
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('resync')}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('export')}
              className="border-gray-200 text-gray-700 hover:bg-gray-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('receipt')}
              className="border-purple-200 text-purple-700 hover:bg-purple-100"
            >
              <FileText className="h-4 w-4 mr-2" />
              Print Receipts
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
