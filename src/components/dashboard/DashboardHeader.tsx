
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function DashboardHeader() {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold text-croffle-primary">Dashboard</h1>
      <Button asChild className="bg-croffle-accent hover:bg-croffle-accent/90">
        <Link to="/pos">Start POS Shift</Link>
      </Button>
    </div>
  );
}
