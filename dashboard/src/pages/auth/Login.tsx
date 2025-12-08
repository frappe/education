import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from "@/utils/constants";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(username, password);
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${username}`,
      });
      
      // Give the auth state time to update, then navigate
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
        // Force a page reload to ensure auth state is fresh
        window.location.href = "/dashboard";
      }, 100);
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-foreground rounded-md flex items-center justify-center text-primary text-xl font-bold">
            S
          </div>
          <span className="text-xl font-semibold">{APP_NAME}</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Manage Your School
            <br />
            Operations Efficiently
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Streamline admissions, track attendance, manage fees, and monitor student progress all in one comprehensive platform.
          </p>
        </div>

        <div className="text-sm text-primary-foreground/60">
          © 2024 Sanskar School. All rights reserved.
        </div>
      </div>
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex lg:hidden justify-center mb-6">
              <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xl font-bold">
                S
              </div>
            </div>
            <h2 className="text-3xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground mt-2">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                  data-testid="input-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="rounded-md p-4 bg-[#0f304817]">
              <p className="text-sm font-medium mb-2">Frappe Credentials:</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Use your Frappe login credentials</p>
                <p>Default: Administrator / your admin password</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
