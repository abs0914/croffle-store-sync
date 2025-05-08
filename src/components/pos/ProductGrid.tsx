
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { Product, Category } from "@/types";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  addItemToCart: (product: Product) => void;
  isShiftActive: boolean;
  isLoading: boolean;
}

export default function ProductGrid({
  products,
  categories,
  activeCategory,
  setActiveCategory,
  addItemToCart,
  isShiftActive,
  isLoading
}: ProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === "all" || product.categoryId === activeCategory;
    const matchesSearch = !searchTerm || 
                          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="pl-8 border-croffle-primary/30 focus-visible:ring-croffle-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="mb-4 bg-croffle-background">
          <TabsTrigger value="all" className="data-[state=active]:bg-croffle-primary data-[state=active]:text-white">
            All
          </TabsTrigger>
          {categories.map(category => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="data-[state=active]:bg-croffle-primary data-[state=active]:text-white"
            >
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={activeCategory} className="mt-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-32 p-2 flex flex-col items-center justify-between text-left border-croffle-primary/20 hover:bg-croffle-background hover:border-croffle-primary"
                  onClick={() => addItemToCart(product)}
                  disabled={!isShiftActive}
                >
                  {product.image ? (
                    <div className="w-full h-16 bg-gray-100 rounded-md overflow-hidden mb-2">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-16 bg-croffle-background rounded-md flex items-center justify-center mb-2">
                      <span className="text-croffle-primary">No image</span>
                    </div>
                  )}
                  <div className="w-full">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-croffle-primary font-bold">₱{product.price.toFixed(2)}</p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
