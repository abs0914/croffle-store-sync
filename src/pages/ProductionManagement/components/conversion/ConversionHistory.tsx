
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface ConversionHistoryProps {
  conversions: any[];
}

export function ConversionHistory({ conversions }: ConversionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Conversions</CardTitle>
      </CardHeader>
      <CardContent>
        {conversions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No conversions have been performed yet.
          </div>
        ) : (
          <div className="space-y-4">
            {conversions.slice(0, 10).map((conversion) => (
              <div key={conversion.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">
                    {new Date(conversion.conversion_date).toLocaleDateString()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {conversion.finished_goods_quantity} units produced
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span>
                    {conversion.conversion_ingredients?.length || 0} raw materials
                  </span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium">
                    {conversion.commissary_item?.name || 'Output Item'}
                  </span>
                </div>
                
                {conversion.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    {conversion.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
