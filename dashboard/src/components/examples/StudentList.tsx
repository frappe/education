import StudentList from "../../pages/students/StudentList";
import { AppProvider } from "@/context/AppContext";

export default function StudentListExample() {
  return (
    <AppProvider>
      <StudentList />
    </AppProvider>
  );
}
