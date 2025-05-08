
import { Card, CardContent } from "@/components/ui/card";

export function ReportErrorState() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center py-10">
          <p className="text-destructive">Error loading report data</p>
          <p className="text-muted-foreground text-sm mt-2">Please try again later</p>
        </div>
      </CardContent>
    </Card>
  );
}
