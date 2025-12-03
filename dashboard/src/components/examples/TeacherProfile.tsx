import TeacherProfile from "../../pages/teachers/TeacherProfile";
import { AppProvider } from "@/context/AppContext";

export default function TeacherProfileExample() {
  return (
    <AppProvider>
      <TeacherProfile />
    </AppProvider>
  );
}
