import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye } from "lucide-react";
import teachersData from "@/mockData/teachers.json";
import { DataTableColumn } from "@/components/common/DataTable";
import { TableCard } from "@/components/common/TableCard";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function TeacherList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTeachers = teachersData.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns: DataTableColumn<typeof teachersData[0]>[] = [
    {
      key: "id",
      label: "Teacher ID",
      cellClassName: "font-medium",
    },
    {
      key: "name",
      label: "Name",
    },
    {
      key: "subject",
      label: "Subject",
      render: (value) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      key: "department",
      label: "Department",
    },
    {
      key: "phone",
      label: "Contact",
      cellClassName: "text-muted-foreground",
    },
    {
      key: "experience",
      label: "Experience",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Teachers" }]} />
        
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

        <TableCard
          table={{
            data: paginatedTeachers,
            columns: columns,
            getRowKey: (row) => row.id,
            actionsColumn: {
              label: "Actions",
              headerClassName: "text-right",
              cellClassName: "text-right",
              render: (teacher) => (
                <Link to={`/teachers/${teacher.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-view-${teacher.id}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </Link>
              ),
            },
            hoverable: true,
            emptyMessage: "No teachers found",
            pagination: {
              currentPage,
              pageSize,
              totalItems: filteredTeachers.length,
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
