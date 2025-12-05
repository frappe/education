import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock } from "lucide-react";
import { formatDate } from "@/utils/helpers";
import { DataTableColumn } from "@/components/common/DataTable";
import { TableCard } from "@/components/common/TableCard";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredExams =
    selectedClass === "all"
      ? examSchedule
      : examSchedule.filter((exam) => exam.class === selectedClass);

  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns: DataTableColumn<typeof examSchedule[0]>[] = [
    {
      key: "subject",
      label: "Subject",
      cellClassName: "font-medium",
    },
    {
      key: "class",
      label: "Class",
      render: (value) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      key: "date",
      label: "Date",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {formatDate(value)}
        </div>
      ),
    },
    {
      key: "time",
      label: "Time",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          {value}
        </div>
      ),
    },
    {
      key: "room",
      label: "Room",
    },
    {
      key: "duration",
      label: "Duration",
    },
    {
      key: "maxMarks",
      label: "Max Marks",
    },
  ];

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

        <TableCard
          table={{
            data: paginatedExams,
            columns: columns,
            getRowKey: (row) => row.id,
            hoverable: true,
            emptyMessage: "No exams scheduled",
            pagination: {
              currentPage,
              pageSize,
              totalItems: filteredExams.length,
              onPageChange: setCurrentPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setCurrentPage(1);
              },
              pageSizeOptions: [5, 10, 20, 50],
            },
          }}
        />
      </div>
    </DashboardLayout>
  );
}
