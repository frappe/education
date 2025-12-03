import FeeManagement from "../../pages/fees/FeeManagement";
import { AppProvider } from "@/context/AppContext";

export default function FeeManagementExample() {
  return (
    <AppProvider>
      <FeeManagement />
    </AppProvider>
  );
}
