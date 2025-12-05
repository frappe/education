import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Coins } from "lucide-react";
import { format } from "date-fns";
import cautionFeesData from "@/mockData/cautionFees.json";
import { DataTableColumn } from "@/components/common/DataTable";
import { TableCard } from "@/components/common/TableCard";
import { PageHeader } from "@/components/common/PageHeader";

export default function CautionFeeLedger() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    return cautionFeesData.filter((caution: any) => {
      const matchesSearch =
        caution.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        caution.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || caution.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredData, currentPage, pageSize]);

  const statistics = useMemo(() => {
    return {
      totalDeposited: cautionFeesData.reduce((sum: number, c: any) => sum + c.cautionFeeAmount, 0),
      totalRefunded: cautionFeesData
        .filter((c: any) => c.status === "Refunded")
        .reduce((sum: number, c: any) => sum + (c.refundAmount || 0), 0),
      totalHeld: cautionFeesData
        .filter((c: any) => c.status === "Held")
        .reduce((sum: number, c: any) => sum + c.cautionFeeAmount, 0),
      activeCount: cautionFeesData.filter((c: any) => c.status === "Held").length,
      refundedCount: cautionFeesData.filter((c: any) => c.status === "Refunded").length,
    };
  }, []);

  const handleExport = () => {
    const csv = [
      ["Student", "Admission No", "Class", "Deposited Amount", "Status", "Balance"],
      ...filteredData.map((c: any) => [
        c.studentName,
        c.admissionNo,
        c.class,
        c.cautionFeeAmount,
        c.status,
        c.status === "Held" ? c.cautionFeeAmount : 0,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "caution_fee_ledger.csv";
    a.click();
  };

  const columns: DataTableColumn<typeof cautionFeesData[0]>[] = [
    {
      key: "studentName",
      label: "Student Name",
      cellClassName: "font-medium",
    },
    {
      key: "admissionNo",
      label: "Admission No",
    },
    {
      key: "class",
      label: "Class",
    },
    {
      key: "cautionFeeAmount",
      label: "Deposit Amount",
      headerClassName: "text-right",
      cellClassName: "text-right font-semibold",
      render: (value) => `₹${value.toLocaleString("en-IN")}`,
    },
    {
      key: "collectedDate",
      label: "Collection Date",
      render: (value) => format(new Date(value), "dd MMM yyyy"),
    },
    {
      key: "paymentMode",
      label: "Payment Mode",
      render: (value) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={value === "Held" ? "secondary" : "default"}>
          {value}
        </Badge>
      ),
    },
    {
      key: "cautionFeeAmount",
      label: "Balance",
      headerClassName: "text-right",
      cellClassName: "text-right font-bold",
      render: (value, row: any) => (
        row.status === "Held" ? (
          <span className="text-blue-600">₹{value.toLocaleString("en-IN")}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <PageHeader
        title="Caution Fee Ledger"
        description="Complete ledger of caution fee deposits, refunds, and balances"
      />

      {/* Statistics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deposited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-deposited">
              ₹{statistics.totalDeposited.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Refunded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-total-refunded">
              ₹{statistics.totalRefunded.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-held">
              ₹{statistics.totalHeld.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-count">
              {statistics.activeCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Refunded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-refunded-count">
              {statistics.refundedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Export */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div>
              <Label htmlFor="search">Search Student</Label>
              <Input
                id="search"
                placeholder="Name or admission no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2"
                data-testid="input-search"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Held">Held</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExport} data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Caution Fee Ledger Table */}
      <TableCard
        title="Caution Fee Details"
        icon={Coins}
        table={{
          data: paginatedData,
          columns: columns,
          getRowKey: (row: any) => row.id,
          hoverable: true,
          emptyMessage: "No caution fee records found",
          pagination: {
            currentPage,
            pageSize,
            totalItems: filteredData.length,
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
