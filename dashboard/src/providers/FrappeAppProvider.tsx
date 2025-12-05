import { type PropsWithChildren } from "react";
import { FrappeProvider } from "frappe-react-sdk";
import { toast } from "sonner";

/**
 * FrappeAppProvider - Wraps the app with Frappe React SDK
 * Provides Frappe context for API calls, authentication, and real-time updates
 */
export function FrappeAppProvider({ children }: PropsWithChildren) {
  const siteName = import.meta.env.VITE_FRAPPE_SITE_NAME || window.location.hostname;
  const socketPort = import.meta.env.VITE_SOCKET_PORT;
  
  return (
    <FrappeProvider
      url={import.meta.env.VITE_FRAPPE_URL || ""}
      siteName={siteName}
      socketPort={socketPort}
      enableSocket={Boolean(socketPort)}
      swrConfig={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        onError: async (error: any) => {
          console.error("Frappe API Error:", error);
          
          if (error?.httpStatus === 401 || error?.httpStatusCode === 401) {
            toast.error("Session expired. Please log in again.");
          }
          
          if (error?.httpStatus === 403) {
            toast.error("You don't have permission to perform this action.");
          }
          
          if (error?.httpStatus >= 500) {
            toast.error("Server error. Please try again later.");
          }
        },
      }}
    >
      {children}
    </FrappeProvider>
  );
}