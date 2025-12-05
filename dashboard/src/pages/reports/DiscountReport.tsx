import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import studentFeesData from "@/mockData/studentFees.json";

export default function DiscountReport() {
  const discountData = useMemo(() => {
    const allDiscounts: any[] = [];
    const discountTypes: Record<string, any> = {};

    studentFeesData.forEach((student: any) => {
      if (student.discounts > 0) {
        student.discountBreakdown.forEach((discount: any) => {
          allDiscounts.push({
            studentName: student.studentName,
            admissionNo: student.admissionNo,
            class: student.class,
            type: discount.type,
            amount: discount.amount,
            totalFee: student.totalFee,
            id: `${student.id}-${discount.type}`,
          });

          if (!discountTypes[discount.type]) {
            discountTypes[discount.type] = {
              type: discount.type,
              count: 0,
              totalAmount: 0,
            };
          }
          discountTypes[discount.type].count++;
          discountTypes[discount.type].totalAmount += discount.amount;
        });
      }
    });

    return { allDiscounts, summary: Object.values(discountTypes) };
  }, []);

  const statistics = useMemo(() => {
    return {
      totalDiscounts: discountData.allDiscounts.length,
      totalAmount: discountData.allDiscounts.reduce((sum: number, d: any) => sum + d.amount, 0),
      avgDiscount: discountData.allDiscounts.length > 0
        ? Math.round(
            discountData.allDiscounts.reduce((sum: number, d: any) => sum + d.amount, 0) /
              discountData.allDiscounts.length
          )
        : 0,
      discountTypes: discountData.summary.length,
    };
  }, [discountData]);

  const handleExport = () => {
    const csv = [
      ["Student", "Admission No", "Class", "Discount Type", "Amount"],
      ...discountData.allDiscounts.map((d: any) => [
        d.studentName,
        d.admissionNo,
        d.class,
        d.type,
        d.amount,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "discount_report.csv";
    a.click();
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <PageHeader
        title="Discount Report"
        description="Detailed breakdown of all discounts provided to students"
      />

      {/* Statistics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Discounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-discounts">
              {statistics.totalDiscounts}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-discount">
              ₹{statistics.avgDiscount.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Discount Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-discount-types">
              {statistics.discountTypes}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <Button onClick={handleExport} data-testid="button-export">
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>

      {/* Discount Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Discount Type Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Discount Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountData.summary.map((d: any) => (
                  <TableRow key={d.type}>
                    <TableCell className="font-medium" data-testid={`cell-type-${d.type}`}>
                      {d.type}
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`cell-count-${d.type}`}>
                      {d.count}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-total-${d.type}`}>
                      ₹{d.totalAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-avg-${d.type}`}>
                      ₹{Math.round(d.totalAmount / d.count).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>All Discounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Discount Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountData.allDiscounts.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium" data-testid={`cell-student-${d.id}`}>
                      {d.studentName}
                    </TableCell>
                    <TableCell data-testid={`cell-admission-${d.id}`}>
                      {d.admissionNo}
                    </TableCell>
                    <TableCell>{d.class}</TableCell>
                    <TableCell className="text-sm" data-testid={`cell-type-${d.id}`}>
                      {d.type}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600" data-testid={`cell-amount-${d.id}`}>
                      ₹{d.amount.toLocaleString("en-IN")}
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
