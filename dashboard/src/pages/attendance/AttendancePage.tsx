import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download } from "lucide-react";
import studentsData from "@/mockData/students.json";

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState("10-A");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>(
    {}
  );

  const filteredStudents = studentsData.filter(
    (student) => student.class === selectedClass
  );

  const toggleAttendance = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  };

  const handleSubmit = () => {
    console.log("Attendance submitted:", { selectedClass, selectedDate, attendance });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-attendance-title">
              Attendance
            </h1>
            <p className="text-muted-foreground">
              Mark and manage student attendance
            </p>
          </div>
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger data-testid="select-class">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10-A">Class 10-A</SelectItem>
                    <SelectItem value="9-B">Class 9-B</SelectItem>
                    <SelectItem value="8-C">Class 8-C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="input-date"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => {
                const status = attendance[student.id] || "absent";
                return (
                  <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                    <TableCell className="font-medium">{student.rollNo}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={status === "present" ? "default" : "secondary"}
                      >
                        {status === "present" ? "Present" : "Absent"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={status === "present" ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleAttendance(student.id)}
                        data-testid={`button-toggle-${student.id}`}
                      >
                        {status === "present" ? "Mark Absent" : "Mark Present"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSubmit} data-testid="button-submit-attendance">
            Submit Attendance
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
