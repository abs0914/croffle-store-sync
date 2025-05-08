
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await login(email, password);
      toast.success("Login successful");
      navigate("/");
    } catch (error) {
      // Error is already handled in the login function
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo credentials
  const demoLogins = [
    { role: "Admin", email: "admin@example.com", password: "password123" },
    { role: "Manager", email: "manager@example.com", password: "password123" },
    { role: "Cashier", email: "cashier@example.com", password: "password123" },
  ];

  const fillDemoCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-croffle-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-muted-foreground mb-4">
            Demo accounts (click to autofill):
          </div>
          <div className="grid grid-cols-1 gap-2 w-full">
            {demoLogins.map((demo) => (
              <Button
                key={demo.role}
                variant="outline"
                onClick={() => fillDemoCredentials(demo.email, demo.password)}
                className="w-full justify-start"
              >
                <span className="font-semibold">{demo.role}:</span>
                <span className="ml-2 text-muted-foreground">{demo.email}</span>
              </Button>
            ))}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
