
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from "@/types";

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export const SearchFilters = ({
  searchTerm,
  onSearchChange,
  categories,
  activeCategory,
  onCategoryChange,
}: SearchFiltersProps) => {
  return (
    <div className="flex gap-4 flex-wrap items-center">
      <div className="relative flex-1 min-w-[250px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={activeCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
