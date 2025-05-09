
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Store } from "@/types";

export default function CustomerForm() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  
  useEffect(() => {
    const fetchStore = async () => {
      if (!storeId) {
        setError("Invalid store ID");
        setIsLoading(false);
        return;
      }
      
      try {
        // Use .eq() instead of .single() to avoid authentication issues
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .eq("id", storeId);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setStore(data[0] as Store);
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
    
    fetchStore();
  }, [storeId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      if (!formData.name || !formData.phone) {
        toast.error("Please fill in your name and phone number");
        setIsSubmitting(false);
        return;
      }
      
      // Submit to the database
      const { error } = await supabase
        .from("customers")
        .insert([{
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          store_id: storeId
        }]);
        
      if (error) {
        if (error.code === "23505") {
          toast.error("You are already registered with this phone number");
        } else {
          throw error;
        }
      } else {
        toast.success("Thank you for registering!");
        // Clear form
        setFormData({
          name: "",
          phone: "",
          email: "",
        });
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit your information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-md flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-croffle-primary" />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (error || !store) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold text-red-500">
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700">{error || "Failed to load the form"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-md">
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mb-4">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-24 mx-auto"
              />
            ) : (
              <img
                src="/lovable-uploads/e4103c2a-e57f-45f0-9999-1567aeda3f3d.png"
                alt="The Croffle Store"
                className="h-24 mx-auto"
              />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-croffle-primary">
            Join Our Loyalty Program
          </CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            <p className="text-sm text-center text-gray-500 mb-4">
              Sign up to receive special offers and rewards at {store.name}!
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="name">Your Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="border-croffle-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="555-123-4567"
                required
                className="border-croffle-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className="border-croffle-primary/30"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex-col gap-4">
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
                "Sign Up"
              )}
            </Button>
            
            <p className="text-xs text-center text-gray-500">
              By signing up, you agree to receive marketing communications from us.
              We'll never share your information with third parties.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
