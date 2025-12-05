import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useToast } from "@/hooks/use-toast";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Check, X, Eye } from "lucide-react";
import { format } from "date-fns";
import departmentBillsData from "@/mockData/departmentBills.json";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface DepartmentBill {
  id: string;
  billNo: string;
  department: string;
  expenseCategory: string;
  vendor: string;
  invoiceNumber: string;
  amount: number;
  description: string;
  submittedDate: string;
  submittedBy: string;
  status: "Pending" | "Approved" | "Rejected";
  approvedBy: string | null;
  approvedDate: string | null;
  rejectedBy: string | null;
  rejectedDate: string | null;
  remarks: string;
  lineItems: LineItem[];
}

export default function BillApprovalWorkflow() {
  const { toast } = useToast();
  const [bills, setBills] = useState<DepartmentBill[]>(
    departmentBillsData as DepartmentBill[]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<DepartmentBill | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get unique departments
  const departments = useMemo(() => {
    const deptSet = new Set(bills.map((b) => b.department));
    return Array.from(deptSet).sort();
  }, [bills]);

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesSearch =
        bill.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || bill.status === statusFilter;
      const matchesDept = departmentFilter === "all" || bill.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [bills, searchQuery, statusFilter, departmentFilter]);

  const statistics = useMemo(() => {
    const pendingBills = bills.filter((b) => b.status === "Pending");
    const approvedBills = bills.filter((b) => b.status === "Approved");
    const rejectedBills = bills.filter((b) => b.status === "Rejected");
    
    const deptStats = departments.map((dept) => ({
      department: dept,
      pending: pendingBills.filter((b) => b.department === dept).length,
      pendingAmount: pendingBills
        .filter((b) => b.department === dept)
        .reduce((sum, b) => sum + b.amount, 0),
    }));

    return {
      totalPending: pendingBills.length,
      totalPendingAmount: pendingBills.reduce((sum, b) => sum + b.amount, 0),
      totalApproved: approvedBills.length,
      totalRejected: rejectedBills.length,
      byDepartment: deptStats,
    };
  }, [bills, departments]);

  const handleActionClick = (bill: DepartmentBill, action: "approve" | "reject") => {
    setSelectedBill(bill);
    setActionType(action);
    setShowApprovalDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedBill || !actionType) return;

    setIsProcessing(true);
    setTimeout(() => {
      const newStatus = actionType === "approve" ? "Approved" : "Rejected";
      setBills((prevBills) =>
        prevBills.map((bill) =>
          bill.id === selectedBill.id
            ? {
                ...bill,
                status: newStatus,
                approvedBy: actionType === "approve" ? "Admin User" : null,
                approvedDate: actionType === "approve" ? new Date().toISOString().split("T")[0] : null,
                rejectedBy: actionType === "reject" ? "Admin User" : null,
                rejectedDate: actionType === "reject" ? new Date().toISOString().split("T")[0] : null,
              }
            : bill
        )
      );

      toast({
        title: "Success",
        description: `Bill ${selectedBill.billNo} has been ${newStatus.toLowerCase()}`,
      });

      setIsProcessing(false);
      setShowApprovalDialog(false);
      setSelectedBill(null);
      setActionType(null);
    }, 600);
  };

  const handleViewBill = (bill: DepartmentBill) => {
    setSelectedBill(bill);
    setShowDetailDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Fees", href: "/fees" },
        { label: "Bill Approval" }
      ]} />
      
      <PageHeader
        title="Bill Approval Workflow"
        description="Review and approve departmental expense bills"
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-bills">
              {statistics.totalPending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pending Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-total-amount">
              ₹{statistics.totalPendingAmount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">under review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-approved">
              {statistics.totalApproved}
            </div>
            <p className="text-xs text-muted-foreground mt-1">processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-rejected">
              {statistics.totalRejected}
            </div>
            <p className="text-xs text-muted-foreground mt-1">need revision</p>
          </CardContent>
        </Card>
      </div>

      {/* Department-wise Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Department-wise Pending Expenses</h2>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {statistics.byDepartment
              .sort((a, b) => b.pendingAmount - a.pendingAmount)
              .map((item) => (
                <Card key={item.department} className="min-w-[200px]" data-testid={`card-dept-${item.department}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item.department}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold" data-testid={`stat-dept-count-${item.department}`}>
                        {item.pending}
                      </div>
                      <p className="text-xs text-muted-foreground">pending bill{item.pending !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-lg font-semibold text-orange-600" data-testid={`stat-dept-amount-${item.department}`}>
                        ₹{item.pendingAmount.toLocaleString("en-IN")}
                      </div>
                      <p className="text-xs text-muted-foreground">total amount</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {statistics.byDepartment.length === 0 && (
              <Card className="min-w-[200px]">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No pending expenses
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div>
              <Label htmlFor="search" className="text-sm mb-2 block">
                Search by Bill No, Vendor, or Invoice
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-bill-search"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status-filter" className="text-sm mb-2 block">
                Filter by Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dept-filter" className="text-sm mb-2 block">
                Filter by Department
              </Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger id="dept-filter" data-testid="select-department-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Bills ({filteredBills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Expense Type</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length > 0 ? (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-mono text-sm font-semibold" data-testid={`cell-bill-no-${bill.id}`}>
                        {bill.billNo}
                      </TableCell>
                      <TableCell data-testid={`cell-department-${bill.id}`}>
                        {bill.department}
                      </TableCell>
                      <TableCell data-testid={`cell-expense-type-${bill.id}`}>
                        {bill.expenseCategory}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`cell-vendor-${bill.id}`}>
                        {bill.vendor}
                      </TableCell>
                      <TableCell className="font-mono text-xs" data-testid={`cell-invoice-${bill.id}`}>
                        {bill.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-right font-semibold" data-testid={`cell-amount-${bill.id}`}>
                        ₹{bill.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            bill.status === "Approved" 
                              ? "default" 
                              : bill.status === "Rejected" 
                              ? "destructive" 
                              : "secondary"
                          }
                          data-testid={`cell-status-${bill.id}`}
                        >
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`cell-date-${bill.id}`}>
                        {format(new Date(bill.submittedDate), "dd MMM")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {bill.status === "Pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleActionClick(bill, "approve")}
                                disabled={isProcessing}
                                data-testid={`button-approve-${bill.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleActionClick(bill, "reject")}
                                disabled={isProcessing}
                                data-testid={`button-reject-${bill.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewBill(bill)}
                            data-testid={`button-view-${bill.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== "all" || departmentFilter !== "all"
                        ? "No bills match your search criteria"
                        : "No bills found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Approve Bill" : "Reject Bill"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBill && (
                <div className="space-y-2 mt-2">
                  <p>
                    <span className="font-medium">Bill No:</span> {selectedBill.billNo}
                  </p>
                  <p>
                    <span className="font-medium">Department:</span> {selectedBill.department}
                  </p>
                  <p>
                    <span className="font-medium">Vendor:</span> {selectedBill.vendor}
                  </p>
                  <p>
                    <span className="font-medium">Amount:</span> ₹{selectedBill.amount.toLocaleString("en-IN")}
                  </p>
                  <p>
                    <span className="font-medium">Description:</span> {selectedBill.description}
                  </p>
                </div>
              )}
              <p className="mt-4 text-sm">
                Are you sure you want to{" "}
                <span className="font-semibold">
                  {actionType === "approve" ? "approve" : "reject"}
                </span>{" "}
                this bill?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isProcessing}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              data-testid={`button-confirm-${actionType}`}
            >
              {isProcessing ? "Processing..." : actionType === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bill Detail Viewer Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Bill No</p>
                  <p className="font-semibold">{selectedBill.billNo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice No</p>
                  <p className="font-semibold">{selectedBill.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="font-semibold">{selectedBill.department}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge 
                    className="mt-1"
                    variant={
                      selectedBill.status === "Approved" 
                        ? "default" 
                        : selectedBill.status === "Rejected" 
                        ? "destructive" 
                        : "secondary"
                    }
                  >
                    {selectedBill.status}
                  </Badge>
                </div>
              </div>

              {/* Vendor & Description */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Vendor</p>
                  <p className="font-medium">{selectedBill.vendor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expense Category</p>
                  <p className="font-medium">{selectedBill.expenseCategory}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedBill.description}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Line Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs text-right">Unit Price</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBill.lineItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{item.description}</TableCell>
                          <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                          <TableCell className="text-xs text-right">₹{item.unitPrice}</TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            ₹{item.amount.toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-2 text-right">
                  <p className="text-sm font-semibold">Total: ₹{selectedBill.amount.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Submission & Approval Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Submitted By</p>
                  <p className="font-medium">{selectedBill.submittedBy}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(selectedBill.submittedDate), "dd MMM yyyy")}
                  </p>
                </div>
                {selectedBill.approvedDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Approved By</p>
                    <p className="font-medium text-green-600">{selectedBill.approvedBy}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(selectedBill.approvedDate), "dd MMM yyyy")}
                    </p>
                  </div>
                )}
                {selectedBill.rejectedDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Rejected By</p>
                    <p className="font-medium text-red-600">{selectedBill.rejectedBy}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(selectedBill.rejectedDate), "dd MMM yyyy")}
                    </p>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <p className="text-xs text-muted-foreground">Remarks</p>
                <p className="text-sm mt-1">{selectedBill.remarks}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
