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
import { Search, Calendar, Plus, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";
import studentFeesData from "@/mockData/studentFees.json";

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

interface Installment {
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: "Pending" | "Paid" | "Overdue";
}

export default function InstallmentManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<(StudentFee & { installments: Installment[] }) | null>(null);
  const [installmentPlan, setInstallmentPlan] = useState("quarterly");
  const [customMonths, setCustomMonths] = useState("3");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const students = useMemo(() => {
    return (studentFeesData as StudentFee[]).filter(
      (student) =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Generate installment schedule
  const generateInstallments = (netFee: number, months: number): Installment[] => {
    const installments: Installment[] = [];
    const amountPerInstallment = Math.round(netFee / months);
    const startDate = new Date(2024, 3, 1); // April 1, 2024

    for (let i = 0; i < months; i++) {
      const dueDate = addMonths(startDate, i);
      const amount = i === months - 1 ? netFee - amountPerInstallment * i : amountPerInstallment;

      // Determine status based on current date
      let status: "Pending" | "Paid" | "Overdue" = "Pending";
      if (dueDate < new Date() && Math.random() > 0.5) {
        status = "Paid";
      } else if (dueDate < new Date()) {
        status = "Overdue";
      }

      installments.push({
        installmentNo: i + 1,
        dueDate: dueDate.toISOString().split("T")[0],
        amount,
        status,
      });
    }

    return installments;
  };

  const handleSelectStudent = (student: StudentFee) => {
    if (student.dueAmount === 0) {
      toast({
        title: "Info",
        description: "This student has no pending dues",
        variant: "destructive",
      });
      return;
    }

    const monthsPerPlan: Record<string, number> = {
      quarterly: 3,
      biannual: 6,
      custom: parseInt(customMonths),
    };

    const months = monthsPerPlan[installmentPlan] || 3;
    const installments = generateInstallments(student.dueAmount, months);

    setSelectedStudent({
      ...student,
      installments,
    });
    setSearchQuery("");
  };

  const handleRequestApproval = () => {
    setIsSubmittingRequest(true);
    setTimeout(() => {
      toast({
        title: "Success",
        description: "Installment plan request submitted for approval",
      });
      setIsSubmittingRequest(false);
      setSelectedStudent(null);
      setInstallmentPlan("quarterly");
    }, 800);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Paid":
        return "✓";
      case "Overdue":
        return "!";
      default:
        return "○";
    }
  };

  const statistics = useMemo(() => {
    return {
      totalStudents: (studentFeesData as StudentFee[]).length,
      withDues: (studentFeesData as StudentFee[]).filter((s) => s.dueAmount > 0).length,
      totalOutstanding: (studentFeesData as StudentFee[]).reduce((sum, s) => sum + s.dueAmount, 0),
    };
  }, []);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif font-semibold text-foreground" data-testid="text-page-title">
          Installment Management
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Generate and manage payment installment schedules
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-students">
              {statistics.totalStudents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Pending Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-with-dues">
              {statistics.withDues}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-outstanding">
              ₹{statistics.totalOutstanding.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Student Search & Plan Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Create Schedule</CardTitle>
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
                  {students
                    .filter((s) => s.dueAmount > 0)
                    .map((student) => (
                      <button
                        key={student.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 flex justify-between items-center"
                        onClick={() => handleSelectStudent(student)}
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

            {selectedStudent && (
              <>
                {/* Installment Plan Selection */}
                <div>
                  <Label htmlFor="plan" className="text-sm mb-2 block">
                    Installment Plan
                  </Label>
                  <Select value={installmentPlan} onValueChange={setInstallmentPlan}>
                    <SelectTrigger id="plan" data-testid="select-installment-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
                      <SelectItem value="biannual">Bi-annual (6 months)</SelectItem>
                      <SelectItem value="custom">Custom Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {installmentPlan === "custom" && (
                  <div>
                    <Label htmlFor="months" className="text-sm mb-2 block">
                      Number of Months
                    </Label>
                    <Input
                      id="months"
                      type="number"
                      min="2"
                      max="12"
                      value={customMonths}
                      onChange={(e) => setCustomMonths(e.target.value)}
                      data-testid="input-custom-months"
                    />
                  </div>
                )}

                {/* Request Approval Button */}
                <Button
                  onClick={handleRequestApproval}
                  disabled={isSubmittingRequest}
                  className="w-full"
                  data-testid="button-request-approval"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmittingRequest ? "Submitting..." : "Request Approval"}
                </Button>

                <Button
                  onClick={() => setSelectedStudent(null)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-clear-selection"
                >
                  Clear
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Installment Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Preview
            </CardTitle>
            {selectedStudent && (
              <Badge variant="secondary">{selectedStudent.installments.length} months</Badge>
            )}
          </CardHeader>
          <CardContent>
            {selectedStudent ? (
              <div className="space-y-4">
                {/* Student Details */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Student</span>
                        <div className="font-semibold" data-testid={`student-name-${selectedStudent.id}`}>
                          {selectedStudent.studentName}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Class</span>
                        <div className="font-semibold">{selectedStudent.class}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Due</span>
                        <div className="font-semibold text-orange-600">
                          ₹{selectedStudent.dueAmount.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Plan</span>
                        <div className="font-semibold capitalize">
                          {installmentPlan === "custom" ? `${customMonths} months` : installmentPlan}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Installments Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Installment</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStudent.installments.map((installment) => (
                        <TableRow key={installment.installmentNo}>
                          <TableCell className="font-medium" data-testid={`installment-no-${installment.installmentNo}`}>
                            #{installment.installmentNo}
                          </TableCell>
                          <TableCell data-testid={`installment-date-${installment.installmentNo}`}>
                            {format(new Date(installment.dueDate), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-right font-semibold" data-testid={`installment-amount-${installment.installmentNo}`}>
                            ₹{installment.amount.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusColor(installment.status)}
                              data-testid={`installment-status-${installment.installmentNo}`}
                            >
                              <span className="mr-1">{getStatusIcon(installment.status)}</span>
                              {installment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Select a student to view installment schedule</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Flexible Installment Plans
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Generate quarterly (3 months), bi-annual (6 months), or custom installment schedules. Each plan spreads the outstanding balance equally across the selected months with automatic status tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
