
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePermissionAudit } from '@/hooks/usePermissionAudit';

export function PermissionAuditPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { auditResult, logAuditResults, hasIssues } = usePermissionAudit();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!auditResult) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant={hasIssues ? "destructive" : "secondary"}
            className="gap-2 shadow-lg"
          >
            <Shield className="h-4 w-4" />
            Permission Audit
            {hasIssues && <AlertTriangle className="h-4 w-4" />}
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="shadow-lg border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permission System Audit
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logAuditResults}
                  className="ml-auto text-xs"
                >
                  Log to Console
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* User Info */}
              <div className="space-y-1">
                <div className="font-medium">User Information</div>
                <div className="text-muted-foreground">
                  <div>Role: <Badge variant="outline">{auditResult.userRole}</Badge></div>
                  <div>Store Access: {auditResult.hasStoreAccess ? '✅' : '❌'}</div>
                  <div>Stores: {auditResult.userStoreIds?.length || 0}</div>
                </div>
              </div>

              {/* Permission Summary */}
              <div className="space-y-1">
                <div className="font-medium">Permissions</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(auditResult.permissionChecks).map(([permission, hasAccess]) => (
                    <div key={permission} className="flex items-center gap-1">
                      {hasAccess ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                      )}
                      <span className="truncate">
                        {permission.replace('canAccess', '')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues */}
              {auditResult.potentialIssues.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <div className="font-medium mb-1">Issues Found:</div>
                    <ul className="space-y-1">
                      {auditResult.potentialIssues.map((issue, index) => (
                        <li key={index} className="text-xs">• {issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {auditResult.potentialIssues.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    All permission checks passed successfully!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
