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
import { Download, Receipt } from "lucide-react";
import { format } from "date-fns";
import feePaymentsData from "@/mockData/feePayments.json";

export default function ReceiptRegister() {
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");

  const filteredData = useMemo(() => {
    return feePaymentsData.filter((payment: any) => {
      return paymentModeFilter === "all" || payment.paymentMode === paymentModeFilter;
    });
  }, [paymentModeFilter]);

  const statistics = useMemo(() => {
    return {
      totalReceipts: filteredData.length,
      totalAmount: filteredData.reduce((sum: number, p: any) => sum + p.amount, 0),
      byMode: {
        Cash: filteredData.filter((p: any) => p.paymentMode === "Cash").reduce((sum: number, p: any) => sum + p.amount, 0),
        UPI: filteredData.filter((p: any) => p.paymentMode === "UPI").reduce((sum: number, p: any) => sum + p.amount, 0),
        Cheque: filteredData.filter((p: any) => p.paymentMode === "Cheque").reduce((sum: number, p: any) => sum + p.amount, 0),
        "Bank Transfer": filteredData.filter((p: any) => p.paymentMode === "Bank Transfer").reduce((sum: number, p: any) => sum + p.amount, 0),
      },
    };
  }, [filteredData]);

  const handleExport = () => {
    const csv = [
      ["Receipt No", "Date", "Student", "Admission No", "Amount", "Mode", "Status"],
      ...filteredData.map((p: any) => [
        p.receiptNo,
        format(new Date(p.paymentDate), "dd/MM/yyyy"),
        p.studentName,
        p.admissionNo,
        p.amount,
        p.paymentMode,
        "Completed",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "receipt_register.csv";
    a.click();
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif font-semibold text-foreground" data-testid="text-page-title">
          Receipt Register
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Complete record of all payment receipts issued
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-receipts">
              {statistics.totalReceipts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-total-amount">
              ₹{statistics.totalAmount.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Modes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {Object.entries(statistics.byMode).map(([mode, amount]) => (
                <div key={mode} className="flex justify-between">
                  <span className="text-muted-foreground">{mode}</span>
                  <span className="font-semibold">₹{(amount as number).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Export */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4 items-end">
            <div>
              <Label htmlFor="mode">Payment Mode</Label>
              <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                <SelectTrigger id="mode" className="w-48" data-testid="select-payment-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
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

      {/* Receipt Register Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Receipt Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Collected By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono font-semibold" data-testid={`cell-receipt-${payment.id}`}>
                      {payment.receiptNo}
                    </TableCell>
                    <TableCell data-testid={`cell-date-${payment.id}`}>
                      {format(new Date(payment.paymentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`cell-student-${payment.id}`}>
                      {payment.studentName}
                    </TableCell>
                    <TableCell data-testid={`cell-admission-${payment.id}`}>
                      {payment.admissionNo}
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`cell-amount-${payment.id}`}>
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`cell-mode-${payment.id}`}>
                        {payment.paymentMode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`cell-by-${payment.id}`}>
                      {payment.collectedBy}
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
