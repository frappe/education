import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Receipt } from "lucide-react";
import feesData from "@/mockData/fees.json";
import { formatCurrency, formatDate } from "@/utils/helpers";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DataTableColumn } from "@/components/common/DataTable";
import { TableCard } from "@/components/common/TableCard";

export default function FeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredFees = feesData.filter((fee) => {
    const matchesSearch =
      fee.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || fee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedFees = filteredFees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const columns: DataTableColumn<typeof feesData[0]>[] = [
    {
      key: "id",
      label: "Fee ID",
      cellClassName: "font-medium",
    },
    {
      key: "studentName",
      label: "Student Name",
    },
    {
      key: "class",
      label: "Class",
      render: (value) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      key: "amount",
      label: "Total Amount",
      render: (value) => formatCurrency(value),
    },
    {
      key: "paid",
      label: "Paid",
      render: (value) => <span className="text-chart-3">{formatCurrency(value)}</span>,
    },
    {
      key: "due",
      label: "Due",
      render: (value) => (
        <span className={value > 0 ? "text-destructive" : ""}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      render: (value) => <span className="text-muted-foreground">{formatDate(value)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={getStatusVariant(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Fees", href: "/fees" },
        { label: "Management" }
      ]} />
      
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-fees-title">
              Fee Management
            </h1>
            <p className="text-muted-foreground">
              Track and manage student fee payments
            </p>
          </div>
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-fees"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TableCard
          table={{
            data: paginatedFees,
            columns: columns,
            getRowKey: (row) => row.id,
            actionsColumn: {
              label: "Actions",
              headerClassName: "text-right",
              cellClassName: "text-right",
              render: (fee) => (
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`button-receipt-${fee.id}`}
                >
                  <Receipt className="w-4 h-4 mr-1" />
                  Receipt
                </Button>
              ),
            },
            hoverable: true,
            emptyMessage: "No fee records found",
            pagination: {
              currentPage,
              pageSize,
              totalItems: filteredFees.length,
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
  );
}
