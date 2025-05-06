
import { Input } from "@/components/ui/input";

interface SearchUsersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchUsers({ searchQuery, onSearchChange }: SearchUsersProps) {
  return (
    <Input
      placeholder="Search users..."
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      className="mb-4"
    />
  );
}
