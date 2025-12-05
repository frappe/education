import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, AlertCircle } from "lucide-react";
import studentFeesData from "@/mockData/studentFees.json";

export default function OutstandingReport() {
  const [searchQuery, setSearchQuery] = useState("");

  const outstandingData = useMemo(() => {
    return studentFeesData
      .filter((student: any) => student.dueAmount > 0)
      .filter((student: any) =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a: any, b: any) => b.dueAmount - a.dueAmount);
  }, [searchQuery]);

  const statistics = useMemo(() => {
    const data = studentFeesData.filter((student: any) => student.dueAmount > 0);
    return {
      totalOutstanding: data.reduce((sum: number, s: any) => sum + s.dueAmount, 0),
      totalStudents: data.length,
      avgOutstanding: data.length > 0 ? Math.round(data.reduce((sum: number, s: any) => sum + s.dueAmount, 0) / data.length) : 0,
      highestOutstanding: data.length > 0 ? Math.max(...data.map((s: any) => s.dueAmount)) : 0,
    };
  }, []);

  const getDaysOverdue = (status: string) => {
    if (status === "Pending") return "Current";
    if (status === "Overdue") return "30+ days";
    return "-";
  };

  const handleExport = () => {
    const csv = [
      ["Student", "Admission No", "Class", "Outstanding Amount", "Status"],
      ...outstandingData.map((s: any) => [
        s.studentName,
        s.admissionNo,
        s.class,
        s.dueAmount,
        s.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outstanding_report.csv";
    a.click();
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <PageHeader
        title="Outstanding Report"
        description="Students with pending fee dues and payment status"
      />

      {/* Statistics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-total-outstanding">
              ₹{statistics.totalOutstanding.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Students with Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-students-with-dues">
              {statistics.totalStudents}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-outstanding">
              ₹{statistics.avgOutstanding.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-highest-outstanding">
              ₹{statistics.highestOutstanding.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Export */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search Student</Label>
              <Input
                id="search"
                placeholder="Student name or admission no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2"
                data-testid="input-search"
              />
            </div>
            <Button onClick={handleExport} data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Outstanding Details ({outstandingData.length} students)
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
                  <TableHead className="text-right">Net Fee</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingData.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium" data-testid={`cell-name-${student.id}`}>
                      {student.studentName}
                    </TableCell>
                    <TableCell data-testid={`cell-admission-${student.id}`}>
                      {student.admissionNo}
                    </TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell className="text-right" data-testid={`cell-netfee-${student.id}`}>
                      ₹{student.netFee.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-green-600" data-testid={`cell-paid-${student.id}`}>
                      ₹{student.paidAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600" data-testid={`cell-outstanding-${student.id}`}>
                      ₹{student.dueAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" data-testid={`cell-status-${student.id}`}>
                        {getDaysOverdue(student.status)}
                      </Badge>
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
