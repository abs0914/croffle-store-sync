
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-croffle-background p-4">
      <img
        src="/lovable-uploads/e4103c2a-e57f-45f0-9999-1567aeda3f3d.png"
        alt="The Croffle Store"
        className="h-24 mb-6"
      />
      <h1 className="text-6xl font-bold text-croffle-primary">404</h1>
      <h2 className="text-2xl font-semibold text-croffle-text mt-4">Page Not Found</h2>
      <p className="text-croffle-text/70 mt-2 mb-6 text-center">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="bg-croffle-primary hover:bg-croffle-primary/90">
        <Link to="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
