import { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 bg-background overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
