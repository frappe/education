import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock } from "lucide-react";
import { formatDate } from "@/utils/helpers";

const examSchedule = [
  {
    id: "EX001",
    subject: "Mathematics",
    class: "10-A",
    date: "2024-12-15",
    time: "09:00 AM - 12:00 PM",
    room: "Room 101",
    maxMarks: 100,
    duration: "3 hours",
  },
  {
    id: "EX002",
    subject: "Physics",
    class: "10-A",
    date: "2024-12-17",
    time: "09:00 AM - 12:00 PM",
    room: "Room 102",
    maxMarks: 100,
    duration: "3 hours",
  },
  {
    id: "EX003",
    subject: "Chemistry",
    class: "10-A",
    date: "2024-12-19",
    time: "09:00 AM - 12:00 PM",
    room: "Room 103",
    maxMarks: 100,
    duration: "3 hours",
  },
  {
    id: "EX004",
    subject: "English",
    class: "9-B",
    date: "2024-12-16",
    time: "02:00 PM - 05:00 PM",
    room: "Room 201",
    maxMarks: 100,
    duration: "3 hours",
  },
  {
    id: "EX005",
    subject: "Computer Science",
    class: "8-C",
    date: "2024-12-18",
    time: "02:00 PM - 04:00 PM",
    room: "Lab 1",
    maxMarks: 50,
    duration: "2 hours",
  },
];

export default function ExamSchedule() {
  const [selectedClass, setSelectedClass] = useState("all");

  const filteredExams =
    selectedClass === "all"
      ? examSchedule
      : examSchedule.filter((exam) => exam.class === selectedClass);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-exams-title">
              Exam Schedule
            </h1>
            <p className="text-muted-foreground">
              Manage exam schedules and timetables
            </p>
          </div>
          <Button data-testid="button-add-exam">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Exam
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={() => setSelectedClass("all")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                All Exams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{examSchedule.length}</div>
            </CardContent>
          </Card>
          <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={() => setSelectedClass("10-A")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Class 10-A
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {examSchedule.filter((e) => e.class === "10-A").length}
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={() => setSelectedClass("9-B")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Class 9-B
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {examSchedule.filter((e) => e.class === "9-B").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max Marks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.map((exam) => (
                <TableRow key={exam.id} data-testid={`row-exam-${exam.id}`}>
                  <TableCell className="font-medium">{exam.subject}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{exam.class}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {formatDate(exam.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {exam.time}
                    </div>
                  </TableCell>
                  <TableCell>{exam.room}</TableCell>
                  <TableCell>{exam.duration}</TableCell>
                  <TableCell>{exam.maxMarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
