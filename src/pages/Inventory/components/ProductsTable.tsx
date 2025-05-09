
import React from "react";
import { Link } from "react-router-dom";
import { Product } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface ProductsTableProps {
  products: Product[];
  onDeleteProduct?: (product: Product) => void;
}

export const ProductsTable = ({ products, onDeleteProduct }: ProductsTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No products found
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs">
                      No image
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  {product.category?.name || "Uncategorized"}
                </TableCell>
                <TableCell className="text-right">
                  ₱{product.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {product.stock_quantity || product.stockQuantity || 0}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={product.is_active || product.isActive ? "default" : "secondary"}
                    className={
                      product.is_active || product.isActive
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                    }
                  >
                    {product.is_active || product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/inventory/product/${product.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    {onDeleteProduct && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteProduct(product)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
