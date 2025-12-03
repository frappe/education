import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { UserRole, hasPermission, RolePermissions } from "@/types/roles";
import type { User } from "@shared/schema";

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthError: boolean;
  retryAuth: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  hasPermission: (permission: keyof RolePermissions) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Fetch current user from session on app load
  // Only return null for 401, throw for other errors to preserve auth state during outages
  const { data, isLoading, isError, refetch } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      // Return null only for 401 (genuinely not authenticated)
      if (res.status === 401) {
        return null;
      }

      // Throw for other errors to preserve cached user during server issues
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      return await res.json();
    },
  });

  // Update user state from successful query data only
  useEffect(() => {
    // Only update on successful queries (not during errors)
    if (!isError) {
      if (data?.user) {
        setUser(data.user);
      } else if (data === null) {
        // Successful query returned null (401 - not authenticated)
        setUser(null);
      }
    }
  }, [data, isError]);

  const retryAuth = () => {
    refetch();
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      // Invalidate auth query to clear cached data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const checkPermission = (permission: keyof RolePermissions): boolean => {
    // Allow all permissions when no user (for development without backend)
    if (!user) return true;
    return hasPermission(user.role as UserRole, permission);
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      setUser, 
      logout,
      isLoading,
      isAuthError: isError,
      retryAuth,
      theme, 
      toggleTheme, 
      hasPermission: checkPermission 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
