import DashboardHome from "../../pages/dashboard/DashboardHome";
import { AppProvider } from "@/context/AppContext";

export default function DashboardHomeExample() {
  return (
    <AppProvider>
      <DashboardHome />
    </AppProvider>
  );
}
