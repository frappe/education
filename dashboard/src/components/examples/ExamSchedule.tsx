import ExamSchedule from "../../pages/exams/ExamSchedule";
import { AppProvider } from "@/context/AppContext";

export default function ExamScheduleExample() {
  return (
    <AppProvider>
      <ExamSchedule />
    </AppProvider>
  );
}
