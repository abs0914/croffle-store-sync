
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types";

interface CustomerFormProps {
  initialData?: Partial<Customer>;
  onSubmit: (data: Omit<Customer, "id"> & { id?: string }) => void;
  onBack: () => void;
}

export default function CustomerForm({ initialData, onSubmit, onBack }: CustomerFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<Omit<Customer, "id"> & { id?: string }>({
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      address: initialData?.address || ""
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
        <Input 
          id="name"
          {...register("name", { required: "Name is required" })}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
        <Input 
          id="phone"
          {...register("phone", { required: "Phone is required" })}
        />
        {errors.phone && (
          <p className="text-sm text-red-500">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email"
          type="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input 
          id="address"
          {...register("address")}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button 
          type="button"
          variant="outline"
          onClick={onBack}
        >
          Back to Search
        </Button>
        <Button type="submit">
          Save Customer
        </Button>
      </div>
    </form>
  );
}
