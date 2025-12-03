import { Navbar } from "../layout/Navbar";
import { AppProvider } from "@/context/AppContext";

export default function NavbarExample() {
  return (
    <AppProvider>
      <Navbar />
    </AppProvider>
  );
}
