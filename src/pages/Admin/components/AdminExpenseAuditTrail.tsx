
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, User, FileText, DollarSign, Settings } from 'lucide-react';
import { auditTrailService } from '@/services/expense/auditTrailService';
import type { ExpenseAuditTrail } from '@/types/expense';

const actionIcons = {
  create: <FileText className="h-4 w-4" />,
  update: <Settings className="h-4 w-4" />,
  delete: <FileText className="h-4 w-4" />,
  approve: <DollarSign className="h-4 w-4" />,
  reject: <DollarSign className="h-4 w-4" />
};

const actionColors = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-orange-100 text-orange-800'
};

export default function AdminExpenseAuditTrail() {
  const { data: auditTrail, isLoading } = useQuery({
    queryKey: ['expense-audit-trail'],
    queryFn: () => auditTrailService.getRecentAuditActivities(100)
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatChanges = (auditEntry: ExpenseAuditTrail) => {
    if (!auditEntry.old_values || !auditEntry.new_values) {
      return null;
    }

    const changes = auditEntry.changed_fields || [];
    return changes.map(field => ({
      field,
      oldValue: auditEntry.old_values![field],
      newValue: auditEntry.new_values![field]
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>Loading audit activities...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Expense Audit Trail
        </CardTitle>
        <CardDescription>
          Recent activities and changes in the expense management system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {auditTrail?.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className={actionColors[entry.action]}>
                      <span className="flex items-center gap-1">
                        {actionIcons[entry.action]}
                        {entry.action.toUpperCase()}
                      </span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {entry.entity_type.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{entry.user_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {entry.user_role}
                  </Badge>
                </div>

                {entry.reason && (
                  <div className="mb-2">
                    <span className="text-sm text-muted-foreground">Reason: </span>
                    <span className="text-sm">{entry.reason}</span>
                  </div>
                )}

                {formatChanges(entry) && (
                  <div className="mt-3">
                    <Separator className="mb-3" />
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Changes:</span>
                      <div className="mt-2 space-y-2">
                        {formatChanges(entry)?.map(({ field, oldValue, newValue }) => (
                          <div key={field} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="min-w-20">
                              {field}
                            </Badge>
                            <span className="text-red-600 line-through">
                              {typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || 'null')}
                            </span>
                            <span>→</span>
                            <span className="text-green-600 font-medium">
                              {typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || 'null')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {(!auditTrail || auditTrail.length === 0) && (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-muted-foreground">No audit activities</h3>
                <p className="text-sm text-muted-foreground">
                  Audit trail will appear here as expense activities occur
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
