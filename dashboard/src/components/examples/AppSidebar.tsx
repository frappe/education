import { AppSidebar } from "../layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppSidebarExample() {
  return (
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
}
