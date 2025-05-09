
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Store } from "@/types";

interface SuccessStateProps {
  store: Store;
  onRegisterAnother: () => void;
}

export const SuccessState = ({ store, onRegisterAnother }: SuccessStateProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center text-green-600">
            <Check className="mr-2 h-5 w-5" />
            Thank You!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">You've successfully joined {store.name}'s loyalty program!</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={onRegisterAnother} 
            className="bg-croffle-primary hover:bg-croffle-primary/90"
          >
            Register Another Customer
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
