import { useState } from "react";
import { Plus, Search, DollarSign, CheckCircle, Clock, Download, ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical, Eye, CreditCard, Loader2, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Enquiry, type Registration, type InsertRegistration } from "@shared/schema";
import { useApp } from "@/context/AppContext";
import { useAdmissionData } from "@/context/AdmissionDataContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const registrationInsertSchema = z.object({
  enquiryId: z.string().optional(),
  studentName: z.string().min(1, "Student name is required"),
  fatherName: z.string().min(1, "Father's name is required"),
  motherName: z.string().min(1, "Mother's name is required"),
  primaryContactNumber: z.string().min(1, "Contact number is required"),
  classAdmissionFor: z.string().min(1, "Class is required"),
  registrationFee: z.number().min(0, "Fee must be positive"),
  paymentStatus: z.enum(["Pending", "Paid"]).default("Pending"),
  paymentMode: z.string().optional(),
  paymentDate: z.string().optional(),
  receiptNumber: z.string().optional(),
  status: z.string().default("Registered"),
  createdBy: z.string().default("Admin"),
});

type RegistrationInsert = z.infer<typeof registrationInsertSchema>;

export default function RegistrationManagement() {
  const { hasPermission } = useApp();
  const { toast } = useToast();
  const { registrations, updateRegistration, enquiries } = useAdmissionData();
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "fee">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPendingEnquiriesDialogOpen, setIsPendingEnquiriesDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<any | null>(null);

  const filteredRegistrations = registrations
    .filter((reg) => {
      const matchesSearch =
        reg.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.registrationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reg.primaryContactNumber as string).includes(searchTerm);

      const matchesPayment = paymentFilter === "all" || reg.paymentStatus === paymentFilter;
      const matchesClass = classFilter === "all" || reg.classAdmissionFor === classFilter;
      
      let matchesDate = true;
      if (dateFromFilter || dateToFilter) {
        const regDate = new Date(reg.date).getTime();
        if (dateFromFilter) matchesDate = matchesDate && regDate >= new Date(dateFromFilter).getTime();
        if (dateToFilter) matchesDate = matchesDate && regDate <= new Date(dateToFilter).getTime();
      }

      return matchesSearch && matchesPayment && matchesClass && matchesDate;
    })
    .sort((a, b) => {
      let compareValue = 0;
      if (sortBy === "date") {
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "name") {
        compareValue = a.studentName.localeCompare(b.studentName);
      } else if (sortBy === "fee") {
        compareValue = a.registrationFee - b.registrationFee;
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

  const paginatedRegistrations = filteredRegistrations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredRegistrations.length / pageSize);

  const handleExportCSV = () => {
    const csv = [
      ["Reg. No.", "Date", "Student Name", "Mobile", "Class", "Fee", "Payment Status", "Payment Mode"],
      ...filteredRegistrations.map((r) => [
        r.registrationNo,
        r.createdAt || "-",
        r.studentName,
        r.primaryContactNumber,
        r.classAdmissionFor,
        r.registrationFee,
        r.paymentStatus,
        r.paymentMode || "-",
      ]),
    ]
      .map((row) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registration_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedRegistrations.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const classes = Array.from(new Set(registrations.map((r) => r.classAdmissionFor).filter(Boolean))).sort();

  const totalPaid = filteredRegistrations.filter((r) => r.paymentStatus === "Paid").length;
  const totalPending = filteredRegistrations.filter((r) => r.paymentStatus === "Pending").length;
  const totalRevenue = filteredRegistrations
    .filter((r) => r.paymentStatus === "Paid")
    .reduce((sum, r) => sum + r.registrationFee, 0);

  const getPaymentBadge = (status: string) => {
    return status === "Paid" ? (
      <Badge variant="default">
        <CheckCircle className="h-3 w-3 mr-1" />
        Paid
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary"> = {
      Registered: "secondary",
      "Application Submitted": "default",
      Admitted: "default",
      Rejected: "destructive" as "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const handleView = (registration: any) => {
    setSelectedRegistration(registration);
  };

  const handleRecordPayment = (registration: any) => {
    setSelectedRegistration(registration);
    setIsPaymentDialogOpen(true);
  };

  const handleStatusChange = (registration: any, newStatus: "Application Submitted" | "Admitted" | "Rejected") => {
    try {
      updateRegistration(registration.id, { status: newStatus });
      toast({
        title: "Success",
        description: `Status updated to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const canManage = hasPermission("canManageAdmissions");

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Admissions", href: "/admissions/enquiries" },
        { label: "Registrations" }
      ]} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Registration Management
          </h1>
          <p className="text-muted-foreground">
            Track registration payments and status
          </p>
        </div>
        {canManage && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              data-testid="button-create-registration"
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              New Registration
            </Button>
            <Button
              onClick={() => setIsPendingEnquiriesDialogOpen(true)}
              variant="outline"
              data-testid="button-pending-enquiries"
              className="w-full sm:w-auto"
            >
              <FileText className="h-4 w-4" />
              View Pending Enquiries
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-registrations">
              {filteredRegistrations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Filtered results</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-paid-count">
              {totalPaid}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-count">
              {totalPending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ₹{totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle>All Registrations</CardTitle>
              <Button onClick={handleExportCSV} size="sm" variant="outline" data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, reg no..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-registrations"
                />
              </div>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-payment-filter">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-class-filter">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Input
                type="date"
                placeholder="From Date"
                value={dateFromFilter}
                onChange={(e) => { setDateFromFilter(e.target.value); setCurrentPage(1); }}
                className="w-full sm:w-[150px]"
                data-testid="input-date-from"
              />
              <Input
                type="date"
                placeholder="To Date"
                value={dateToFilter}
                onChange={(e) => { setDateToFilter(e.target.value); setCurrentPage(1); }}
                className="w-full sm:w-[150px]"
                data-testid="input-date-to"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selectedIds.size === paginatedRegistrations.length && paginatedRegistrations.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (sortBy === "date") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("date");
                        setSortOrder("desc");
                      }
                      setCurrentPage(1);
                    }}
                    data-testid="header-date"
                  >
                    <div className="flex items-center gap-1">
                      Reg. No.
                      {sortBy === "date" && (
                        sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (sortBy === "name") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("name");
                        setSortOrder("asc");
                      }
                      setCurrentPage(1);
                    }}
                    data-testid="header-student-name"
                  >
                    <div className="flex items-center gap-1">
                      Student Name
                      {sortBy === "name" && (
                        sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (sortBy === "fee") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("fee");
                        setSortOrder("desc");
                      }
                      setCurrentPage(1);
                    }}
                    data-testid="header-fee"
                  >
                    <div className="flex items-center gap-1">
                      Fee
                      {sortBy === "fee" && (
                        sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
            <TableBody>
              {paginatedRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 12 : 11} className="text-center text-muted-foreground">
                    No registrations found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRegistrations.map((registration) => (
                  <TableRow key={registration.id} data-testid={`row-registration-${registration.id}`}>
                    <TableCell className="w-8">
                      <Checkbox
                        checked={selectedIds.has(registration.id)}
                        onCheckedChange={() => handleToggleSelect(registration.id)}
                        data-testid={`checkbox-select-${registration.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {registration.registrationNo}
                    </TableCell>
                    <TableCell className="text-sm">{registration.date}</TableCell>
                    <TableCell className="font-medium">{registration.studentName}</TableCell>
                    <TableCell>{registration.mobileNo}</TableCell>
                    <TableCell>{registration.classAdmissionFor}</TableCell>
                    <TableCell>₹{registration.registrationFee}</TableCell>
                    <TableCell>{getPaymentBadge(registration.paymentStatus)}</TableCell>
                    <TableCell>
                      {registration.paymentMode ? (
                        <Badge variant="secondary">{registration.paymentMode}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(registration.status)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${registration.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(registration)} data-testid={`action-view-${registration.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {registration.paymentStatus !== "Paid" && (
                              <DropdownMenuItem onClick={() => handleRecordPayment(registration)} data-testid={`action-record-payment-${registration.id}`}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Record Payment
                              </DropdownMenuItem>
                            )}
                            {registration.status === "Registered" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(registration, "Application Submitted")} data-testid={`action-submit-application-${registration.id}`}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Submit Application
                              </DropdownMenuItem>
                            )}
                            {registration.status === "Application Submitted" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(registration, "Admitted")} data-testid={`action-mark-admitted-${registration.id}`}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Admitted
                              </DropdownMenuItem>
                            )}
                            {(registration.status === "Registered" || registration.status === "Application Submitted") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(registration, "Rejected")} data-testid={`action-mark-rejected-${registration.id}`}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Rejected
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
          {filteredRegistrations.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRegistrations.length)} of {filteredRegistrations.length}
                {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-page-${page}`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <RegistrationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        registration={selectedRegistration}
      />

      <PendingEnquiriesDialog
        open={isPendingEnquiriesDialogOpen}
        onOpenChange={setIsPendingEnquiriesDialogOpen}
      />

      {selectedRegistration && !isPaymentDialogOpen && (
        <Dialog open={!!selectedRegistration} onOpenChange={() => setSelectedRegistration(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registration Details</DialogTitle>
              <DialogDescription>
                Registration No: {selectedRegistration.registrationNo}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student Name</p>
                  <p className="font-medium">{selectedRegistration.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration Date</p>
                  <p className="font-medium">{selectedRegistration.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Father's Name</p>
                  <p className="font-medium">{selectedRegistration.fatherName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile Number</p>
                  <p className="font-medium">{selectedRegistration.mobileNo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">{selectedRegistration.classAdmissionFor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration Fee</p>
                  <p className="font-medium">₹{selectedRegistration.registrationFee}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <div className="mt-1">{getPaymentBadge(selectedRegistration.paymentStatus)}</div>
                </div>
                {selectedRegistration.paymentMode && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Mode</p>
                    <p className="font-medium">{selectedRegistration.paymentMode}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RegistrationDialog({ open, onOpenChange }: RegistrationDialogProps) {
  const { addRegistration } = useAdmissionData();
  const { toast } = useToast();

  const form = useForm<RegistrationInsert>({
    resolver: zodResolver(registrationInsertSchema),
    defaultValues: {
      studentName: "",
      fatherName: "",
      motherName: "",
      primaryContactNumber: "",
      classAdmissionFor: "",
      registrationFee: 500,
      paymentStatus: "Pending" as const,
      status: "Registered" as const,
    },
  });

  const onSubmit = (data: RegistrationInsert) => {
    try {
      const regNumber = `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newRegistration: any = {
        ...data,
        id: `reg-${Date.now()}`,
        registrationNo: regNumber,
        createdBy: "Admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addRegistration(newRegistration);
      toast({
        title: "Success",
        description: `Registration created with number ${regNumber}`,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create registration",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Registration</DialogTitle>
          <DialogDescription>
            Register a new student and collect registration fee
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="classAdmissionFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10th" {...field} data-testid="input-class" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="studentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter student name" {...field} data-testid="input-student-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter father's name" {...field} data-testid="input-father-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mother's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter mother's name" {...field} data-testid="input-mother-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="primaryContactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="10-digit mobile number" {...field} data-testid="input-mobile" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Fee</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-fee"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-status">
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Mode (if paid)</Label>
              <Select>
                <SelectTrigger data-testid="select-payment-mode">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit">
                Create Registration
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: Registration | null;
}

function PaymentDialog({ open, onOpenChange, registration }: PaymentDialogProps) {
  const { toast } = useToast();
  const { updateRegistration } = useAdmissionData();
  const [paymentMode, setPaymentMode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRecordPayment = () => {
    if (!paymentMode || !registration) {
      toast({
        title: "Error",
        description: "Please select a payment mode",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      updateRegistration(registration.id, {
        paymentStatus: "Paid",
        paymentMode: paymentMode as "Cash" | "UPI" | "Card" | "Cheque",
        paymentDate: new Date().toISOString().split("T")[0],
        status: "Registered",
      });
      toast({
        title: "Success",
        description: `Payment recorded for ${registration.studentName}`,
      });
      onOpenChange(false);
      setPaymentMode("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!registration) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Recording payment for {registration.studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Registration No</p>
            <p className="font-medium">{registration.registrationNo}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-medium text-lg">₹{registration.registrationFee}</p>
          </div>

          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger data-testid="select-payment-mode-dialog">
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Payment Date</p>
            <p className="font-medium">{new Date().toISOString().split("T")[0]}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-payment"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRecordPayment}
            disabled={isLoading}
            data-testid="button-confirm-payment"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PendingEnquiriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EnquiryToRegistrationDialogProps {
  enquiry: Enquiry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function EnquiryToRegistrationDialog({
  enquiry,
  open,
  onOpenChange,
  onSuccess,
}: EnquiryToRegistrationDialogProps) {
  const { addRegistration } = useAdmissionData();
  const { toast } = useToast();

  const form = useForm<RegistrationInsert>({
    resolver: zodResolver(registrationInsertSchema),
    defaultValues: {
      enquiryId: enquiry.id,
      studentName: enquiry.studentName,
      fatherName: enquiry.fatherName,
      motherName: enquiry.motherName,
      primaryContactNumber: enquiry.primaryContactNumber,
      classAdmissionFor: enquiry.classAdmissionFor,
      registrationFee: 500,
      paymentStatus: "Pending" as const,
      paymentMode: undefined,
      paymentDate: undefined,
      receiptNumber: undefined,
      status: "Registered" as const,
      createdBy: "Admin",
    },
  });

  const onSubmit = (data: RegistrationInsert) => {
    try {
      const regNumber = `SAN${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
      const newRegistration: Registration = {
        ...data,
        id: `reg-${Date.now()}`,
        registrationNo: regNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      addRegistration(newRegistration);
      toast({
        title: "Success",
        description: `Registration created for ${enquiry.studentName}. Ready to record payment.`,
      });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create registration",
        variant: "destructive",
      });
    }
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Registration from Enquiry</DialogTitle>
          <DialogDescription>
            Review and edit the registration details for {enquiry.studentName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-student-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father's Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-father-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mother's Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-mother-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryContactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-mobile-no" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classAdmissionFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class for Admission</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-class-admission" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Fee (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-registration-fee"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-status">
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-mode">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-registration"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-create-registration-from-enquiry"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Registration
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PendingEnquiriesDialog({ open, onOpenChange }: PendingEnquiriesDialogProps) {
  const { enquiries } = useAdmissionData();
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const pendingEnquiries = enquiries.filter((e) => e.followUpStatus === "Proceed to Admission");

  const handleProceedToRegistration = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Pending Enquiries - Proceed to Admission</DialogTitle>
          <DialogDescription>
            {pendingEnquiries.length} enquiries waiting to proceed to registration
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto">
          {pendingEnquiries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No enquiries pending for admission
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Father's Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Final Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEnquiries.map((enquiry) => (
                  <TableRow key={enquiry.id} data-testid={`row-pending-enquiry-${enquiry.id}`}>
                    <TableCell className="text-sm">{enquiry.date}</TableCell>
                    <TableCell className="font-medium">{enquiry.studentName}</TableCell>
                    <TableCell>{enquiry.fatherName}</TableCell>
                    <TableCell>{enquiry.primaryContactNumber}</TableCell>
                    <TableCell>{enquiry.classAdmissionFor}</TableCell>
                    <TableCell>
                      <Badge variant={enquiry.finalStatus === "Rejected" ? "destructive" : "secondary"}>
                        {enquiry.finalStatus || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleProceedToRegistration(enquiry)}
                        data-testid={`button-proceed-registration-${enquiry.id}`}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Proceed to Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            data-testid="button-close-pending-enquiries"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {selectedEnquiry && (
        <EnquiryToRegistrationDialog
          enquiry={selectedEnquiry}
          open={!!selectedEnquiry}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedEnquiry(null);
            }
          }}
          onSuccess={() => {
            setSelectedEnquiry(null);
            onOpenChange(false);
          }}
        />
      )}
    </Dialog>
  );
}
