import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye } from "lucide-react";
import studentsData from "@/mockData/students.json";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DataTableColumn } from "@/components/common/DataTable";
import { TableCard } from "@/components/common/TableCard";

export default function StudentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredStudents = studentsData.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns: DataTableColumn<typeof studentsData[0]>[] = [
    {
      key: "id",
      label: "Student ID",
      cellClassName: "font-medium",
    },
    {
      key: "name",
      label: "Name",
    },
    {
      key: "class",
      label: "Class",
      render: (value) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      key: "rollNo",
      label: "Roll No",
    },
    {
      key: "phone",
      label: "Contact",
      cellClassName: "text-muted-foreground",
    },
    {
      key: "attendance",
      label: "Attendance",
      render: (value) => (
        <Badge variant={value >= 90 ? "default" : "secondary"}>
          {value}%
        </Badge>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: "Students" }
        ]} />
        
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

        <TableCard
          table={{
            data: paginatedStudents,
            columns: columns,
            getRowKey: (row) => row.id,
            actionsColumn: {
              label: "Actions",
              headerClassName: "text-right",
              cellClassName: "text-right",
              render: (student) => (
                <Link to={`/students/${student.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-view-${student.id}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </Link>
              ),
            },
            hoverable: true,
            emptyMessage: "No students found",
            pagination: {
              currentPage,
              pageSize,
              totalItems: filteredStudents.length,
              onPageChange: setCurrentPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setCurrentPage(1);
              },
              pageSizeOptions: [10, 25, 50, 100],
            },
          }}
        />
      </div>
    </DashboardLayout>
  );
}
