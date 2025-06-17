
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface AdminPurchaseOrderBulkActionsProps {
  selectedCount: number;
  onBulkAction: (action: string) => void;
  onClearSelection: () => void;
}

export function AdminPurchaseOrderBulkActions({
  selectedCount,
  onBulkAction,
  onClearSelection
}: AdminPurchaseOrderBulkActionsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedCount} order{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction('approve')}
                className="text-green-600 hover:text-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction('reject')}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject All
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
