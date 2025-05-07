
import { useState, useEffect } from "react";
import { Store } from "@/types";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StoreListItem from "./StoreListItem";

interface StoresListProps {
  stores: Store[];
}

export default function StoresList({ stores }: StoresListProps) {
  const [filteredStores, setFilteredStores] = useState<Store[]>(stores);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Filter stores based on search query
    if (searchQuery) {
      const filtered = stores.filter(store => 
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStores(filtered);
    } else {
      setFilteredStores(stores);
    }
  }, [searchQuery, stores]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Stores</CardTitle>
            <CardDescription>
              View and manage all available store locations
            </CardDescription>
          </div>
          
          <Input
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredStores.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No stores found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery ? "Try changing your search query" : "Get started by creating a new store"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.map((store) => (
                <StoreListItem key={store.id} store={store} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
