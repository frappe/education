import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, BarChart3 } from "lucide-react";
import studentFeesData from "@/mockData/studentFees.json";

export default function SchemeWiseReport() {
  const schemes = useMemo(() => {
    const schemeMap: Record<string, any> = {};

    studentFeesData.forEach((student: any) => {
      if (!schemeMap[student.scheme]) {
        schemeMap[student.scheme] = {
          scheme: student.scheme,
          count: 0,
          totalFees: 0,
          totalPaid: 0,
          totalDue: 0,
          students: [],
        };
      }
      schemeMap[student.scheme].count++;
      schemeMap[student.scheme].totalFees += student.netFee;
      schemeMap[student.scheme].totalPaid += student.paidAmount;
      schemeMap[student.scheme].totalDue += student.dueAmount;
      schemeMap[student.scheme].students.push(student);
    });

    return Object.values(schemeMap);
  }, []);

  const statistics = useMemo(() => {
    return {
      totalSchemes: schemes.length,
      totalStudents: schemes.reduce((sum: number, s: any) => sum + s.count, 0),
      totalFees: schemes.reduce((sum: number, s: any) => sum + s.totalFees, 0),
      totalDue: schemes.reduce((sum: number, s: any) => sum + s.totalDue, 0),
    };
  }, [schemes]);

  const handleExport = () => {
    const csv = [
      ["Scheme", "Students", "Total Fees", "Collected", "Outstanding"],
      ...schemes.map((s: any) => [
        s.scheme,
        s.count,
        s.totalFees,
        s.totalPaid,
        s.totalDue,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scheme_wise_report.csv";
    a.click();
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif font-semibold text-foreground" data-testid="text-page-title">
          Scheme-wise Student Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Student distribution and fees breakdown by scheme
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Schemes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-schemes">
              {statistics.totalSchemes}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-students">
              {statistics.totalStudents}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-fees">
              ₹{statistics.totalFees.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-outstanding">
              ₹{statistics.totalDue.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <Button onClick={handleExport} data-testid="button-export">
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Scheme Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheme</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Collection %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemes.map((scheme: any) => {
                  const collectionRate = (
                    (scheme.totalPaid / scheme.totalFees) *
                    100
                  ).toFixed(1);
                  return (
                    <TableRow key={scheme.scheme}>
                      <TableCell className="font-medium" data-testid={`cell-scheme-${scheme.scheme}`}>
                        <Badge variant="outline">{scheme.scheme}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold" data-testid={`cell-count-${scheme.scheme}`}>
                        {scheme.count}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-totalfees-${scheme.scheme}`}>
                        ₹{scheme.totalFees.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right text-green-600" data-testid={`cell-collected-${scheme.scheme}`}>
                        ₹{scheme.totalPaid.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right text-red-600" data-testid={`cell-outstanding-${scheme.scheme}`}>
                        ₹{scheme.totalDue.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-semibold" data-testid={`cell-rate-${scheme.scheme}`}>
                        {collectionRate}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
