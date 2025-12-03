import { type ReactNode } from "react";
import { FrappeProvider } from "frappe-react-sdk";

interface FrappeAppProviderProps {
  children: ReactNode;
}

/**
 * FrappeAppProvider - Wraps the app with Frappe React SDK
 * Provides Frappe context for API calls and authentication
 */
export function FrappeAppProvider({ children }: FrappeAppProviderProps) {
  const siteName = import.meta.env.VITE_FRAPPE_SITE_NAME || window.location.hostname;
  
  return (
    <FrappeProvider
      url={import.meta.env.VITE_FRAPPE_URL || ""}
      siteName={siteName}
      socketPort={import.meta.env.VITE_SOCKET_PORT}
    >
      {children}
    </FrappeProvider>
  );
}
