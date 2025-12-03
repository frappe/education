import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, ChevronRight, Calculator, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import studentFeesData from "@/mockData/studentFees.json";

interface StudentFee {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  admissionNo: string;
  scheme: string;
  schemeCode: string;
  feeBreakdown: {
    tuitionFee: number;
    transportFee: number;
    libraryFee: number;
    sportsFee: number;
    hostelFee: number;
    messFee: number;
    cautionFee: number;
  };
  totalFee: number;
  discountBreakdown: Array<{ type: string; amount: number }>;
  discounts: number;
  netFee: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  academicYear: string;
}

export default function StudentFeeManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScheme, setSelectedScheme] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [editSchemeDialog, setEditSchemeDialog] = useState<{ open: boolean; student: StudentFee | null }>({
    open: false,
    student: null,
  });
  const [newScheme, setNewScheme] = useState<string>("");

  const schemes = [
    { label: "Day Scholar", value: "DAY_SCHOLAR" },
    { label: "RTE", value: "RTE" },
    { label: "Staff Children", value: "STAFF_CHILDREN" },
    { label: "MDY", value: "MDY" },
    { label: "JUY", value: "JUY" },
    { label: "Shreshta", value: "SHRESHTA" },
    { label: "ATAL", value: "ATAL" },
    { label: "Hostel AC", value: "HOSTEL_AC" },
    { label: "Hostel Non-AC", value: "HOSTEL_NON_AC" },
  ];

  const classes = [
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
  ];

  const filteredStudents = useMemo(() => {
    return (studentFeesData as StudentFee[]).filter((student) => {
      const matchesSearch =
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesScheme = !selectedScheme || student.schemeCode === selectedScheme;
      const matchesClass = !selectedClass || student.class === selectedClass;

      return matchesSearch && matchesScheme && matchesClass;
    });
  }, [searchQuery, selectedScheme, selectedClass]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      case "Partial":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleEditScheme = (student: StudentFee) => {
    setEditSchemeDialog({ open: true, student });
    setNewScheme(student.schemeCode);
  };

  const handleSaveScheme = () => {
    if (!newScheme || !editSchemeDialog.student) {
      toast({
        title: "Error",
        description: "Please select a scheme",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Fee scheme updated for ${editSchemeDialog.student.studentName}`,
    });

    setEditSchemeDialog({ open: false, student: null });
    setNewScheme("");
  };

  const handleCollectFee = (student: StudentFee) => {
    // Store student in localStorage for Fee Collection page
    localStorage.setItem('selectedStudentForCollection', JSON.stringify({
      id: student.id,
      studentId: student.studentId,
      studentName: student.studentName,
      class: student.class,
      admissionNo: student.admissionNo,
      netFee: student.netFee,
      paidAmount: student.paidAmount,
      dueAmount: student.dueAmount,
      status: student.status
    }));
    navigate('/fees/collection');
  };

  const handleViewReceipt = (student: StudentFee) => {
    navigate(`/fees/receipts?studentId=${student.studentId}`);
  };

  const statistics = {
    totalStudents: filteredStudents.length,
    totalDues: filteredStudents.reduce((sum, s) => sum + s.dueAmount, 0),
    paidStudents: filteredStudents.filter((s) => s.status === "Paid").length,
    pendingStudents: filteredStudents.filter((s) => s.status !== "Paid").length,
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif font-semibold text-foreground" data-testid="text-page-title">
          Student Fee Management
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage student fees, assign schemes, and view calculated fee amounts
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
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
              Total Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-total-dues">
              ₹{statistics.totalDues.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-paid-students">
              {statistics.paidStudents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-pending-students">
              {statistics.pendingStudents}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or admission no..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-student"
              />
            </div>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger data-testid="select-class">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedScheme} onValueChange={setSelectedScheme}>
              <SelectTrigger data-testid="select-scheme">
                <SelectValue placeholder="Select Scheme" />
              </SelectTrigger>
              <SelectContent>
                {schemes.map((scheme) => (
                  <SelectItem key={scheme.value} value={scheme.value}>
                    {scheme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
          <CardTitle className="text-lg">Students List</CardTitle>
          <div className="text-sm text-muted-foreground">
            Showing {filteredStudents.length} students
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Admission</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Scheme</TableHead>
                  <TableHead className="text-right">Net Fee</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <Collapsible
                    key={student.id}
                    open={expandedStudent === student.id}
                    onOpenChange={(open) =>
                      setExpandedStudent(open ? student.id : null)
                    }
                    asChild
                  >
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium" data-testid={`text-student-name-${student.id}`}>
                          {student.studentName}
                        </TableCell>
                        <TableCell data-testid={`text-admission-${student.id}`}>
                          {student.admissionNo}
                        </TableCell>
                        <TableCell data-testid={`text-class-${student.id}`}>
                          {student.class}
                        </TableCell>
                        <TableCell data-testid={`text-scheme-${student.id}`}>
                          <Badge variant="outline">{student.scheme}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold" data-testid={`text-netfee-${student.id}`}>
                          ₹{student.netFee.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right text-green-600" data-testid={`text-paid-${student.id}`}>
                          ₹{student.paidAmount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right text-red-600" data-testid={`text-due-${student.id}`}>
                          ₹{student.dueAmount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(student.status)} data-testid={`badge-status-${student.id}`}>
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <button data-testid={`button-expand-${student.id}`}>
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${
                                  expandedStudent === student.id ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                          </CollapsibleTrigger>
                        </TableCell>
                      </TableRow>

                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Calculator className="h-4 w-4 text-primary" />
                                  <h3 className="font-semibold">Fee Breakdown</h3>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditScheme(student)}
                                  data-testid={`button-edit-scheme-${student.id}`}
                                >
                                  Edit Scheme
                                </Button>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                {/* Gross Fees */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Gross Fees (Pre-Discount)</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    {Object.entries(student.feeBreakdown).map(([key, value]) => {
                                      if (value === 0) return null;
                                      const label = key
                                        .replace(/([A-Z])/g, " $1")
                                        .replace("^", "")
                                        .trim()
                                        .split(" ")
                                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(" ");
                                      return (
                                        <div
                                          key={key}
                                          className="flex justify-between text-sm"
                                          data-testid={`text-breakdown-${key}-${student.id}`}
                                        >
                                          <span className="text-muted-foreground">{label}</span>
                                          <span className="font-medium">
                                            ₹{value.toLocaleString("en-IN")}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold" data-testid={`text-total-gross-${student.id}`}>
                                      <span>Total Gross</span>
                                      <span>₹{student.totalFee.toLocaleString("en-IN")}</span>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Discounts */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Discounts Applied</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    {student.discountBreakdown.length > 0 ? (
                                      <>
                                        {student.discountBreakdown.map((discount, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between text-sm"
                                            data-testid={`text-discount-${discount.type}-${idx}-${student.id}`}
                                          >
                                            <span className="text-muted-foreground">
                                              {discount.type}
                                            </span>
                                            <span className="font-medium text-green-600">
                                              -₹{discount.amount.toLocaleString("en-IN")}
                                            </span>
                                          </div>
                                        ))}
                                        <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-green-600" data-testid={`text-total-discount-${student.id}`}>
                                          <span>Total Discount</span>
                                          <span>-₹{student.discounts.toLocaleString("en-IN")}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-sm text-muted-foreground italic">
                                        No discounts applied
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Summary */}
                              <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="pt-6">
                                  <div className="grid gap-4 md:grid-cols-4 text-center">
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Total Gross
                                      </div>
                                      <div className="text-lg font-semibold" data-testid={`summary-total-gross-${student.id}`}>
                                        ₹{student.totalFee.toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Total Discount
                                      </div>
                                      <div className="text-lg font-semibold text-green-600" data-testid={`summary-discount-${student.id}`}>
                                        -₹{student.discounts.toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Net Fee
                                      </div>
                                      <div className="text-lg font-semibold" data-testid={`summary-netfee-${student.id}`}>
                                        ₹{student.netFee.toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Balance Due
                                      </div>
                                      <div
                                        className={`text-lg font-semibold ${
                                          student.dueAmount > 0 ? "text-red-600" : "text-green-600"
                                        }`}
                                        data-testid={`summary-due-${student.id}`}
                                      >
                                        ₹{student.dueAmount.toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCollectFee(student)}
                                  data-testid={`button-collect-${student.id}`}
                                >
                                  Collect Fee
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewReceipt(student)}
                                  data-testid={`button-view-receipt-${student.id}`}
                                >
                                  View Receipt
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No students found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Scheme Dialog */}
      <Dialog open={editSchemeDialog.open} onOpenChange={(open) => setEditSchemeDialog({ ...editSchemeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fee Scheme</DialogTitle>
            <DialogDescription>
              Change the fee scheme for {editSchemeDialog.student?.studentName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="scheme-select" className="text-sm mb-2 block">
                Select New Scheme
              </Label>
              <Select value={newScheme} onValueChange={setNewScheme}>
                <SelectTrigger id="scheme-select" data-testid="select-edit-scheme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schemes.map((scheme) => (
                    <SelectItem key={scheme.value} value={scheme.value}>
                      {scheme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Current Scheme</p>
              <p className="text-sm font-semibold">{editSchemeDialog.student?.scheme}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditSchemeDialog({ open: false, student: null })}
              data-testid="button-cancel-edit-scheme"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveScheme}
              data-testid="button-save-edit-scheme"
            >
              Save Scheme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
