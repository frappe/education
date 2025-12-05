import { useState } from "react";
import { Plus, Search, Phone, Loader2, Eye, Edit, MoreVertical, ArrowRight, FileText, Download, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Enquiry, insertEnquirySchema, Registration } from "@shared/schema";
import { useApp } from "@/context/AppContext";
import { useAdmissionData } from "@/context/AdmissionDataContext";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

export default function EnquiryManagement() {
  const { hasPermission } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { enquiries, addRegistration } = useAdmissionData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  const filteredEnquiries = enquiries
    .filter((enquiry) => {
      const matchesSearch =
        enquiry.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.primaryContactNumber.includes(searchTerm);

      const matchesStatus = statusFilter === "all" || enquiry.finalStatus === statusFilter;
      const matchesClass = classFilter === "all" || enquiry.classAdmissionFor === classFilter;
      
      let matchesDate = true;
      if (dateFromFilter || dateToFilter) {
        const enquiryDate = new Date(enquiry.date).getTime();
        if (dateFromFilter) matchesDate = matchesDate && enquiryDate >= new Date(dateFromFilter).getTime();
        if (dateToFilter) matchesDate = matchesDate && enquiryDate <= new Date(dateToFilter).getTime();
      }

      return matchesSearch && matchesStatus && matchesClass && matchesDate;
    })
    .sort((a, b) => {
      let compareValue = 0;
      if (sortBy === "date") {
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "name") {
        compareValue = a.studentName.localeCompare(b.studentName);
      } else if (sortBy === "status") {
        compareValue = a.finalStatus.localeCompare(b.finalStatus);
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

  const paginatedEnquiries = filteredEnquiries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredEnquiries.length / pageSize);

  const handleExportCSV = () => {
    const csv = [
      ["Date", "Student Name", "Father's Name", "Mobile", "Class", "Admission Type", "Follow-up Status", "Final Status"],
      ...filteredEnquiries.map((e) => [
        e.date,
        e.studentName,
        e.fatherName,
        e.primaryContactNumber,
        e.classAdmissionFor,
        e.admissionStatus,
        e.followUpStatus,
        e.finalStatus,
      ]),
    ]
      .map((row) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquiry_report_${new Date().toISOString().split('T')[0]}.csv`;
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
      setSelectedIds(new Set(paginatedEnquiries.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const classes = Array.from(new Set(enquiries.map((e) => e.classAdmissionFor).filter(Boolean))).sort();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Pending: "secondary",
      Registered: "default",
      Admitted: "default",
      Rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getFollowUpBadge = (status: string) => {
    if (status === "Proceed to Admission") {
      return <Badge variant="default">{status}</Badge>;
    }
    if (status === "Not interested") {
      return <Badge variant="destructive">{status}</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const handleEdit = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsEditDialogOpen(true);
  };

  const handleView = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsViewDialogOpen(true);
  };

  const handleStatusUpdate = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsStatusUpdateDialogOpen(true);
  };

  const handleProceedToRegistration = (enquiry: Enquiry) => {
    // Generate unique registration ID and registration number
    const registrationId = `REG${Date.now()}`;
    const registrationNo = `SAN${new Date().getFullYear()}${String(enquiries.length + 1).padStart(4, "0")}`;
    
    // Create registration from enquiry data
    const newRegistration: Registration = {
      id: registrationId,
      registrationNo,
      enquiryId: enquiry.id,
      studentName: enquiry.studentName,
      fatherName: enquiry.studentName,
      motherName: enquiry.motherName,
      primaryContactNumber: enquiry.primaryContactNumber,
      classAdmissionFor: enquiry.classAdmissionFor,
      registrationFee: 500,
      paymentStatus: "Pending",
      paymentMode: undefined,
      paymentDate: undefined,
      status: "Registered",
      createdBy: "System",
    };

    addRegistration(newRegistration);
    toast({
      title: "Success",
      description: `Registration created: ${registrationNo}`,
    });
    navigate("/admissions/registrations");
  };

  const handleCreateApplication = (enquiry: Enquiry) => {
    navigate(`/admissions/applications?enquiryId=${enquiry.id}`);
  };

  const canManage = hasPermission("canManageAdmissions");

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Admissions", href: "/admissions/enquiries" },
        { label: "Enquiries" }
      ]} />
      <PageHeader
        title="Enquiry Management"
        description="Track and manage admission enquiries"
        customActions={
          canManage ? (
            <Button
              onClick={() => navigate("/admissions/enquiries/new")}
              data-testid="button-create-enquiry"
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              New Enquiry
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-enquiries">
              {filteredEnquiries.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Filtered results</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-enquiries">
              {filteredEnquiries.filter((e) => e.finalStatus === "Pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-registered-enquiries">
              {filteredEnquiries.filter((e) => e.finalStatus === "Registered").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-admitted-enquiries">
              {filteredEnquiries.filter((e) => e.finalStatus === "Admitted").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle>All Enquiries</CardTitle>
              <Button onClick={handleExportCSV} size="sm" variant="outline" data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, mobile..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-enquiries"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Registered">Registered</SelectItem>
                  <SelectItem value="Admitted">Admitted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
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
                      checked={selectedIds.size === paginatedEnquiries.length && paginatedEnquiries.length > 0}
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
                      Date
                      {sortBy === "date" && (
                        sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                      {sortBy !== "date" && <ChevronsUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
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
                      {sortBy !== "name" && <ChevronsUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead>Father's Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (sortBy === "status") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("status");
                        setSortOrder("asc");
                      }
                      setCurrentPage(1);
                    }}
                    data-testid="header-status"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortBy === "status" && (
                        sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                      {sortBy !== "status" && <ChevronsUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
            <TableBody>
              {paginatedEnquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 11 : 10} className="text-center text-muted-foreground">
                    No enquiries found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEnquiries.map((enquiry) => (
                  <TableRow key={enquiry.id} data-testid={`row-enquiry-${enquiry.id}`}>
                    <TableCell className="w-8">
                      <Checkbox
                        checked={selectedIds.has(enquiry.id)}
                        onCheckedChange={() => handleToggleSelect(enquiry.id)}
                        data-testid={`checkbox-select-${enquiry.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{enquiry.date}</TableCell>
                    <TableCell className="font-medium">{enquiry.studentName}</TableCell>
                    <TableCell>{enquiry.fatherName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {enquiry.primaryContactNumber}
                      </div>
                    </TableCell>
                    <TableCell>{enquiry.classAdmissionFor}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{enquiry.admissionStatus}</Badge>
                    </TableCell>
                    <TableCell>{getFollowUpBadge(enquiry.followUpStatus)}</TableCell>
                    <TableCell>{getStatusBadge(enquiry.finalStatus)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${enquiry.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(enquiry)} data-testid={`action-view-${enquiry.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(enquiry)} data-testid={`action-edit-${enquiry.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(enquiry)} data-testid={`action-status-${enquiry.id}`}>
                              <FileText className="h-4 w-4 mr-2" />
                              Update Status
                            </DropdownMenuItem>
                            {enquiry.followUpStatus === "Proceed to Admission" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleProceedToRegistration(enquiry)} data-testid={`action-register-${enquiry.id}`}>
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  Proceed to Registration
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreateApplication(enquiry)} data-testid={`action-application-${enquiry.id}`}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Create Application
                                </DropdownMenuItem>
                              </>
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
          {filteredEnquiries.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredEnquiries.length)} of {filteredEnquiries.length}
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

      <EnquiryDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        mode="create"
      />
      <EnquiryDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        enquiry={selectedEnquiry}
      />
      <ViewEnquiryDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        enquiry={selectedEnquiry}
      />
      <StatusUpdateDialog
        open={isStatusUpdateDialogOpen}
        onOpenChange={setIsStatusUpdateDialogOpen}
        enquiry={selectedEnquiry}
      />
    </div>
  );
}

interface EnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  enquiry?: Enquiry | null;
}

function EnquiryDialog({ open, onOpenChange, mode, enquiry }: EnquiryDialogProps) {
  const { toast } = useToast();
  const { addEnquiry, updateEnquiry: updateEnquiryContext } = useAdmissionData();
  const [isLoading, setIsLoading] = useState(false);

  const [siblingLookupId, setSiblingLookupId] = useState("");
  const [isLookingUpSibling, setIsLookingUpSibling] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertEnquirySchema),
    defaultValues: enquiry ? {
      ...enquiry,
      gender: enquiry.gender as "Male" | "Female" | "Other",
    } : {
      date: new Date().toISOString().split("T")[0],
      studentName: "",
      dateOfBirth: "",
      gender: "Male" as const,
      bloodGroup: "",
      fatherName: "",
      fatherPhone: "",
      fatherOccupation: "",
      motherName: "",
      motherPhone: "",
      motherOccupation: "",
      primaryContact: "father" as const,
      primaryContactNumber: "",
      hasSibling: false,
      siblingAdmissionNo: "",
      siblingName: "",
      siblingClass: "",
      residentialAddress: "",
      city: "",
      state: "",
      pincode: "",
      classAdmissionFor: "",
      admissionStatus: "Day Scholar" as const,
      board: "State Board" as const,
      medium: "English" as const,
      previousSchool: "",
      lastExamPassed: "",
      height: undefined,
      weight: undefined,
      hasMedicalCondition: false,
      medicalConditionDetails: "",
      doctorName: "",
      doctorPhone: "",
      localGuardianName: "",
      localGuardianAddress: "",
      localGuardianPhone: "",
      localGuardianRelation: "",
      declarationTruthful: false,
      declarationRules: false,
      declarationCancellation: false,
      studentSignature: "",
      parentSignature: "",
      followUpStatus: "Pending" as const,
      finalStatus: "Pending" as const,
      notes: "",
    },
  });

  const hasSibling = form.watch("hasSibling");
  const admissionStatus = form.watch("admissionStatus");
  const hasMedicalCondition = form.watch("hasMedicalCondition");
  const fatherPhone = form.watch("fatherPhone");
  const motherPhone = form.watch("motherPhone");

  // Auto-populate primary contact number based on selection
  const handlePrimaryContactChange = (value: "father" | "mother" | "other") => {
    if (value === "father" && fatherPhone) {
      form.setValue("primaryContactNumber", fatherPhone);
    } else if (value === "mother" && motherPhone) {
      form.setValue("primaryContactNumber", motherPhone);
    }
  };

  // Sibling lookup function
  const lookupSibling = async () => {
    if (!siblingLookupId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a student ID",
        variant: "destructive",
      });
      return;
    }

    setIsLookingUpSibling(true);
    try {
      const response = await fetch(`/api/students/search?id=${siblingLookupId}`);
      if (!response.ok) {
        throw new Error("Student not found");
      }
      const data = await response.json();
      form.setValue("siblingName", data.name);
      form.setValue("siblingClass", data.class);
      form.setValue("siblingAdmissionNo", data.id);
      toast({
        title: "Success",
        description: "Sibling information loaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Student not found with this ID",
        variant: "destructive",
      });
    } finally {
      setIsLookingUpSibling(false);
    }
  };

  const onSubmit = (data: any) => {
    setIsLoading(true);
    try {
      if (mode === "create") {
        const newEnquiry: Enquiry = {
          id: `ENQ${Date.now()}`,
          ...data,
          createdAt: new Date().toISOString(),
          createdBy: "System",
        };
        addEnquiry(newEnquiry);
        toast({
          title: "Success",
          description: "Enquiry created successfully",
        });
      } else if (enquiry) {
        updateEnquiryContext(enquiry.id, data);
        toast({
          title: "Success",
          description: "Enquiry updated successfully",
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${mode === "create" ? "create" : "update"} enquiry`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Enquiry" : "Edit Enquiry"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Record a new admission enquiry"
              : "Update enquiry details"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* SECTION 1: Student & Family Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Student & Family Information</h3>
                <Separator className="mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enquiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-enquiry-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student name" {...field} data-testid="input-student-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-dob" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Group (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., A+" {...field} data-testid="input-blood-group" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter father's name" {...field} data-testid="input-father-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fatherPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit mobile number" {...field} data-testid="input-father-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fatherOccupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father's Occupation (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter occupation" {...field} data-testid="input-father-occupation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="motherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother's Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter mother's name" {...field} data-testid="input-mother-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motherPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother's Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit mobile number" {...field} data-testid="input-mother-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="motherOccupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mother's Occupation (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter occupation" {...field} data-testid="input-mother-occupation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primaryContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handlePrimaryContactChange(value as "father" | "mother" | "other");
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-primary-contact">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact Number</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit mobile number" {...field} data-testid="input-primary-contact-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hasSibling"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-has-sibling"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Student has a sibling in the school</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasSibling && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter sibling's Student ID"
                      value={siblingLookupId}
                      onChange={(e) => setSiblingLookupId(e.target.value)}
                      data-testid="input-sibling-lookup-id"
                    />
                    <Button
                      type="button"
                      onClick={lookupSibling}
                      disabled={isLookingUpSibling}
                      data-testid="button-lookup-sibling"
                    >
                      {isLookingUpSibling && <Loader2 className="h-4 w-4 animate-spin" />}
                      Lookup
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="siblingName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sibling Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Auto-filled or enter manually" {...field} data-testid="input-sibling-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siblingClass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sibling Class</FormLabel>
                          <FormControl>
                            <Input placeholder="Auto-filled or enter manually" {...field} data-testid="input-sibling-class" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Contact & Admission Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Contact & Admission Details</h3>
                <Separator className="mt-2" />
              </div>

              <FormField
                control={form.control}
                name="residentialAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Residential Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter full residential address" 
                        {...field} 
                        data-testid="input-residential-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter state" {...field} data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="6-digit pincode" {...field} data-testid="input-pincode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="classAdmissionFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class for Admission</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10th" {...field} data-testid="input-class" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admissionStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status of Admission</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Hosteller" id="hosteller" data-testid="radio-hosteller" />
                            <Label htmlFor="hosteller">Hosteller</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Day Scholar" id="day-scholar" data-testid="radio-day-scholar" />
                            <Label htmlFor="day-scholar">Day Scholar</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="board"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Applied For</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-board">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="State Board">State Board</SelectItem>
                          <SelectItem value="Central Board (CBSE)">Central Board (CBSE)</SelectItem>
                          <SelectItem value="ICSE">ICSE</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Medium</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="English" id="english" data-testid="radio-english" />
                            <Label htmlFor="english">English</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Hindi" id="hindi" data-testid="radio-hindi" />
                            <Label htmlFor="hindi">Hindi</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SECTION 3: Academic & Medical Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Academic & Medical Information</h3>
                <Separator className="mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="previousSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous School Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter previous school" {...field} data-testid="input-previous-school" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastExamPassed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Exam Passed (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 9th Standard" {...field} data-testid="input-last-exam" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem>
                <FormLabel>Upload Previous Marksheet (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    data-testid="input-marksheet-upload"
                  />
                </FormControl>
                <FormDescription>PDF or image files only</FormDescription>
              </FormItem>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm) (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter height in cm" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          data-testid="input-height" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg) (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter weight in kg" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          data-testid="input-weight" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hasMedicalCondition"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-has-medical-condition"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Any Disease / Medical Condition?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasMedicalCondition && (
                <FormField
                  control={form.control}
                  name="medicalConditionDetails"
                  render={({ field }) => (
                    <FormItem className="pl-6">
                      <FormLabel>Medical Condition Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please describe the medical condition..." 
                          {...field} 
                          data-testid="input-medical-condition-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="doctorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family Doctor's Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter doctor's name" {...field} data-testid="input-doctor-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor's Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit mobile number" {...field} data-testid="input-doctor-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SECTION 4: Guardian & Declarations */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Guardian & Declarations</h3>
                <Separator className="mt-2" />
              </div>

              {admissionStatus === "Hosteller" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Local Guardian Information (Required for Hostellers)</p>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="localGuardianName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guardian Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter guardian name" {...field} data-testid="input-local-guardian-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="localGuardianPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit mobile number" {...field} data-testid="input-local-guardian-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="localGuardianAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter guardian's address" {...field} data-testid="input-local-guardian-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="localGuardianRelation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship to Student</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Uncle, Aunt, Cousin" {...field} data-testid="input-local-guardian-relation" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium">Declarations</p>
                
                <FormField
                  control={form.control}
                  name="declarationTruthful"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-declaration-truthful"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>I declare that the information provided is true.</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="declarationRules"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-declaration-rules"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>I agree that my child will follow all school rules.</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="declarationCancellation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-declaration-cancellation"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>I accept that admission may be cancelled if information is incorrect.</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="studentSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Name (Signature)</FormLabel>
                      <FormControl>
                        <Input placeholder="Type student's full name" {...field} data-testid="input-student-signature" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent/Guardian Name (Signature)</FormLabel>
                      <FormControl>
                        <Input placeholder="Type parent/guardian's full name" {...field} data-testid="input-parent-signature" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes..."
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                data-testid="button-cancel"
              >
                Clear
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-submit">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "create" ? "Submit Enquiry" : "Update Enquiry"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ViewEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry: Enquiry | null;
}

function ViewEnquiryDialog({ open, onOpenChange, enquiry }: ViewEnquiryDialogProps) {
  if (!enquiry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enquiry Details</DialogTitle>
          <DialogDescription>
            Complete information for enquiry #{enquiry.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Student & Family Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Student & Family Information</h3>
              <Separator className="mt-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Enquiry Date</Label>
                <p className="font-medium">{enquiry.date}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Student Name</Label>
                <p className="font-medium">{enquiry.studentName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date of Birth</Label>
                <p className="font-medium">{enquiry.dateOfBirth}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Gender</Label>
                <p className="font-medium">{enquiry.gender}</p>
              </div>
              {enquiry.bloodGroup && (
                <div>
                  <Label className="text-muted-foreground">Blood Group</Label>
                  <p className="font-medium">{enquiry.bloodGroup}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Father's Name</Label>
                <p className="font-medium">{enquiry.fatherName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Phone</Label>
                <p className="font-medium">{enquiry.fatherPhone}</p>
              </div>
              {enquiry.fatherOccupation && (
                <div>
                  <Label className="text-muted-foreground">Father's Occupation</Label>
                  <p className="font-medium">{enquiry.fatherOccupation}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Mother's Name</Label>
                <p className="font-medium">{enquiry.motherName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Mother's Phone</Label>
                <p className="font-medium">{enquiry.motherPhone}</p>
              </div>
              {enquiry.motherOccupation && (
                <div>
                  <Label className="text-muted-foreground">Mother's Occupation</Label>
                  <p className="font-medium">{enquiry.motherOccupation}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Primary Contact</Label>
                <p className="font-medium capitalize">{enquiry.primaryContact}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Primary Contact Number</Label>
                <p className="font-medium">{enquiry.primaryContactNumber}</p>
              </div>
            </div>
            {enquiry.siblingName && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Sibling Information</Label>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Admission No</Label>
                    <p className="font-medium">{enquiry.siblingAdmissionNo}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="font-medium">{enquiry.siblingName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Class</Label>
                    <p className="font-medium">{enquiry.siblingClass}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Contact & Admission Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Contact & Admission Details</h3>
              <Separator className="mt-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <Label className="text-muted-foreground">Residential Address</Label>
                <p className="font-medium">{enquiry.residentialAddress}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">City</Label>
                <p className="font-medium">{enquiry.city}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">State</Label>
                <p className="font-medium">{enquiry.state}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Pincode</Label>
                <p className="font-medium">{enquiry.pincode}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Class Seeking Admission For</Label>
                <p className="font-medium">{enquiry.classAdmissionFor}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Admission Type</Label>
                <p className="font-medium">{enquiry.admissionStatus}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Board Preference</Label>
                <p className="font-medium">{enquiry.board}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Medium of Instruction</Label>
                <p className="font-medium">{enquiry.medium}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Academic & Medical Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Academic & Medical Information</h3>
              <Separator className="mt-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {enquiry.previousSchool && (
                <div>
                  <Label className="text-muted-foreground">Previous School</Label>
                  <p className="font-medium">{enquiry.previousSchool}</p>
                </div>
              )}
              {enquiry.lastExamPassed && (
                <div>
                  <Label className="text-muted-foreground">Last Exam Passed</Label>
                  <p className="font-medium">{enquiry.lastExamPassed}</p>
                </div>
              )}
              {enquiry.height && (
                <div>
                  <Label className="text-muted-foreground">Height (cm)</Label>
                  <p className="font-medium">{enquiry.height}</p>
                </div>
              )}
              {enquiry.weight && (
                <div>
                  <Label className="text-muted-foreground">Weight (kg)</Label>
                  <p className="font-medium">{enquiry.weight}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Medical Condition</Label>
                <p className="font-medium">{enquiry.hasMedicalCondition ? "Yes" : "No"}</p>
              </div>
              {enquiry.medicalConditionDetails && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Medical Condition Details</Label>
                  <p className="font-medium">{enquiry.medicalConditionDetails}</p>
                </div>
              )}
              {enquiry.doctorName && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Doctor Name</Label>
                    <p className="font-medium">{enquiry.doctorName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Doctor Phone</Label>
                    <p className="font-medium">{enquiry.doctorPhone}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 4: Guardian & Declarations */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Guardian & Declarations</h3>
              <Separator className="mt-2" />
            </div>
            {enquiry.localGuardianName && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Local Guardian Name</Label>
                  <p className="font-medium">{enquiry.localGuardianName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Relation</Label>
                  <p className="font-medium">{enquiry.localGuardianRelation}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Local Guardian Address</Label>
                  <p className="font-medium">{enquiry.localGuardianAddress}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Local Guardian Phone</Label>
                  <p className="font-medium">{enquiry.localGuardianPhone}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Declarations</Label>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox checked={enquiry.declarationTruthful} disabled />
                  <span>Information provided is true</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={enquiry.declarationRules} disabled />
                  <span>Will follow all school rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={enquiry.declarationCancellation} disabled />
                  <span>Accept admission cancellation policy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up & Status */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Status & Follow-up</h3>
              <Separator className="mt-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Follow-up Status</Label>
                <div className="mt-1">
                  <Badge variant="secondary">{enquiry.followUpStatus}</Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Final Status</Label>
                <div className="mt-1">
                  <Badge>{enquiry.finalStatus}</Badge>
                </div>
              </div>
              {enquiry.notes && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="font-medium">{enquiry.notes}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Created By</Label>
                <p className="font-medium">{enquiry.createdBy}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-view">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry: Enquiry | null;
}

function StatusUpdateDialog({ open, onOpenChange, enquiry }: StatusUpdateDialogProps) {
  const { toast } = useToast();
  const { updateEnquiry } = useAdmissionData();
  const [followUpStatus, setFollowUpStatus] = useState("");
  const [finalStatus, setFinalStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    if (!followUpStatus) {
      toast({
        title: "Error",
        description: "Please select follow-up status",
        variant: "destructive",
      });
      return;
    }
    
    if (!enquiry) return;
    
    setIsLoading(true);
    try {
      updateEnquiry(enquiry.id, { followUpStatus, finalStatus });
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!enquiry) return null;

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (isOpen) {
          setFollowUpStatus(enquiry.followUpStatus);
          setFinalStatus(enquiry.finalStatus);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>
            Update follow-up and final status for {enquiry.studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Follow-up Status</Label>
            <Select value={followUpStatus} onValueChange={setFollowUpStatus}>
              <SelectTrigger data-testid="select-followup-status">
                <SelectValue placeholder="Select follow-up status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Call back later">Call back later</SelectItem>
                <SelectItem value="Applicant not responding">Applicant not responding</SelectItem>
                <SelectItem value="Not reachable">Not reachable</SelectItem>
                <SelectItem value="Not interested">Not interested</SelectItem>
                <SelectItem value="Proceed to Admission">Proceed to Admission</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mark as Rejected <span className="text-xs text-muted-foreground">(Optional)</span></Label>
            <Select value={finalStatus} onValueChange={setFinalStatus}>
              <SelectTrigger data-testid="select-final-status">
                <SelectValue placeholder="Leave empty if not rejected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-status"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            data-testid="button-update-status"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
