
import React, { memo, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface OptimizedProductSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

const OptimizedProductSearch = memo(function OptimizedProductSearch({
  searchTerm,
  setSearchTerm,
  placeholder = "Search products...",
  debounceMs = 300
}: OptimizedProductSearchProps) {
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  // Only trigger parent updates when debounced value changes
  React.useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setSearchTerm(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, searchTerm, setSearchTerm]);

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleInputChange}
        className="pl-10"
      />
    </div>
  );
});

export default OptimizedProductSearch;
