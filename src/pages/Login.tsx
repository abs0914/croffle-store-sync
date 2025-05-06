
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function Login() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    try {
      await login(email, password);
    } catch (error) {
      // Error is already handled in the login function
      console.log("Login attempt failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-croffle-background p-4">
      <Card className="w-full max-w-md border-croffle-primary/20">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/lovable-uploads/e4103c2a-e57f-45f0-9999-1567aeda3f3d.png"
              alt="The Croffle Store"
              className="h-24"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-croffle-primary">
            PVOSyncPOS
          </CardTitle>
          <CardDescription className="text-croffle-text">
            Enter your credentials to sign in to your account
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-xs text-croffle-accent"
                >
                  Forgot password?
                </Button>
              </div>
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
          <CardFooter className="flex-col gap-2">
            <Button
              type="submit"
              className="w-full bg-croffle-primary hover:bg-croffle-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Demo accounts: admin@example.com, owner@example.com, manager@example.com, cashier@example.com
              <br />
              Password: password123
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
