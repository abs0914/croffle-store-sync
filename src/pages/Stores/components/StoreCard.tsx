
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Store } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { 
  Edit, 
  QrCode, 
  Settings, 
  Trash,
  Store as StoreIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

interface StoreCardProps {
  store: Store;
  onDelete: (storeId: string) => void;
}

export const StoreCard = ({ store, onDelete }: StoreCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleDeleteClick = () => {
    onDelete(store.id);
  };

  return (
    <Card className="shadow-sm hover:shadow transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-gray-100 p-2 hidden sm:flex">
              <StoreIcon className="h-5 w-5 text-croffle-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{store.name}</CardTitle>
              <CardDescription className="mt-1">{store.address}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/stores/${store.id}`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/stores/${store.id}/settings`)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/stores/${store.id}/qr`)}>
                <QrCode className="mr-2 h-4 w-4" />
                QR Code
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={handleDeleteClick}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
          {store.phone && (
            <div className="text-sm">
              <span className="font-medium">Phone:</span> {store.phone}
            </div>
          )}
          {store.email && (
            <div className="text-sm">
              <span className="font-medium">Email:</span> {store.email}
            </div>
          )}
          {store.tax_id && (
            <div className="text-sm">
              <span className="font-medium">Tax ID:</span> {store.tax_id}
            </div>
          )}
          <div className="text-sm">
            <span className="font-medium">Status:</span>
            <span className={store.is_active ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
              {store.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex flex-col sm:flex-row justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => navigate(`/stores/${store.id}`)}
        >
          View Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => navigate(`/stores/${store.id}/qr`)}
        >
          <QrCode className="mr-1 h-4 w-4" /> Generate QR
        </Button>
      </CardFooter>
    </Card>
  );
};
