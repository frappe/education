import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye } from "lucide-react";
import studentsData from "@/mockData/students.json";

export default function StudentList() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = studentsData.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-students-title">
              Students
            </h1>
            <p className="text-muted-foreground">
              Manage student information and records
            </p>
          </div>
          <Button data-testid="button-add-student">
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-students"
            />
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                  <TableCell className="font-medium">{student.id}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{student.class}</Badge>
                  </TableCell>
                  <TableCell>{student.rollNo}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.phone}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={student.attendance >= 90 ? "default" : "secondary"}
                    >
                      {student.attendance}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/students/${student.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-view-${student.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
