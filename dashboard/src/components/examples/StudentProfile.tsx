import StudentProfile from "../../pages/students/StudentProfile";
import { AppProvider } from "@/context/AppContext";

export default function StudentProfileExample() {
  return (
    <AppProvider>
      <StudentProfile />
    </AppProvider>
  );
}
