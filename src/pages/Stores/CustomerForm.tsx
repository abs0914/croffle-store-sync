
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";

export default function CustomerForm() {
  const { storeId } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  useEffect(() => {
    if (storeId) {
      fetchStore();
    } else {
      setError("Store ID is missing");
      setIsLoading(false);
    }
  }, [storeId]);
  
  const fetchStore = async () => {
    try {
      // Create a client specifically for public access
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, logo_url")
        .eq("id", storeId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setStore(data as Store);
      } else {
        setError("Store not found");
      }
    } catch (error: any) {
      console.error("Error fetching store:", error);
      setError("Failed to load store information");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !phone) {
      toast.error("Please fill in required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Insert customer data using anonymous access
      const { error } = await supabase
        .from("customers")
        .insert({
          name,
          phone,
          email: email || null,
          store_id: storeId,
        });
      
      if (error) throw error;
      
      // Show success message
      setIsSuccess(true);
      toast.success("Thank you for joining our loyalty program!");
      
      // Reset form
      setName("");
      setPhone("");
      setEmail("");
      
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-croffle-primary" />
            <p className="mt-4 text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error || "Failed to load store information"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Success state
  if (isSuccess) {
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
              onClick={() => setIsSuccess(false)} 
              className="bg-croffle-primary hover:bg-croffle-primary/90"
            >
              Register Another Customer
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Default form view
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input 
                id="email" 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
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
}
