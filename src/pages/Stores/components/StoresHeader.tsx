
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StoresHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const StoresHeader = ({ searchQuery, setSearchQuery }: StoresHeaderProps) => {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-croffle-primary">Store Management</h1>
        <Button
          className="bg-croffle-primary hover:bg-croffle-primary/90"
          onClick={() => navigate('/stores/new')}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Store
        </Button>
      </div>

      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search stores by name, address, email or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-lg"
        />
      </div>
    </>
  );
};
