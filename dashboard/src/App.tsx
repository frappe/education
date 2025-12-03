import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AdmissionDataProvider } from "@/context/AdmissionDataContext";
import { AppProviders } from "@/providers";
import { AppRoutes } from "@/routes";

/**
 * Main App component with organized provider hierarchy
 * 
 * Provider Structure:
 * - QueryClientProvider (React Query)
 *   - TooltipProvider (UI)
 *     - AppProviders (Frappe, Auth, Website)
 *       - AppProvider (Legacy app context)
 *         - AdmissionDataProvider (Admission context)
 *           - AppRoutes (All routes)
 */
function App() {
  return (
    // <Login />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProviders>
          <AppProvider>
            <AdmissionDataProvider>
              <AppRoutes />
            </AdmissionDataProvider>
          </AppProvider>
          <Toaster />
        </AppProviders>
      </TooltipProvider>
     
    </QueryClientProvider>

  );
}

export default App;


                                                                                                             