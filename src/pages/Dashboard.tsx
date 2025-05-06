
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/contexts/StoreContext";
import { CreditCard, Package, Users, BarChart4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { currentStore } = useStore();
  
  // Mock statistics data
  const stats = [
    {
      title: "Daily Sales",
      value: "₱12,500",
      description: "Today's total revenue",
      icon: CreditCard,
      color: "text-blue-500",
      link: "/sales",
    },
    {
      title: "Products",
      value: "68",
      description: "Active inventory items",
      icon: Package,
      color: "text-green-500",
      link: "/inventory",
    },
    {
      title: "Customers",
      value: "145",
      description: "Registered customers",
      icon: Users,
      color: "text-purple-500",
      link: "/customers",
    },
    {
      title: "Best Seller",
      value: "Classic Croffle",
      description: "Most popular product",
      icon: BarChart4,
      color: "text-orange-500",
      link: "/reports",
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-croffle-primary">Dashboard</h1>
        <Button asChild className="bg-croffle-accent hover:bg-croffle-accent/90">
          <Link to="/pos">Start POS Shift</Link>
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-croffle-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 border-croffle-primary/20">
          <CardHeader>
            <CardTitle className="text-croffle-primary">Quick Access</CardTitle>
            <CardDescription>Frequently used actions and features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-24 flex flex-col gap-2 border-croffle-primary/20" asChild>
                <Link to="/pos">
                  <ShoppingCart className="h-6 w-6 text-croffle-accent" />
                  <span>New Sale</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 border-croffle-primary/20" asChild>
                <Link to="/inventory">
                  <Package className="h-6 w-6 text-croffle-primary" />
                  <span>Inventory</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 border-croffle-primary/20" asChild>
                <Link to="/reports">
                  <FileText className="h-6 w-6 text-green-500" />
                  <span>X-Reading</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 border-croffle-primary/20" asChild>
                <Link to="/reports/z-reading">
                  <FileText className="h-6 w-6 text-red-500" />
                  <span>Z-Reading</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 border-croffle-primary/20" asChild>
                <Link to="/customers">
                  <Users className="h-6 w-6 text-blue-500" />
                  <span>Customers</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 border-croffle-primary/20" asChild>
                <Link to="/settings">
                  <Settings className="h-6 w-6 text-gray-500" />
                  <span>Settings</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-croffle-primary/20">
          <CardHeader>
            <CardTitle className="text-croffle-primary">Store Information</CardTitle>
            <CardDescription>Current store details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStore ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Store Name</p>
                  <p className="font-medium">{currentStore.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="font-medium">{currentStore.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <p className="font-medium">{currentStore.phone}</p>
                  <p className="font-medium text-sm">{currentStore.email}</p>
                </div>
                {currentStore.taxId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tax ID</p>
                    <p className="font-medium">{currentStore.taxId}</p>
                  </div>
                )}
              </>
            ) : (
              <p>No store selected</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ShoppingCart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}

function FileText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}

function Settings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
