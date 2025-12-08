import { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
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
  const { user: authUser, isLoading: authLoading, logout: frappeLogout } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Map Frappe user to app User type
  const user: User | null = authUser ? {
    id: authUser.name || "",
    username: authUser.name || "",
    name: authUser.full_name || authUser.name || "",
    email: authUser.email || "",
    role: "Admin" as UserRole, // Must match ROLES.ADMIN = "Admin"
  } : null;

  const setUser = (newUser: User | null) => {
    // This is a no-op since user is managed by AuthProvider
    // Kept for API compatibility
    console.log("setUser called but user is managed by AuthProvider:", newUser);
  };

  const logout = async () => {
    try {
      await frappeLogout();
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const retryAuth = () => {
    // Reload the page to retry authentication
    window.location.reload();
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
      isLoading: authLoading,
      isAuthError: false, // AuthProvider handles errors internally
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
