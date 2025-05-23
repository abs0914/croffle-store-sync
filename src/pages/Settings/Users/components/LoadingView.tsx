
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function LoadingView() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-medium mb-2">Loading your profile...</h2>
          <p className="text-muted-foreground">Please wait while we retrieve your information.</p>
          <div className="flex justify-center mt-4">
            <Spinner className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
