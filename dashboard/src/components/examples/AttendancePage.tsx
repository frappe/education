import AttendancePage from "../../pages/attendance/AttendancePage";
import { AppProvider } from "@/context/AppContext";

export default function AttendancePageExample() {
  return (
    <AppProvider>
      <AttendancePage />
    </AppProvider>
  );
}
