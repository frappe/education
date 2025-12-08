import { type ReactNode, createContext, useContext, useState, useEffect } from "react";
import { useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import type { User, AuthContextType } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Manages user authentication state
 * Uses Frappe React SDK for authentication
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { currentUser, isLoading: authLoading, login: frappeLogin, logout: frappeLogout } = useFrappeAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch additional user details (optional - will work without it)
  const { data: userData } = useFrappeGetCall<{ message: User }>(
    "education.education.api.get_user_info",
    undefined,
    currentUser ? undefined : null,
    {
      // Don't block on this call
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  useEffect(() => {
    console.log('Auth State:', { currentUser, authLoading, hasUserData: !!userData });
    
    // Set loading state
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    // If we have currentUser from Frappe
    if (currentUser) {
      // Use additional user data if available, otherwise use basic Frappe user info
      if (userData?.message) {
        console.log('Setting user from API:', userData.message);
        setUser(userData.message);
      } else {
        // Create basic user object from Frappe's currentUser
        console.log('Setting basic user from currentUser:', currentUser);
        setUser({
          name: currentUser,
          email: currentUser,
          roles: [],
        } as User);
      }
      setIsLoading(false);
    } else {
      // No user logged in
      console.log('No user logged in');
      setUser(null);
      setIsLoading(false);
    }
  }, [currentUser, userData, authLoading]);

  const login = async (username: string, password: string) => {
    try {
      await frappeLogin({ username, password });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await frappeLogout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
