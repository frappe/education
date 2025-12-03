import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, Upload, X, Download, ChevronUp, ChevronDown, ChevronsUpDown, Zap } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Application } from "@shared/schema";
import { useApp } from "@/context/AppContext";
import { useAdmissionData } from "@/context/AdmissionDataContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

export default function AdmissionApplications() {
  const { hasPermission } = useApp();
  const { admissions, addAdmission, updateAdmission, registrations, enquiries } = useAdmissionData();
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
  const [isPaidRegistrationDialogOpen, setIsPaidRegistrationDialogOpen] = useState(false);

  const filteredAdmissions = admissions
    .filter((adm) => {
      const matchesSearch =
        adm.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adm.applicationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adm.fatherMobile.includes(searchTerm);

      const matchesStatus = statusFilter === "all" || adm.finalStatus === statusFilter;
      const matchesClass = classFilter === "all" || adm.classAdmissionFor === classFilter;
      
      let matchesDate = true;
      if (dateFromFilter || dateToFilter) {
        const appDate = new Date(adm.dateOfApplication).getTime();
        if (dateFromFilter) matchesDate = matchesDate && appDate >= new Date(dateFromFilter).getTime();
        if (dateToFilter) matchesDate = matchesDate && appDate <= new Date(dateToFilter).getTime();
      }

      return matchesSearch && matchesStatus && matchesClass && matchesDate;
    })
    .sort((a, b) => {
      let compareValue = 0;
      if (sortBy === "date") {
        compareValue = new Date(a.dateOfApplication).getTime() - new Date(b.dateOfApplication).getTime();
      } else if (sortBy === "name") {
        compareValue = a.studentName.localeCompare(b.studentName);
      } else if (sortBy === "status") {
        compareValue = a.finalStatus.localeCompare(b.finalStatus);
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

  const paginatedAdmissions = filteredAdmissions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredAdmissions.length / pageSize);

  const handleExportCSV = () => {
    const csv = [
      ["App. No.", "Date", "Student Name", "Class", "Father's Name", "Mobile", "Section", "House", "Status"],
      ...filteredAdmissions.map((a) => [
        a.applicationNo,
        a.dateOfApplication,
        a.studentName,
        a.classAdmissionFor,
        a.fatherName,
        a.fatherMobile,
        a.section !== "Not Assigned" ? a.section : "-",
        a.house !== "Not Assigned" ? a.house : "-",
        a.finalStatus,
      ]),
    ]
      .map((row) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admission_applications_${new Date().toISOString().split('T')[0]}.csv`;
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
      setSelectedIds(new Set(paginatedAdmissions.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const classes = Array.from(new Set(admissions.map((a) => a.classAdmissionFor).filter(Boolean))).sort();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", icon: any }> = {
      Pending: { variant: "secondary", icon: Clock },
      Admitted: { variant: "default", icon: CheckCircle },
      Rejected: { variant: "destructive", icon: XCircle },
      Waitlisted: { variant: "secondary", icon: Clock },
    };
    const config = variants[status] || variants.Pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const handleView = (admission: any) => {
    setSelectedAdmission(admission);
  };

  const paidRegistrations = registrations.filter(
    (reg: any) => reg.paymentStatus === "Paid"
  );

  const handleSelectPaidRegistration = (registration: any) => {
    navigate(`/admissions/applications/new?registration=${registration.id}`);
    setIsPaidRegistrationDialogOpen(false);
  };

  const canManage = hasPermission("canManageAdmissions");

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Admissions", href: "/admissions/enquiries" },
        { label: "Applications" }
      ]} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Admission Applications
          </h1>
          <p className="text-muted-foreground">
            Manage admission applications and documents
          </p>
        </div>
        {canManage && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link href="/admissions/applications/new">
              <Button data-testid="button-create-application" className="w-full">
                <Plus className="h-4 w-4" />
                New Application
              </Button>
            </Link>
            <Button 
              variant="outline" 
              data-testid="button-create-from-paid-registration" 
              className="w-full"
              onClick={() => setIsPaidRegistrationDialogOpen(true)}
            >
              <Zap className="h-4 w-4" />
              Create from Paid Registration
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-applications">
              {filteredAdmissions.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Filtered results</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-admitted">
              {filteredAdmissions.filter((a) => a.finalStatus === "Admitted").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending">
              {filteredAdmissions.filter((a) => a.finalStatus === "Pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-rejected">
              {filteredAdmissions.filter((a) => a.finalStatus === "Rejected").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle>All Applications</CardTitle>
              <Button onClick={handleExportCSV} size="sm" variant="outline" data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, app no..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-applications"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Admitted">Admitted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Waitlisted">Waitlisted</SelectItem>
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
                      checked={selectedIds.size === paginatedAdmissions.length && paginatedAdmissions.length > 0}
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
                      App. No.
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
                  <TableHead>Class</TableHead>
                  <TableHead>Father's Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>House</TableHead>
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
                    </div>
                  </TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
            <TableBody>
              {paginatedAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 12 : 11} className="text-center text-muted-foreground">
                    No applications found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAdmissions.map((admission) => (
                  <TableRow key={admission.id} data-testid={`row-application-${admission.id}`}>
                    <TableCell className="w-8">
                      <Checkbox
                        checked={selectedIds.has(admission.id)}
                        onCheckedChange={() => handleToggleSelect(admission.id)}
                        data-testid={`checkbox-select-${admission.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {admission.applicationNo}
                    </TableCell>
                    <TableCell className="text-sm">{admission.dateOfApplication}</TableCell>
                    <TableCell className="font-medium">{admission.studentName}</TableCell>
                    <TableCell>{admission.classAdmissionFor}</TableCell>
                    <TableCell>{admission.fatherName}</TableCell>
                    <TableCell>{admission.fatherMobile}</TableCell>
                    <TableCell>
                      {admission.section !== "Not Assigned" ? (
                        <Badge variant="secondary">{admission.section}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {admission.house !== "Not Assigned" ? (
                        <Badge variant="secondary">{admission.house}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(admission.finalStatus)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(admission)}
                          data-testid={`button-view-${admission.id}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
          {filteredAdmissions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAdmissions.length)} of {filteredAdmissions.length}
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

      <AdmissionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {selectedAdmission && (
        <AdmissionViewDialog
          admission={selectedAdmission}
          open={!!selectedAdmission}
          onOpenChange={() => setSelectedAdmission(null)}
        />
      )}

      <Dialog open={isPaidRegistrationDialogOpen} onOpenChange={setIsPaidRegistrationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Application from Paid Registration</DialogTitle>
            <DialogDescription>
              Select a registration with paid fee (₹500) to start a new application
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {paidRegistrations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No registrations with paid fees found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidRegistrations.map((reg: any) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-mono text-sm">{reg.registrationNo}</TableCell>
                        <TableCell>{reg.studentName}</TableCell>
                        <TableCell>{reg.classAdmissionFor}</TableCell>
                        <TableCell>{reg.paymentDate || "-"}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => handleSelectPaidRegistration(reg)}
                            data-testid={`button-select-registration-${reg.id}`}
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AdmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const admissionInsertSchema = z.object({
  registrationId: z.string().optional(),
  dateOfApplication: z.string(),
  academicYear: z.string(),
  studentName: z.string(),
  dateOfBirth: z.string(),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.string().optional(),
  aadharNo: z.string().optional(),
  fatherName: z.string(),
  fatherAadhar: z.string().optional(),
  fatherMobile: z.string(),
  fatherOccupation: z.string().optional(),
  motherName: z.string(),
  motherAadhar: z.string().optional(),
  motherMobile: z.string().optional(),
  motherOccupation: z.string().optional(),
  permanentAddress: z.string(),
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  classAdmissionFor: z.string(),
  section: z.string().default("Not Assigned"),
  house: z.string().default("Not Assigned"),
  documents: z.any().optional(),
  finalStatus: z.string().default("PENDING"),
  remarks: z.string().optional(),
});

function AdmissionDialog({ open, onOpenChange }: AdmissionDialogProps) {
  const { addAdmission, admissions } = useAdmissionData();
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(admissionInsertSchema),
    defaultValues: {
      dateOfApplication: new Date().toISOString().split("T")[0],
      academicYear: "2025-26",
      studentName: "",
      dateOfBirth: "",
      gender: "Male" as const,
      bloodGroup: "",
      aadharNo: "",
      fatherName: "",
      fatherAadhar: "",
      fatherMobile: "",
      fatherOccupation: "",
      motherName: "",
      motherAadhar: "",
      motherMobile: "",
      motherOccupation: "",
      permanentAddress: "",
      previousSchool: "",
      previousClass: "",
      classAdmissionFor: "",
      section: "Not Assigned" as const,
      house: "Not Assigned" as const,
      documents: {
        transferCertificate: { uploaded: false },
        marksheet: { uploaded: false },
        aadharCard: { uploaded: false },
        casteCertificate: { uploaded: false },
        birthCertificate: { uploaded: false },
        photos: { uploaded: false },
        medicalCertificate: { uploaded: false },
        bankDetails: { uploaded: false },
        penNumber: { uploaded: false },
        apaarId: { uploaded: false },
      },
      followUpStatus: "Pending" as const,
      finalStatus: "Pending" as const,
      remarks: "",
    },
  });

  const handleFileUpload = (fieldName: string, file: File | null) => {
    if (file) {
      const fileInfo = {
        uploaded: true,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
      };
      form.setValue(`documents.${fieldName}` as any, fileInfo);
    } else {
      form.setValue(`documents.${fieldName}` as any, { uploaded: false });
    }
  };

  const onSubmit = (data: Omit<Admission, "id" | "applicationNo" | "createdBy">) => {
    try {
      const newAdmission: Admission = {
        ...data,
        id: `ADM-${Date.now()}`,
        applicationNo: `APP-${new Date().getFullYear()}-${String(admissions.length + 1).padStart(4, '0')}`,
        createdBy: "Admin",
      };
      addAdmission(newAdmission);
      toast({
        title: "Success",
        description: "Admission application created successfully",
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create admission application",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Admission Application</DialogTitle>
          <DialogDescription>
            Fill in the complete admission application form
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-[#7880872e]">
                <TabsTrigger value="student">Student Info</TabsTrigger>
                <TabsTrigger value="parents">Parent Info</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="admission">Admission Details</TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateOfApplication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-app-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="academicYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Academic Year</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-academic-year" />
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
                      <FormLabel>Student Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student full name" {...field} data-testid="input-student-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                              <SelectValue placeholder="Select gender" />
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
                        <FormLabel>Blood Group</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., A+" {...field} data-testid="input-blood-group" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="aadharNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="12-digit Aadhar number" {...field} data-testid="input-student-aadhar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="permanentAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permanent Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter complete address" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="parents" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">Father's Information</h3>
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
                      name="fatherMobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father's Mobile</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit mobile" {...field} data-testid="input-father-mobile" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fatherAadhar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father's Aadhar</FormLabel>
                          <FormControl>
                            <Input placeholder="12-digit Aadhar" {...field} data-testid="input-father-aadhar" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fatherOccupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father's Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter occupation" {...field} data-testid="input-father-occupation" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Mother's Information</h3>
                  <div className="grid grid-cols-2 gap-4">
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

                    <FormField
                      control={form.control}
                      name="motherMobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother's Mobile</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit mobile" {...field} data-testid="input-mother-mobile" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="motherAadhar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother's Aadhar</FormLabel>
                          <FormControl>
                            <Input placeholder="12-digit Aadhar" {...field} data-testid="input-mother-aadhar" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="motherOccupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother's Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter occupation" {...field} data-testid="input-mother-occupation" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Upload the required documents
                </p>
                <div className="grid gap-4">
                  {[
                    { name: "transferCertificate", label: "Transfer Certificate (Original)" },
                    { name: "marksheet", label: "Marksheet (Photo Copy)" },
                    { name: "aadharCard", label: "Aadhar Card (Student & Parents)" },
                    { name: "casteCertificate", label: "Caste Certificate" },
                    { name: "birthCertificate", label: "Birth Certificate" },
                    { name: "photos", label: "Photos (Student & Parents)" },
                    { name: "medicalCertificate", label: "Medical Certificate" },
                    { name: "bankDetails", label: "Bank Account Details" },
                    { name: "penNumber", label: "PEN Number from UDISE Code" },
                    { name: "apaarId", label: "APAAR ID" },
                  ].map((doc) => {
                    const docValue = form.watch(`documents.${doc.name}` as any);
                    const isUploaded = docValue?.uploaded;
                    
                    return (
                      <div key={doc.name} className="flex items-center gap-3 p-3 border rounded-md">
                        <div className="flex-1">
                          <FormLabel className="text-sm font-medium">{doc.label}</FormLabel>
                          {isUploaded && docValue?.fileName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {docValue.fileName} ({(docValue.fileSize / 1024).toFixed(1)} KB)
                            </p>
                          )}
                        </div>
                        {isUploaded ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Uploaded
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleFileUpload(doc.name, null)}
                              data-testid={`button-remove-${doc.name}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(doc.name, file);
                                }
                              }}
                              className="hidden"
                              id={`file-${doc.name}`}
                              data-testid={`input-file-${doc.name}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(`file-${doc.name}`)?.click()}
                              data-testid={`button-upload-${doc.name}`}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="admission" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="previousSchool"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous School</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter previous school" {...field} data-testid="input-previous-school" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="previousClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Class</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 9th" {...field} data-testid="input-previous-class" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="classAdmissionFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Admission For</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10th" {...field} data-testid="input-admission-class" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="section"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-section">
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Not Assigned">Not Assigned</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="house"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>House</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-house">
                              <SelectValue placeholder="Select house" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Not Assigned">Not Assigned</SelectItem>
                            <SelectItem value="Aastha">Aastha</SelectItem>
                            <SelectItem value="Abhilasha">Abhilasha</SelectItem>
                            <SelectItem value="Asmita">Asmita</SelectItem>
                            <SelectItem value="Aradhana">Aradhana</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="followUpStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-followup-status">
                            <SelectValue placeholder="Select follow-up status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Documents Pending">Documents Pending</SelectItem>
                          <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="finalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-final-status">
                            <SelectValue placeholder="Select final status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Admitted">Admitted</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                          <SelectItem value="Waitlisted">Waitlisted</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add any additional remarks..." {...field} data-testid="input-remarks" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit">
                Create Application
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface AdmissionViewDialogProps {
  admission: Admission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AdmissionViewDialog({ admission, open, onOpenChange }: AdmissionViewDialogProps) {
  const documentsList = Object.entries(admission.documents).filter(([_, value]) => value?.uploaded);
  const documentsSubmitted = documentsList.length;
  const totalDocuments = 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
          <DialogDescription>
            Application No: {admission.applicationNo}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="student">Student Info</TabsTrigger>
            <TabsTrigger value="parents">Parent Info</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documentsSubmitted}/{totalDocuments})</TabsTrigger>
          </TabsList>

          <TabsContent value="student" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Student Name</p>
                <p className="font-medium">{admission.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{admission.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{admission.gender}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blood Group</p>
                <p className="font-medium">{admission.bloodGroup || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class Admission For</p>
                <p className="font-medium">{admission.classAdmissionFor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Section</p>
                <p className="font-medium">{admission.section}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">House</p>
                <p className="font-medium">{admission.house}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <Badge variant={admission.finalStatus === "Admitted" ? "default" : "secondary"}>
                    {admission.finalStatus}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{admission.permanentAddress}</p>
            </div>
          </TabsContent>

          <TabsContent value="parents" className="space-y-4 pt-4">
            <div>
              <h4 className="font-semibold mb-2">Father's Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{admission.fatherName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium">{admission.fatherMobile}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Occupation</p>
                  <p className="font-medium">{admission.fatherOccupation || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aadhar</p>
                  <p className="font-medium">{admission.fatherAadhar || "-"}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Mother's Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{admission.motherName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium">{admission.motherMobile || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Occupation</p>
                  <p className="font-medium">{admission.motherOccupation || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aadhar</p>
                  <p className="font-medium">{admission.motherAadhar || "-"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 pt-4">
            <div className="grid gap-3">
              {[
                { key: "transferCertificate", label: "Transfer Certificate" },
                { key: "marksheet", label: "Marksheet" },
                { key: "aadharCard", label: "Aadhar Card" },
                { key: "casteCertificate", label: "Caste Certificate" },
                { key: "birthCertificate", label: "Birth Certificate" },
                { key: "photos", label: "Photos" },
                { key: "medicalCertificate", label: "Medical Certificate" },
                { key: "bankDetails", label: "Bank Details" },
                { key: "penNumber", label: "PEN Number" },
                { key: "apaarId", label: "APAAR ID" },
              ].map((doc) => {
                const docData = admission.documents[doc.key as keyof typeof admission.documents];
                const isUploaded = docData?.uploaded;
                
                return (
                  <div key={doc.key} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      {isUploaded ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <span className={isUploaded ? "font-medium" : "text-muted-foreground"}>
                          {doc.label}
                        </span>
                        {isUploaded && docData?.fileName && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {docData.fileName} ({(docData.fileSize! / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>
                    </div>
                    {isUploaded && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Uploaded
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {admission.remarks && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Remarks</p>
                <p className="font-medium">{admission.remarks}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
