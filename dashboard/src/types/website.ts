export interface AppInfo {
  app_name: string;
  app_title: string;
  app_version: string;
  app_description?: string;
  app_logo?: string;
  school_name?: string;
}

export interface WebsiteContextType {
  appInfo: AppInfo | null;
  isLoading: boolean;
  refetch: () => void;
}
