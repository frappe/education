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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Coins } from "lucide-react";
import { format } from "date-fns";
import cautionFeesData from "@/mockData/cautionFees.json";

export default function CautionFeeLedger() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredData = useMemo(() => {
    return cautionFeesData.filter((caution: any) => {
      const matchesSearch =
        caution.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        caution.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || caution.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

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

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif font-semibold text-foreground" data-testid="text-page-title">
          Caution Fee Ledger
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Complete ledger of caution fee deposits, refunds, and balances
        </p>
      </div>

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Caution Fee Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Deposit Amount</TableHead>
                  <TableHead>Collection Date</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((caution: any) => (
                  <TableRow key={caution.id}>
                    <TableCell className="font-medium" data-testid={`cell-name-${caution.id}`}>
                      {caution.studentName}
                    </TableCell>
                    <TableCell data-testid={`cell-admission-${caution.id}`}>
                      {caution.admissionNo}
                    </TableCell>
                    <TableCell>{caution.class}</TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`cell-amount-${caution.id}`}>
                      ₹{caution.cautionFeeAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell data-testid={`cell-date-${caution.id}`}>
                      {format(new Date(caution.collectedDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`cell-mode-${caution.id}`}>
                        {caution.paymentMode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={caution.status === "Held" ? "secondary" : "default"}
                        data-testid={`cell-status-${caution.id}`}
                      >
                        {caution.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold" data-testid={`cell-balance-${caution.id}`}>
                      {caution.status === "Held" ? (
                        <span className="text-blue-600">₹{caution.cautionFeeAmount.toLocaleString("en-IN")}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
