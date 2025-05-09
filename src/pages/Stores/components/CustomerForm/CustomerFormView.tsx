
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { Store } from "@/types";

interface CustomerFormViewProps {
  store: Store;
  isSubmitting: boolean;
  formData: {
    name: string;
    phone: string;
    email: string;
  };
  updateFormField: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const CustomerFormView = ({
  store,
  isSubmitting,
  formData,
  updateFormField,
  onSubmit,
}: CustomerFormViewProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {store.logo_url && (
            <div className="flex justify-center mb-4">
              <img 
                src={store.logo_url} 
                alt={`${store.name} logo`} 
                className="h-16 w-16 object-contain"
              />
            </div>
          )}
          <CardTitle className="text-xl font-bold">{store.name}</CardTitle>
          <p className="text-muted-foreground">Join our loyalty program</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => updateFormField("name", e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
              <Input 
                id="phone" 
                value={formData.phone} 
                onChange={(e) => updateFormField("phone", e.target.value)}
                placeholder="Your phone number"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email} 
                onChange={(e) => updateFormField("email", e.target.value)}
                placeholder="Your email address"
              />
            </div>
            
            <Separator className="my-4" />
            
            <Button 
              type="submit" 
              className="w-full bg-croffle-primary hover:bg-croffle-primary/90" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Join Loyalty Program"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
