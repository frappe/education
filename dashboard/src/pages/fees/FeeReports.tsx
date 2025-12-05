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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, FileText, BarChart3, TrendingDown, Receipt, AlertCircle, Coins } from "lucide-react";
import { format } from "date-fns";
import studentFeesData from "@/mockData/studentFees.json";
import feePaymentsData from "@/mockData/feePayments.json";
import cautionFeesData from "@/mockData/cautionFees.json";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function FeeReports() {
  const classes = ["Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

  // Student Fee Report State
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Outstanding Report State
  const [outstandingSearchQuery, setOutstandingSearchQuery] = useState("");

  // Receipt Register State
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");

  // Caution Fee Ledger State
  const [cautionSearchQuery, setCautionSearchQuery] = useState("");
  const [cautionStatusFilter, setCautionStatusFilter] = useState("all");

  // ===== STUDENT FEE REPORT =====
  const studentFeeFiltered = useMemo(() => {
    return studentFeesData.filter((student: any) => {
      const matchesSearch =
        student.studentName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(studentSearchQuery.toLowerCase());
      const matchesClass = classFilter === "all" || student.class === classFilter;
      const matchesStatus = statusFilter === "all" || student.status === statusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [studentSearchQuery, classFilter, statusFilter]);

  const studentFeeStats = useMemo(() => {
    return {
      totalStudents: studentFeeFiltered.length,
      totalFees: studentFeeFiltered.reduce((sum: number, s: any) => sum + s.netFee, 0),
      totalCollected: studentFeeFiltered.reduce((sum: number, s: any) => sum + s.paidAmount, 0),
      totalDue: studentFeeFiltered.reduce((sum: number, s: any) => sum + s.dueAmount, 0),
    };
  }, [studentFeeFiltered]);

  const handleStudentFeeExport = () => {
    const csv = [
      ["Name", "Admission No", "Class", "Net Fee", "Paid", "Due", "Status"],
      ...studentFeeFiltered.map((s: any) => [
        s.studentName,
        s.admissionNo,
        s.class,
        s.netFee,
        s.paidAmount,
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
    a.download = "student_fee_report.csv";
    a.click();
  };

  // ===== SCHEME-WISE REPORT =====
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

  const schemeStats = useMemo(() => {
    return {
      totalSchemes: schemes.length,
      totalStudents: schemes.reduce((sum: number, s: any) => sum + s.count, 0),
      totalFees: schemes.reduce((sum: number, s: any) => sum + s.totalFees, 0),
      totalDue: schemes.reduce((sum: number, s: any) => sum + s.totalDue, 0),
    };
  }, [schemes]);

  const handleSchemeExport = () => {
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

  // ===== DISCOUNT REPORT =====
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

  const discountStats = useMemo(() => {
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

  const handleDiscountExport = () => {
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

  // ===== RECEIPT REGISTER =====
  const receiptFiltered = useMemo(() => {
    return feePaymentsData.filter((payment: any) => {
      return paymentModeFilter === "all" || payment.paymentMode === paymentModeFilter;
    });
  }, [paymentModeFilter]);

  const receiptStats = useMemo(() => {
    return {
      totalReceipts: receiptFiltered.length,
      totalAmount: receiptFiltered.reduce((sum: number, p: any) => sum + p.amount, 0),
      byMode: {
        Cash: receiptFiltered.filter((p: any) => p.paymentMode === "Cash").reduce((sum: number, p: any) => sum + p.amount, 0),
        UPI: receiptFiltered.filter((p: any) => p.paymentMode === "UPI").reduce((sum: number, p: any) => sum + p.amount, 0),
        Cheque: receiptFiltered.filter((p: any) => p.paymentMode === "Cheque").reduce((sum: number, p: any) => sum + p.amount, 0),
        "Bank Transfer": receiptFiltered.filter((p: any) => p.paymentMode === "Bank Transfer").reduce((sum: number, p: any) => sum + p.amount, 0),
      },
    };
  }, [receiptFiltered]);

  const handleReceiptExport = () => {
    const csv = [
      ["Receipt No", "Date", "Student", "Admission No", "Amount", "Mode", "Status"],
      ...receiptFiltered.map((p: any) => [
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

  // ===== OUTSTANDING REPORT =====
  const outstandingData = useMemo(() => {
    return studentFeesData
      .filter((student: any) => student.dueAmount > 0)
      .filter((student: any) =>
        student.studentName.toLowerCase().includes(outstandingSearchQuery.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(outstandingSearchQuery.toLowerCase())
      )
      .sort((a: any, b: any) => b.dueAmount - a.dueAmount);
  }, [outstandingSearchQuery]);

  const outstandingStats = useMemo(() => {
    const data = studentFeesData.filter((student: any) => student.dueAmount > 0);
    return {
      totalOutstanding: data.reduce((sum: number, s: any) => sum + s.dueAmount, 0),
      totalStudents: data.length,
      avgOutstanding: data.length > 0 ? Math.round(data.reduce((sum: number, s: any) => sum + s.dueAmount, 0) / data.length) : 0,
      highestOutstanding: data.length > 0 ? Math.max(...data.map((s: any) => s.dueAmount)) : 0,
    };
  }, []);

  const handleOutstandingExport = () => {
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

  // ===== CAUTION FEE LEDGER =====
  const cautionFiltered = useMemo(() => {
    return cautionFeesData.filter((caution: any) => {
      const matchesSearch =
        caution.studentName.toLowerCase().includes(cautionSearchQuery.toLowerCase()) ||
        caution.admissionNo.toLowerCase().includes(cautionSearchQuery.toLowerCase());
      const matchesStatus = cautionStatusFilter === "all" || caution.status === cautionStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cautionSearchQuery, cautionStatusFilter]);

  const cautionStats = useMemo(() => {
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

  const handleCautionExport = () => {
    const csv = [
      ["Student", "Admission No", "Class", "Deposited Amount", "Status", "Balance"],
      ...cautionFiltered.map((c: any) => [
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
      <Breadcrumb items={[
        { label: "Fee Management", href: "/fees" },
        { label: "Reports" }
      ]} />
      
      <PageHeader
        title="Fee Reports"
        description="Access all fee-related reports and analytics in one place"
      />

      <Tabs defaultValue="student-fee" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" data-testid="tabs-reports">
          <TabsTrigger value="student-fee" data-testid="tab-student-fee">
            <span className="hidden sm:inline">Student Fee</span>
            <FileText className="sm:hidden w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="scheme-wise" data-testid="tab-scheme-wise">
            <span className="hidden sm:inline">Scheme-wise</span>
            <BarChart3 className="sm:hidden w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="discount" data-testid="tab-discount">
            <span className="hidden sm:inline">Discounts</span>
            <TrendingDown className="sm:hidden w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="receipts" data-testid="tab-receipts">
            <span className="hidden sm:inline">Receipts</span>
            <Receipt className="sm:hidden w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="outstanding" data-testid="tab-outstanding">
            <span className="hidden sm:inline">Outstanding</span>
            <AlertCircle className="sm:hidden w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="caution" data-testid="tab-caution">
            <span className="hidden sm:inline">Caution Fee</span>
            <Coins className="sm:hidden w-4 h-4" />
          </TabsTrigger>
        </TabsList>

        {/* ===== STUDENT FEE REPORT TAB ===== */}
        <TabsContent value="student-fee" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-students">
                  {studentFeeStats.totalStudents}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-fees">
                  ₹{studentFeeStats.totalFees.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-collected">
                  ₹{studentFeeStats.totalCollected.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Due Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="stat-due">
                  ₹{studentFeeStats.totalDue.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <Label htmlFor="search">Search Student</Label>
                  <Input
                    id="search"
                    placeholder="Name or Admission No"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    data-testid="input-student-search"
                  />
                </div>
                <div>
                  <Label htmlFor="class">Class</Label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger id="class" data-testid="select-class">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleStudentFeeExport} data-testid="button-export-student-fee">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Net Fee</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentFeeFiltered.map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.studentName}</TableCell>
                        <TableCell>{student.admissionNo}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>₹{student.netFee.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-green-600">₹{student.paidAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-red-600">₹{student.dueAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === "Paid"
                                ? "default"
                                : student.status === "Pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SCHEME-WISE REPORT TAB ===== */}
        <TabsContent value="scheme-wise" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Schemes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-schemes">
                  {schemeStats.totalSchemes}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-scheme-students">
                  {schemeStats.totalStudents}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="stat-scheme-fees">
                  ₹{schemeStats.totalFees.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="stat-scheme-due">
                  ₹{schemeStats.totalDue.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleSchemeExport} data-testid="button-export-scheme">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scheme</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Total Fees</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.map((scheme: any) => (
                      <TableRow key={scheme.scheme}>
                        <TableCell className="font-medium">{scheme.scheme}</TableCell>
                        <TableCell>{scheme.count}</TableCell>
                        <TableCell>₹{scheme.totalFees.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-green-600">₹{scheme.totalPaid.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-red-600">₹{scheme.totalDue.toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DISCOUNT REPORT TAB ===== */}
        <TabsContent value="discount" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-discounts">
                  {discountStats.totalDiscounts}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-discount-total">
                  ₹{discountStats.totalAmount.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Discount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-avg-discount">
                  ₹{discountStats.avgDiscount.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Discount Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-discount-types">
                  {discountStats.discountTypes}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleDiscountExport} data-testid="button-export-discount">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discountData.allDiscounts.map((discount: any) => (
                      <TableRow key={discount.id}>
                        <TableCell>{discount.studentName}</TableCell>
                        <TableCell>{discount.admissionNo}</TableCell>
                        <TableCell>{discount.class}</TableCell>
                        <TableCell>{discount.type}</TableCell>
                        <TableCell className="text-green-600">₹{discount.amount.toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== RECEIPT REGISTER TAB ===== */}
        <TabsContent value="receipts" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-receipts">
                  {receiptStats.totalReceipts}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-receipt-total">
                  ₹{receiptStats.totalAmount.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Payment Modes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {Object.entries(receiptStats.byMode).map(([mode, amount]) => (
                    <div key={mode} className="flex justify-between">
                      <span className="text-muted-foreground">{mode}</span>
                      <span className="font-semibold">₹{(amount as number).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div>
                  <Label htmlFor="mode">Payment Mode</Label>
                  <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                    <SelectTrigger id="mode" data-testid="select-payment-mode">
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
                <Button onClick={handleReceiptExport} data-testid="button-export-receipt">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptFiltered.map((payment: any) => (
                      <TableRow key={payment.receiptNo}>
                        <TableCell>{payment.receiptNo}</TableCell>
                        <TableCell>{format(new Date(payment.paymentDate), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{payment.studentName}</TableCell>
                        <TableCell>{payment.admissionNo}</TableCell>
                        <TableCell className="text-green-600">₹{payment.amount.toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.paymentMode}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== OUTSTANDING REPORT TAB ===== */}
        <TabsContent value="outstanding" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="stat-outstanding-total">
                  ₹{outstandingStats.totalOutstanding.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Students with Dues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-outstanding-students">
                  {outstandingStats.totalStudents}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-outstanding-avg">
                  ₹{outstandingStats.avgOutstanding.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Highest Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-outstanding-highest">
                  ₹{outstandingStats.highestOutstanding.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="outstanding-search">Search Student</Label>
                  <Input
                    id="outstanding-search"
                    placeholder="Name or Admission No"
                    value={outstandingSearchQuery}
                    onChange={(e) => setOutstandingSearchQuery(e.target.value)}
                    data-testid="input-outstanding-search"
                  />
                </div>
                <Button onClick={handleOutstandingExport} data-testid="button-export-outstanding">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingData.map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.studentName}</TableCell>
                        <TableCell>{student.admissionNo}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell className="text-red-600">₹{student.dueAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant={student.status === "Overdue" ? "destructive" : "secondary"}>
                            {student.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CAUTION FEE LEDGER TAB ===== */}
        <TabsContent value="caution" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Deposited</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-caution-deposited">
                  ₹{cautionStats.totalDeposited.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Refunded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-caution-refunded">
                  ₹{cautionStats.totalRefunded.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Held</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="stat-caution-held">
                  ₹{cautionStats.totalHeld.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-caution-active">
                  {cautionStats.activeCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Refunded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-caution-refunded-count">
                  {cautionStats.refundedCount}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <Label htmlFor="caution-search">Search Student</Label>
                  <Input
                    id="caution-search"
                    placeholder="Name or Admission No"
                    value={cautionSearchQuery}
                    onChange={(e) => setCautionSearchQuery(e.target.value)}
                    data-testid="input-caution-search"
                  />
                </div>
                <div>
                  <Label htmlFor="caution-status">Status</Label>
                  <Select value={cautionStatusFilter} onValueChange={setCautionStatusFilter}>
                    <SelectTrigger id="caution-status" data-testid="select-caution-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Held">Held</SelectItem>
                      <SelectItem value="Refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div />
                <Button onClick={handleCautionExport} data-testid="button-export-caution">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Deposited</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cautionFiltered.map((caution: any) => (
                      <TableRow key={caution.id}>
                        <TableCell>{caution.studentName}</TableCell>
                        <TableCell>{caution.admissionNo}</TableCell>
                        <TableCell>{caution.class}</TableCell>
                        <TableCell>₹{caution.cautionFeeAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant={caution.status === "Held" ? "default" : "outline"}>
                            {caution.status}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{(caution.status === "Held" ? caution.cautionFeeAmount : 0).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
