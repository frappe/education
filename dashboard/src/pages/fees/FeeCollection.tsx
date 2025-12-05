import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Search, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb } from "@/components/Breadcrumb";
import studentFeesData from "@/mockData/studentFees.json";
import feePaymentsData from "@/mockData/feePayments.json";
import { format } from "date-fns";
import { PageHeader } from "@/components/common/PageHeader";

interface StudentFee {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  admissionNo: string;
  scheme: string;
  netFee: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
}

interface Payment {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  class: string;
  admissionNo: string;
  paymentDate: string;
  paymentMode: string;
  amount: number;
  remarks?: string;
}

export default function FeeCollection() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentFee | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-select student from localStorage or query params
  useEffect(() => {
    // First check localStorage (from Collect Fee button)
    const storedStudent = localStorage.getItem('selectedStudentForCollection');
    if (storedStudent) {
      try {
        const student = JSON.parse(storedStudent);
        setSelectedStudent(student as StudentFee);
        setSearchQuery("");
        localStorage.removeItem('selectedStudentForCollection');
        return;
      } catch (e) {
        console.error('Failed to parse stored student:', e);
      }
    }
    
    // Fallback: check query params (for direct URL loads)
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get('studentId');
    
    if (studentId) {
      const student = (studentFeesData as StudentFee[]).find(s => s.studentId === studentId);
      if (student) {
        setSelectedStudent(student);
        setSearchQuery("");
      }
    }
  }, [location]);

  const students = useMemo(() => {
    return (studentFeesData as StudentFee[]).filter(
      (student) =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const paymentModes = ["Cash", "Cheque", "UPI", "Bank Transfer"];

  const recentPayments = (feePaymentsData as Payment[])
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 8);

  const todayPayments = recentPayments.filter(
    (p) => p.paymentDate === new Date().toISOString().split("T")[0]
  );

  const todayCollection = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  const handlePaymentSubmit = () => {
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "Please select a student",
        variant: "destructive",
      });
      return;
    }

    if (!paymentAmount || isNaN(parseInt(paymentAmount))) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(paymentAmount);
    if (amount <= 0 || amount > selectedStudent.dueAmount) {
      toast({
        title: "Error",
        description: `Amount must be between ₹1 and ₹${selectedStudent.dueAmount.toLocaleString("en-IN")}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const receiptNo = `RCP/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
      
      toast({
        title: "Success",
        description: `Payment of ₹${amount.toLocaleString("en-IN")} collected. Receipt: ${receiptNo}`,
      });

      setSelectedStudent(null);
      setPaymentAmount("");
      setPaymentMode("Cash");
      setRemarks("");
      setIsProcessing(false);
    }, 1000);
  };

  const paymentStats = {
    totalDues: (studentFeesData as StudentFee[]).reduce((sum, s) => sum + s.dueAmount, 0),
    pendingStudents: (studentFeesData as StudentFee[]).filter(
      (s) => s.dueAmount > 0
    ).length,
    todayCollection,
    totalPayments: feePaymentsData.length,
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Fee Management", href: "/fees" },
        { label: "Collect Payment" }
      ]} />
      
      <PageHeader
        title="Fee Collection"
        description="Collect fees, process payments, and track payment history"
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-total-dues">
              ₹{paymentStats.totalDues.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{paymentStats.pendingStudents} students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-today-collection">
              ₹{paymentStats.todayCollection.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{todayPayments.length} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-students">
              {paymentStats.pendingStudents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-transactions">
              {paymentStats.totalPayments}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Payment Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Collect Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student Search */}
            <div>
              <Label htmlFor="student-search" className="text-sm mb-2 block">
                Select Student
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-search"
                  placeholder="Search by name or admission no..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-student-search"
                />
              </div>

              {searchQuery && students.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 flex justify-between items-center"
                      onClick={() => {
                        setSelectedStudent(student);
                        setSearchQuery("");
                      }}
                      data-testid={`button-select-student-${student.id}`}
                    >
                      <div>
                        <div className="font-medium text-sm">{student.studentName}</div>
                        <div className="text-xs text-muted-foreground">{student.admissionNo}</div>
                      </div>
                      <div className="text-sm font-semibold text-orange-600">
                        ₹{student.dueAmount.toLocaleString("en-IN")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Details */}
            {selectedStudent && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Student</span>
                      <span className="font-medium" data-testid={`selected-student-name-${selectedStudent.id}`}>
                        {selectedStudent.studentName}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Class</span>
                      <span className="font-medium" data-testid={`selected-student-class-${selectedStudent.id}`}>
                        {selectedStudent.class}
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Net Fee</span>
                        <span className="font-medium">{selectedStudent.netFee.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-medium text-green-600">
                          ₹{selectedStudent.paidAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-orange-600 border-t pt-2 mt-2">
                        <span>Due Amount</span>
                        <span data-testid={`due-amount-${selectedStudent.id}`}>
                          ₹{selectedStudent.dueAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedStudent && (
              <>
                {/* Payment Amount */}
                <div>
                  <Label htmlFor="amount" className="text-sm mb-2 block">
                    Payment Amount (₹)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    data-testid="input-payment-amount"
                    max={selectedStudent.dueAmount}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: ₹{selectedStudent.dueAmount.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Payment Mode */}
                <div>
                  <Label htmlFor="mode" className="text-sm mb-2 block">
                    Payment Mode
                  </Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger id="mode" data-testid="select-payment-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Remarks */}
                <div>
                  <Label htmlFor="remarks" className="text-sm mb-2 block">
                    Remarks (Optional)
                  </Label>
                  <Input
                    id="remarks"
                    placeholder="e.g., Cheque #, UPI ID..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    data-testid="input-remarks"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handlePaymentSubmit}
                  disabled={isProcessing || !paymentAmount}
                  className="w-full"
                  data-testid="button-collect-payment"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isProcessing ? "Processing..." : "Collect Payment"}
                </Button>

                <Button
                  onClick={() => setSelectedStudent(null)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-clear-student"
                >
                  Clear Selection
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-lg">Recent Payments</CardTitle>
            <Badge variant="secondary">{recentPayments.length} payments</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm" data-testid={`receipt-${payment.id}`}>
                        <button
                          onClick={() => navigate(`/fees/receipts/${encodeURIComponent(payment.receiptNo)}`)}
                          className="text-primary hover:underline cursor-pointer"
                          data-testid={`button-receipt-${payment.id}`}
                        >
                          {payment.receiptNo}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`payment-student-${payment.id}`}>
                        {payment.studentName}
                      </TableCell>
                      <TableCell data-testid={`payment-class-${payment.id}`}>
                        {payment.class}
                      </TableCell>
                      <TableCell data-testid={`payment-date-${payment.id}`}>
                        {format(new Date(payment.paymentDate), "dd MMM")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`payment-mode-${payment.id}`}>
                          {payment.paymentMode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600" data-testid={`payment-amount-${payment.id}`}>
                        ₹{payment.amount.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {recentPayments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payment history available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Partial Payment Support
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Students can pay any amount up to their due balance. Receipt will be generated immediately with automatic tracking of balance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
