
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Users, Settings } from "lucide-react";
import { Link } from "react-router-dom";

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
  return (
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
  );
}
