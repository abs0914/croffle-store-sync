
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function ReportLoadingState() {
  return (
    <Card>
      <CardContent className="h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <p className="text-muted-foreground">Loading report data...</p>
        </div>
      </CardContent>
    </Card>
  );
}
