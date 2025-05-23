
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function LoadingView() {
  return (
    <Card>
      <CardContent className="flex justify-center items-center p-12">
        <div className="text-center">
          <Spinner className="h-8 w-8 mb-4" />
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </CardContent>
    </Card>
  );
}
