import { useState } from "react";
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

export default function FeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredFees = feesData.filter((fee) => {
    const matchesSearch =
      fee.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || fee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
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

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fee ID</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFees.map((fee) => (
                <TableRow key={fee.id} data-testid={`row-fee-${fee.id}`}>
                  <TableCell className="font-medium">{fee.id}</TableCell>
                  <TableCell>{fee.studentName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{fee.class}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(fee.amount)}</TableCell>
                  <TableCell className="text-chart-3">
                    {formatCurrency(fee.paid)}
                  </TableCell>
                  <TableCell className={fee.due > 0 ? "text-destructive" : ""}>
                    {formatCurrency(fee.due)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(fee.dueDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(fee.status)}>
                      {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`button-receipt-${fee.id}`}
                    >
                      <Receipt className="w-4 h-4 mr-1" />
                      Receipt
                    </Button>
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
