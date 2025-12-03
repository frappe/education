import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import type { AppInfo, WebsiteContextType } from "../types/website";

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

interface WebsiteProviderProps {
  children: ReactNode;
}

/**
 * WebsiteProvider - Fetches and provides website/app configuration
 * Gets app details from Frappe backend
 */
export function WebsiteProvider({ children }: WebsiteProviderProps) {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  // Fetch app configuration from Frappe
  const { data, isLoading, mutate } = useFrappeGetCall<{ message: AppInfo }>(
    "education.education.api.get_school_abbr_logo",
    undefined,
    undefined,
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (data?.message) {
      setAppInfo({
        app_name: "Education",
        app_title: data.message.school_name || "School Management System",
        app_version: "1.0.0",
        app_logo: data.message.app_logo,
        school_name: data.message.school_name,
      });
    }
  }, [data]);

  const value: WebsiteContextType = {
    appInfo,
    isLoading,
    refetch: mutate,
  };

  return <WebsiteContext.Provider value={value}>{children}</WebsiteContext.Provider>;
}

/**
 * Hook to use website context
 */
export function useWebsite() {
  const context = useContext(WebsiteContext);
  if (context === undefined) {
    throw new Error("useWebsite must be used within a WebsiteProvider");
  }
  return context;
}
