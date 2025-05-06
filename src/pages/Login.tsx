
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success("Login successful!");
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-croffle-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center mb-8">
          <img 
            src="/lovable-uploads/e4103c2a-e57f-45f0-9999-1567aeda3f3d.png" 
            alt="The Croffle Store" 
            className="h-32 mb-6" 
          />
          <h2 className="text-2xl font-bold text-center text-croffle-primary">
            PVOSyncPOS
          </h2>
          <p className="text-croffle-text/70 text-sm mt-2">
            Point of Sale System for The Croffle Store
          </p>
        </div>

        <Card className="border-croffle-primary/20">
          <CardHeader>
            <CardTitle className="text-croffle-primary">Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the POS system
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-croffle-primary/30 focus-visible:ring-croffle-accent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-croffle-primary/30 focus-visible:ring-croffle-accent"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-croffle-primary hover:bg-croffle-primary/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center text-sm text-croffle-text/70 mt-4">
          <p>For demo purposes, you can login with any email and password.</p>
        </div>
      </div>
    </div>
  );
}
