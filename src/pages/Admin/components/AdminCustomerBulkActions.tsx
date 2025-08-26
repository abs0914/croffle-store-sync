
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Mail, Gift, Archive, Download, MessageSquare } from 'lucide-react';

interface AdminCustomerBulkActionsProps {
  selectedCount: number;
  onBulkAction: (action: string) => void;
  onClearSelection: () => void;
}

export const AdminCustomerBulkActions: React.FC<AdminCustomerBulkActionsProps> = ({
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
              {selectedCount} customer{selectedCount > 1 ? 's' : ''} selected
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
              onClick={() => onBulkAction('email')}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('sms')}
              className="border-green-200 text-green-700 hover:bg-green-100"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('loyalty')}
              className="border-purple-200 text-purple-700 hover:bg-purple-100"
            >
              <Gift className="h-4 w-4 mr-2" />
              Add Points
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
              onClick={() => onBulkAction('archive')}
              className="border-red-200 text-red-700 hover:bg-red-100"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
