
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCustomerForm } from "./hooks/useCustomerForm";
import { LoadingState } from "./components/CustomerForm/LoadingState";
import { ErrorState } from "./components/CustomerForm/ErrorState";
import { SuccessState } from "./components/CustomerForm/SuccessState";
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CustomerForm() {
  const { storeId } = useParams();
  
  const {
    store,
    isLoading,
    isSubmitting,
    isSuccess,
    error,
    fetchStore,
    handleSubmit: submitForm,
    setIsSuccess
  } = useCustomerForm({ storeId });

  // Initialize react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    submitForm({
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      address: values.address
    });
  };
  
  useEffect(() => {
    if (storeId) {
      fetchStore();
    }
  }, [storeId, fetchStore]);
  
  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }
  
  // Error state
  if (error || !store) {
    return <ErrorState errorMessage={error || "Failed to load store information"} />;
  }
  
  // Success state
  if (isSuccess) {
    return <SuccessState store={store} onRegisterAnother={() => setIsSuccess(false)} />;
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Your email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator className="my-4" />
              
              <Button 
                type="submit" 
                className="w-full" 
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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
