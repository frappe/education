import { DashboardLayout } from "../../layouts/DashboardLayout";
import { AppProvider } from "@/context/AppContext";

export default function DashboardLayoutExample() {
  return (
    <AppProvider>
      <DashboardLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Dashboard Content</h1>
          <p className="text-muted-foreground">
            This is where page content will be rendered.
          </p>
        </div>
      </DashboardLayout>
    </AppProvider>
  );
}
