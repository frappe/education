import TeacherList from "../../pages/teachers/TeacherList";
import { AppProvider } from "@/context/AppContext";

export default function TeacherListExample() {
  return (
    <AppProvider>
      <TeacherList />
    </AppProvider>
  );
}
