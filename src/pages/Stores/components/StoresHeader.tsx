
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

interface StoresHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const StoresHeader = ({ searchQuery, setSearchQuery }: StoresHeaderProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-croffle-primary">Store Management</h1>
        <Button
          className="bg-croffle-primary hover:bg-croffle-primary/90 w-full md:w-auto"
          onClick={() => navigate('/stores/new')}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Store
        </Button>
      </div>

      <div className="mb-6">
        <Input
          type="search"
          placeholder={isMobile ? "Search stores..." : "Search stores by name, address, email or phone..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-lg"
        />
      </div>
    </>
  );
};
