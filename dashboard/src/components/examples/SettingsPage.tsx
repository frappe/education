import SettingsPage from "../../pages/settings/SettingsPage";
import { AppProvider } from "@/context/AppContext";

export default function SettingsPageExample() {
  return (
    <AppProvider>
      <SettingsPage />
    </AppProvider>
  );
}
