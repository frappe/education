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
import teachersData from "@/mockData/teachers.json";

export default function TeacherList() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeachers = teachersData.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-teachers-title">
              Teachers
            </h1>
            <p className="text-muted-foreground">
              Manage teacher information and assignments
            </p>
          </div>
          <Button data-testid="button-add-teacher">
            <Plus className="w-4 h-4 mr-2" />
            Add Teacher
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-teachers"
            />
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id} data-testid={`row-teacher-${teacher.id}`}>
                  <TableCell className="font-medium">{teacher.id}</TableCell>
                  <TableCell>{teacher.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{teacher.subject}</Badge>
                  </TableCell>
                  <TableCell>{teacher.department}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {teacher.phone}
                  </TableCell>
                  <TableCell>{teacher.experience}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/teachers/${teacher.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-view-${teacher.id}`}
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
