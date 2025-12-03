import { type ReactNode } from "react";
import { FrappeAppProvider } from "./FrappeAppProvider";
import { AuthProvider } from "./AuthProvider";
import { WebsiteProvider } from "./WebsiteProvider";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders - Combines all providers in the correct order
 * 
 * Provider hierarchy:
 * 1. FrappeAppProvider - Frappe SDK context
 * 2. AuthProvider - User authentication
 * 3. WebsiteProvider - App/website configuration
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <FrappeAppProvider>
      <AuthProvider>
        <WebsiteProvider>
          {children}
        </WebsiteProvider>
      </AuthProvider>
    </FrappeAppProvider>
  );
}
