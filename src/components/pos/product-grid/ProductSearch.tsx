
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ProductSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function ProductSearch({ searchTerm, setSearchTerm }: ProductSearchProps) {
  return (
    <div className="relative w-full max-w-sm md:max-w-md">
      <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
      <Input
        type="search"
        placeholder="Search for products..."
        className="pl-10 md:pl-12 pr-4 py-2.5 md:py-3 text-sm md:text-base border-gray-200 focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-lg md:rounded-xl bg-gray-50 shadow-none transition-all duration-200 hover:bg-white focus:bg-white touch-manipulation"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
}
