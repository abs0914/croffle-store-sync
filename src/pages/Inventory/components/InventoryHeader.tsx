
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation, Link } from "react-router-dom";

interface InventoryHeaderProps {
  title: string;
  description?: string;
}

const InventoryHeader = ({ title, description }: InventoryHeaderProps) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-croffle-primary">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-1">{description}</p>
      )}
      
      <div className="mt-6">
        <div className="flex space-x-2 mb-2">
          <Button
            variant={isActive("/inventory") ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link to="/inventory">Products</Link>
          </Button>
          <Button
            variant={isActive("/inventory/categories") ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link to="/inventory/categories">Categories</Link>
          </Button>
          <Button
            variant={isActive("/inventory/ingredients") ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link to="/inventory/ingredients">Ingredients</Link>
          </Button>
          <Button
            variant={isActive("/inventory/history") ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link to="/inventory/history">History</Link>
          </Button>
        </div>
      </div>
      <Separator className="mt-2 bg-croffle-primary/20" />
    </div>
  );
};

export default InventoryHeader;
