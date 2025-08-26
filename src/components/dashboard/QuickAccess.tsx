
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Users, Settings, FileBarChart, Receipt, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { checkRouteAccess } from "@/contexts/auth/role-utils";

// Icon components
export function ShoppingCart(props: React.SVGProps<SVGSVGElement>) {
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

export function FileText(props: React.SVGProps<SVGSVGElement>) {
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

export function QuickAccess() {
  const { user } = useAuth();

  // Phase 5: Define quick access items based on user role
  const quickAccessItems = [
    {
      to: "/pos",
      icon: ShoppingCart,
      label: "New Sale",
      color: "text-croffle-accent",
      roles: ['admin', 'owner', 'manager', 'cashier']
    },
    {
      to: "/inventory",
      icon: Package,
      label: "Inventory",
      color: "text-croffle-primary",
      roles: ['admin', 'owner', 'manager']
    },
    {
      to: "/reports?type=x_reading",
      icon: Receipt,
      label: "X-Reading",
      color: "text-green-500",
      roles: ['admin', 'owner', 'manager']
    },
    {
      to: "/reports?type=z_reading",
      icon: FileCheck,
      label: "Z-Reading",
      color: "text-red-500",
      roles: ['admin', 'owner', 'manager']
    },
    {
      to: "/customers",
      icon: Users,
      label: "Customers",
      color: "text-blue-500",
      roles: ['admin', 'owner', 'manager', 'cashier']
    },
    {
      to: "/reports",
      icon: FileBarChart,
      label: "All Reports",
      color: "text-purple-500",
      roles: ['admin', 'owner', 'manager']
    }
  ];

  // Filter items based on user role and route access
  const filteredItems = quickAccessItems.filter(item => {
    if (!user?.role) return false;
    
    // Check if user role is in allowed roles
    const hasRoleAccess = item.roles.includes(user.role);
    
    // Check route-specific access
    const route = item.to.split('?')[0]; // Remove query params for route check
    const hasRouteAccess = checkRouteAccess(user.role, route);
    
    return hasRoleAccess && hasRouteAccess;
  });

  return (
    <Card className="md:col-span-2 border-croffle-primary/20">
      <CardHeader>
        <CardTitle className="text-croffle-primary">Quick Access</CardTitle>
        <CardDescription>Frequently used actions and features</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredItems.map((item, index) => (
            <Button 
              key={index}
              variant="outline" 
              className="h-24 flex flex-col gap-2 border-croffle-primary/20" 
              asChild
            >
              <Link to={item.to}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
                <span>{item.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
