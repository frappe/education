import { BarChart, FileText, Download, Calendar, Users, CheckCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmissionData } from "@/context/AdmissionDataContext";
import { useState } from "react";
import { PieChart, Pie, BarChart as RechartBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { PageHeader } from "@/components/common/PageHeader";

const COLORS = ["#0A2A52", "#F4C015", "#10b981", "#ef4444", "#f97316", "#8b5cf6"];

// Helper function to export data to CSV
const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(","), ...data.map(row => headers.map(h => {
    const value = row[h];
    return typeof value === "string" && value.includes(",") ? `"${value}"` : value;
  }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Helper to filter by date range
const filterByDateRange = (items: any[], startDate: string, endDate: string, dateField: string = "date") => {
  if (!startDate && !endDate) return items;
  return items.filter(item => {
    const itemDate = new Date(item[dateField]);
    const start = startDate ? new Date(startDate) : new Date("1900-01-01");
    const end = endDate ? new Date(endDate) : new Date("2100-12-31");
    return itemDate >= start && itemDate <= end;
  });
};

// Helper to filter by status
const filterByStatus = (items: any[], statusFilter: string, statusField: string) => {
  if (statusFilter === "all") return items;
  return items.filter(item => item[statusField] === statusFilter);
};

export default function AdmissionReports() {
  const { enquiries, registrations, admissions } = useAdmissionData();
  const [filterClass, setFilterClass] = useState<string>("");
  
  // Date range filters for each report
  const [enquiryStartDate, setEnquiryStartDate] = useState<string>("");
  const [enquiryEndDate, setEnquiryEndDate] = useState<string>("");
  const [registrationStartDate, setRegistrationStartDate] = useState<string>("");
  const [registrationEndDate, setRegistrationEndDate] = useState<string>("");
  const [admissionStartDate, setAdmissionStartDate] = useState<string>("");
  const [admissionEndDate, setAdmissionEndDate] = useState<string>("");
  const [followupStartDate, setFollowupStartDate] = useState<string>("");
  const [followupEndDate, setFollowupEndDate] = useState<string>("");
  const [documentStartDate, setDocumentStartDate] = useState<string>("");
  const [documentEndDate, setDocumentEndDate] = useState<string>("");
  const [allocationStartDate, setAllocationStartDate] = useState<string>("");
  const [allocationEndDate, setAllocationEndDate] = useState<string>("");
  
  // Status filters for each report
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<string>("all");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<string>("all");
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState<string>("all");
  const [followupStatusFilter, setFollowupStatusFilter] = useState<string>("all");
  const [documentStatusFilter, setDocumentStatusFilter] = useState<string>("all");
  const [allocationStatusFilter, setAllocationStatusFilter] = useState<string>("all");

  const enquiryStats = {
    total: enquiries.length,
    pending: enquiries.filter((e) => e.finalStatus === "Pending").length,
    registered: enquiries.filter((e) => e.finalStatus === "Registered").length,
    admitted: enquiries.filter((e) => e.finalStatus === "Admitted").length,
    byAdmissionStatus: {
      Hosteller: enquiries.filter((e) => e.admissionStatus === "Hosteller").length,
      DayScholar: enquiries.filter((e) => e.admissionStatus === "Day Scholar").length,
    },
  };

  const registrationStats = {
    total: registrations.length,
    paid: registrations.filter((r) => r.paymentStatus === "Paid").length,
    pending: registrations.filter((r) => r.paymentStatus === "Pending").length,
    revenue: registrations
      .filter((r) => r.paymentStatus === "Paid")
      .reduce((sum, r) => sum + r.registrationFee, 0),
  };

  const admissionStats = {
    total: admissions.length,
    admitted: admissions.filter((a) => a.finalStatus === "Admitted").length,
    pending: admissions.filter((a) => a.finalStatus === "Pending").length,
    rejected: admissions.filter((a) => a.finalStatus === "Rejected").length,
    waitlisted: admissions.filter((a) => a.finalStatus === "Waitlisted").length,
  };

  const documentStats = admissions.map((adm) => ({
    studentName: adm.studentName,
    submitted: Object.values(adm.documents).filter(Boolean).length,
    total: 10,
  }));

  const allocationStats = {
    sectionAssigned: admissions.filter((a) => a.section !== "Not Assigned" && a.section).length,
    houseAssigned: admissions.filter((a) => a.house !== "Not Assigned" && a.house).length,
    totalAdmitted: admissions.filter((a) => a.finalStatus === "ADMITTED").length,
  };

  // Workflow Analytics
  const workflowStats = {
    totalApplications: admissions.length,
    pendingVerification: admissions.filter((a) => a.verificationStatus === "PENDING").length,
    verificationInProgress: admissions.filter((a) => a.verificationStatus === "IN_VERIFICATION").length,
    verificationApproved: admissions.filter((a) => a.verificationStatus === "APPROVED").length,
    pendingAO: admissions.filter((a) => a.aoStatus === "PENDING").length,
    aoApproved: admissions.filter((a) => a.aoStatus === "APPROVED").length,
    aoRejected: admissions.filter((a) => a.aoStatus === "REJECTED").length,
    pendingAdmin: admissions.filter((a) => a.adminStatus === "PENDING").length,
    adminAdmitted: admissions.filter((a) => a.adminStatus === "APPROVED" && a.finalStatus === "ADMITTED").length,
    adminRejected: admissions.filter((a) => a.finalStatus === "REJECTED").length,
    waitlisted: admissions.filter((a) => a.finalStatus === "WAITLIST").length,
  };

  const verificationRate = workflowStats.totalApplications > 0 
    ? Math.round((workflowStats.verificationApproved / workflowStats.totalApplications) * 100) 
    : 0;

  const aoApprovalRate = (workflowStats.aoApproved + workflowStats.aoRejected) > 0
    ? Math.round((workflowStats.aoApproved / (workflowStats.aoApproved + workflowStats.aoRejected)) * 100)
    : 0;

  const adminApprovalRate = (workflowStats.adminAdmitted + workflowStats.adminRejected + workflowStats.waitlisted) > 0
    ? Math.round((workflowStats.adminAdmitted / (workflowStats.adminAdmitted + workflowStats.adminRejected + workflowStats.waitlisted)) * 100)
    : 0;

  // Funnel data
  const funnelData = [
    { name: "Applications", value: workflowStats.totalApplications, color: COLORS[0] },
    { name: "Verified", value: workflowStats.verificationApproved, color: COLORS[1] },
    { name: "AO Approved", value: workflowStats.aoApproved, color: COLORS[2] },
    { name: "Admitted", value: workflowStats.adminAdmitted, color: COLORS[3] },
  ];

  // Status breakdown
  const statusData = [
    { name: "Pending Verification", value: workflowStats.pendingVerification, fill: COLORS[4] },
    { name: "Verified", value: workflowStats.verificationApproved, fill: COLORS[2] },
    { name: "Pending AO", value: workflowStats.pendingAO, fill: COLORS[4] },
    { name: "AO Approved", value: workflowStats.aoApproved, fill: COLORS[2] },
    { name: "Admitted", value: workflowStats.adminAdmitted, fill: COLORS[2] },
    { name: "Rejected", value: workflowStats.adminRejected, fill: COLORS[3] },
  ].filter(d => d.value > 0);

  // Admin decisions breakdown
  const adminDecisionsData = [
    { name: "Admitted", value: workflowStats.adminAdmitted, fill: COLORS[2] },
    { name: "Rejected", value: workflowStats.adminRejected, fill: COLORS[3] },
    { name: "Waitlist", value: workflowStats.waitlisted, fill: COLORS[4] },
  ].filter(d => d.value > 0);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Admissions", href: "/admissions/enquiries" },
        { label: "Reports" }
      ]} />
      <PageHeader
        title="Admission Reports"
        description="View and download admission reports and analytics"
      />

      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-7 bg-[#7880872e] h-auto">
          <TabsTrigger value="workflow" className="text-xs sm:text-sm gap-1"><TrendingUp className="h-3 w-3" />Workflow</TabsTrigger>
          <TabsTrigger value="enquiry" className="text-xs sm:text-sm">Enquiry</TabsTrigger>
          <TabsTrigger value="registration" className="text-xs sm:text-sm">Registration</TabsTrigger>
          <TabsTrigger value="admission" className="text-xs sm:text-sm">Admission</TabsTrigger>
          <TabsTrigger value="followup" className="text-xs sm:text-sm">Follow-up</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
          <TabsTrigger value="allocation" className="text-xs sm:text-sm">Allocation</TabsTrigger>
        </TabsList>

        {/* Workflow Analytics Tab */}
        <TabsContent value="workflow" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workflowStats.totalApplications}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{verificationRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{workflowStats.verificationApproved} verified</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AO Approval Rate</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aoApprovalRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{workflowStats.aoApproved} approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admission Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminApprovalRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{workflowStats.adminAdmitted} admitted</p>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Admission Workflow Funnel</CardTitle>
              <CardDescription>Application flow through each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartBarChart data={funnelData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </RechartBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Analytics Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Verification Status */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Verified", value: workflowStats.verificationApproved },
                        { name: "Pending", value: workflowStats.pendingVerification + workflowStats.verificationInProgress },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={COLORS[2]} />
                      <Cell fill={COLORS[4]} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Admin Decisions */}
            <Card>
              <CardHeader>
                <CardTitle>Admin Decisions Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={adminDecisionsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {adminDecisionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Stage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Stage-wise Application Breakdown</CardTitle>
              <CardDescription>Current status of applications at each approval stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Verification Stage */}
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Document Verification</h3>
                    <Badge variant="outline">{workflowStats.verificationApproved + workflowStats.pendingVerification + workflowStats.verificationInProgress} total</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-lg font-bold text-blue-600">{workflowStats.pendingVerification}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">In Progress</p>
                      <p className="text-lg font-bold text-yellow-600">{workflowStats.verificationInProgress}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Approved</p>
                      <p className="text-lg font-bold text-green-600">{workflowStats.verificationApproved}</p>
                    </div>
                  </div>
                </div>

                {/* AO Approval Stage */}
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">AO Approval</h3>
                    <Badge variant="outline">{workflowStats.aoApproved + workflowStats.aoRejected + workflowStats.pendingAO} total</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-lg font-bold text-blue-600">{workflowStats.pendingAO}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Approved</p>
                      <p className="text-lg font-bold text-green-600">{workflowStats.aoApproved}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Rejected</p>
                      <p className="text-lg font-bold text-red-600">{workflowStats.aoRejected}</p>
                    </div>
                  </div>
                </div>

                {/* Admin Decision Stage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Admin Final Decision</h3>
                    <Badge variant="outline">{workflowStats.adminAdmitted + workflowStats.adminRejected + workflowStats.waitlisted + workflowStats.pendingAdmin} total</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-lg font-bold text-blue-600">{workflowStats.pendingAdmin}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Admitted</p>
                      <p className="text-lg font-bold text-green-600">{workflowStats.adminAdmitted}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Rejected</p>
                      <p className="text-lg font-bold text-red-600">{workflowStats.adminRejected}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Waitlist</p>
                      <p className="text-lg font-bold text-yellow-600">{workflowStats.waitlisted}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button data-testid="button-download-workflow">
              <Download className="h-4 w-4" />
              Download Workflow Report
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="enquiry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enquiry Records</CardTitle>
              <CardDescription>All enquiries with contact details and status</CardDescription>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <Input type="date" value={enquiryStartDate} onChange={(e) => setEnquiryStartDate(e.target.value)} data-testid="input-enquiry-start-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <Input type="date" value={enquiryEndDate} onChange={(e) => setEnquiryEndDate(e.target.value)} data-testid="input-enquiry-end-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">Status</label>
                  <Select value={enquiryStatusFilter} onValueChange={setEnquiryStatusFilter}>
                    <SelectTrigger data-testid="select-enquiry-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Registered">Registered</SelectItem>
                      <SelectItem value="Admitted">Admitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Student Name</th>
                      <th className="text-left p-2">Father Name</th>
                      <th className="text-left p-2">Class</th>
                      <th className="text-left p-2">Contact</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterByStatus(filterByDateRange(enquiries, enquiryStartDate, enquiryEndDate), enquiryStatusFilter, "finalStatus").map((e, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-2">{e.date}</td>
                        <td className="p-2">{e.studentName}</td>
                        <td className="p-2">{e.fatherName}</td>
                        <td className="p-2">{e.classAdmissionFor}</td>
                        <td className="p-2">{e.fatherPhone}</td>
                        <td className="p-2"><Badge variant={e.finalStatus === "Admitted" ? "default" : e.finalStatus === "Pending" ? "secondary" : "outline"}>{e.finalStatus}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button data-testid="button-export-enquiry" onClick={() => {
                const data = filterByStatus(filterByDateRange(enquiries, enquiryStartDate, enquiryEndDate), enquiryStatusFilter, "finalStatus").map(e => ({
                  Date: e.date,
                  "Student Name": e.studentName,
                  "Father Name": e.fatherName,
                  Class: e.classAdmissionFor,
                  Contact: e.fatherPhone,
                  Status: e.finalStatus,
                }));
                exportToCSV(data, "enquiry-report");
              }}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="registration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registration Records</CardTitle>
              <CardDescription>All registrations with payment status</CardDescription>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <Input type="date" value={registrationStartDate} onChange={(e) => setRegistrationStartDate(e.target.value)} data-testid="input-registration-start-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <Input type="date" value={registrationEndDate} onChange={(e) => setRegistrationEndDate(e.target.value)} data-testid="input-registration-end-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">Payment Status</label>
                  <Select value={registrationStatusFilter} onValueChange={setRegistrationStatusFilter}>
                    <SelectTrigger data-testid="select-registration-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Student Name</th>
                      <th className="text-left p-2">Class</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Payment Status</th>
                      <th className="text-left p-2">Receipt No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterByStatus(filterByDateRange(registrations, registrationStartDate, registrationEndDate), registrationStatusFilter, "paymentStatus").map((r, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-2">{r.date}</td>
                        <td className="p-2">{r.studentName}</td>
                        <td className="p-2">{r.classAdmissionFor}</td>
                        <td className="p-2">₹{r.registrationFee}</td>
                        <td className="p-2"><Badge variant={r.paymentStatus === "Paid" ? "default" : "secondary"}>{r.paymentStatus}</Badge></td>
                        <td className="p-2">{r.receiptNumber || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button data-testid="button-export-registration" onClick={() => {
                const data = filterByStatus(filterByDateRange(registrations, registrationStartDate, registrationEndDate), registrationStatusFilter, "paymentStatus").map(r => ({
                  Date: r.date,
                  "Student Name": r.studentName,
                  Class: r.classAdmissionFor,
                  Amount: r.registrationFee,
                  "Payment Status": r.paymentStatus,
                  "Receipt No": r.receiptNumber || "",
                }));
                exportToCSV(data, "registration-report");
              }}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="admission" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admission Records</CardTitle>
              <CardDescription>All admitted students with class and house assignments</CardDescription>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <Input type="date" value={admissionStartDate} onChange={(e) => setAdmissionStartDate(e.target.value)} data-testid="input-admission-start-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <Input type="date" value={admissionEndDate} onChange={(e) => setAdmissionEndDate(e.target.value)} data-testid="input-admission-end-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">Status</label>
                  <Select value={admissionStatusFilter} onValueChange={setAdmissionStatusFilter}>
                    <SelectTrigger data-testid="select-admission-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ADMITTED">Admitted</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="WAITLIST">Waitlist</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Student Name</th>
                      <th className="text-left p-2">Class</th>
                      <th className="text-left p-2">Section</th>
                      <th className="text-left p-2">House</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterByStatus(filterByDateRange(admissions, admissionStartDate, admissionEndDate), admissionStatusFilter, "finalStatus").map((a, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-2">{a.studentName}</td>
                        <td className="p-2">{a.classAdmissionFor}</td>
                        <td className="p-2">{a.section || "Not Assigned"}</td>
                        <td className="p-2">{a.house || "Not Assigned"}</td>
                        <td className="p-2"><Badge variant={a.finalStatus === "ADMITTED" ? "default" : a.finalStatus === "REJECTED" ? "destructive" : "secondary"}>{a.finalStatus}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button data-testid="button-export-admission" onClick={() => {
                const data = filterByStatus(filterByDateRange(admissions, admissionStartDate, admissionEndDate), admissionStatusFilter, "finalStatus").map(a => ({
                  "Student Name": a.studentName,
                  Class: a.classAdmissionFor,
                  Section: a.section || "Not Assigned",
                  House: a.house || "Not Assigned",
                  Status: a.finalStatus,
                }));
                exportToCSV(data, "admission-report");
              }}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="followup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Records</CardTitle>
              <CardDescription>All enquiries with follow-up status and notes</CardDescription>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <Input type="date" value={followupStartDate} onChange={(e) => setFollowupStartDate(e.target.value)} data-testid="input-followup-start-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <Input type="date" value={followupEndDate} onChange={(e) => setFollowupEndDate(e.target.value)} data-testid="input-followup-end-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">Follow-up Status</label>
                  <Select value={followupStatusFilter} onValueChange={setFollowupStatusFilter}>
                    <SelectTrigger data-testid="select-followup-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Call back later">Call back later</SelectItem>
                      <SelectItem value="Proceed to Admission">Proceed to Admission</SelectItem>
                      <SelectItem value="Not interested">Not interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Student Name</th>
                      <th className="text-left p-2">Contact</th>
                      <th className="text-left p-2">Follow-up Status</th>
                      <th className="text-left p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterByStatus(filterByDateRange(enquiries, followupStartDate, followupEndDate), followupStatusFilter, "followUpStatus").map((e, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-2">{e.date}</td>
                        <td className="p-2">{e.studentName}</td>
                        <td className="p-2">{e.primaryContactNumber}</td>
                        <td className="p-2"><Badge variant={e.followUpStatus === "Proceed to Admission" ? "default" : e.followUpStatus === "Not interested" ? "destructive" : "secondary"}>{e.followUpStatus}</Badge></td>
                        <td className="p-2 text-xs">{e.customFollowUp || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button data-testid="button-export-followup" onClick={() => {
                const data = filterByStatus(filterByDateRange(enquiries, followupStartDate, followupEndDate), followupStatusFilter, "followUpStatus").map(e => ({
                  Date: e.date,
                  "Student Name": e.studentName,
                  Contact: e.primaryContactNumber,
                  "Follow-up Status": e.followUpStatus,
                  Notes: e.customFollowUp || "",
                }));
                exportToCSV(data, "followup-report");
              }}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Submission Records</CardTitle>
              <CardDescription>Track document status for each applicant</CardDescription>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <Input type="date" value={documentStartDate} onChange={(e) => setDocumentStartDate(e.target.value)} data-testid="input-document-start-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <Input type="date" value={documentEndDate} onChange={(e) => setDocumentEndDate(e.target.value)} data-testid="input-document-end-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">Document Status</label>
                  <Select value={documentStatusFilter} onValueChange={setDocumentStatusFilter}>
                    <SelectTrigger data-testid="select-document-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Student Name</th>
                      <th className="text-left p-2">Total Required</th>
                      <th className="text-left p-2">Submitted</th>
                      <th className="text-left p-2">Verified</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterByDateRange(admissions, documentStartDate, documentEndDate).filter(a => {
                      const docCount = Object.values(a.documents).filter(Boolean).length;
                      const docStatus = docCount === 10 ? "Complete" : docCount > 0 ? "In Progress" : "Not Started";
                      return documentStatusFilter === "all" || docStatus === documentStatusFilter;
                    }).map((a, i) => {
                      const docCount = Object.values(a.documents).filter(Boolean).length;
                      return (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="p-2">{a.studentName}</td>
                          <td className="p-2">10</td>
                          <td className="p-2">{docCount}</td>
                          <td className="p-2">{Object.values(a.documentApprovals || {}).filter((d: any) => d === "APPROVED").length}</td>
                          <td className="p-2">
                            <Badge variant={docCount === 10 ? "default" : docCount > 0 ? "secondary" : "outline"}>
                              {docCount === 10 ? "Complete" : docCount > 0 ? "In Progress" : "Not Started"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button data-testid="button-export-documents" onClick={() => {
                const data = filterByDateRange(admissions, documentStartDate, documentEndDate).filter(a => {
                  const docCount = Object.values(a.documents).filter(Boolean).length;
                  const docStatus = docCount === 10 ? "Complete" : docCount > 0 ? "In Progress" : "Not Started";
                  return documentStatusFilter === "all" || docStatus === documentStatusFilter;
                }).map(a => ({
                  "Student Name": a.studentName,
                  "Total Required": 10,
                  "Submitted": Object.values(a.documents).filter(Boolean).length,
                  "Verified": Object.values(a.documentApprovals || {}).filter((d: any) => d === "APPROVED").length,
                  "Status": Object.values(a.documents).filter(Boolean).length === 10 ? "Complete" : Object.values(a.documents).filter(Boolean).length > 0 ? "In Progress" : "Not Started",
                }));
                exportToCSV(data, "document-report");
              }}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Section & House Allocation</CardTitle>
              <CardDescription>Class-wise distribution of admitted students</CardDescription>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <Input type="date" value={allocationStartDate} onChange={(e) => setAllocationStartDate(e.target.value)} data-testid="input-allocation-start-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <Input type="date" value={allocationEndDate} onChange={(e) => setAllocationEndDate(e.target.value)} data-testid="input-allocation-end-date" />
                </div>
                <div>
                  <label className="text-xs font-medium">Allocation Status</label>
                  <Select value={allocationStatusFilter} onValueChange={setAllocationStatusFilter}>
                    <SelectTrigger data-testid="select-allocation-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="both">Both Assigned</SelectItem>
                      <SelectItem value="section">Section Only</SelectItem>
                      <SelectItem value="house">House Only</SelectItem>
                      <SelectItem value="none">None Assigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Class</th>
                      <th className="text-left p-2">Student Name</th>
                      <th className="text-left p-2">Section</th>
                      <th className="text-left p-2">House</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterByDateRange(admissions.filter(a => a.finalStatus === "ADMITTED"), allocationStartDate, allocationEndDate).filter(a => {
                      const hasSection = a.section && a.section !== "Not Assigned";
                      const hasHouse = a.house && a.house !== "Not Assigned";
                      if (allocationStatusFilter === "all") return true;
                      if (allocationStatusFilter === "both") return hasSection && hasHouse;
                      if (allocationStatusFilter === "section") return hasSection && !hasHouse;
                      if (allocationStatusFilter === "house") return !hasSection && hasHouse;
                      if (allocationStatusFilter === "none") return !hasSection && !hasHouse;
                      return true;
                    }).map((a, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-2">{a.classAdmissionFor}</td>
                        <td className="p-2">{a.studentName}</td>
                        <td className="p-2"><Badge variant={a.section && a.section !== "Not Assigned" ? "default" : "secondary"}>{a.section || "Not Assigned"}</Badge></td>
                        <td className="p-2"><Badge variant={a.house && a.house !== "Not Assigned" ? "default" : "secondary"}>{a.house || "Not Assigned"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button data-testid="button-export-allocation" onClick={() => {
                const data = filterByDateRange(admissions.filter(a => a.finalStatus === "ADMITTED"), allocationStartDate, allocationEndDate).filter(a => {
                  const hasSection = a.section && a.section !== "Not Assigned";
                  const hasHouse = a.house && a.house !== "Not Assigned";
                  if (allocationStatusFilter === "all") return true;
                  if (allocationStatusFilter === "both") return hasSection && hasHouse;
                  if (allocationStatusFilter === "section") return hasSection && !hasHouse;
                  if (allocationStatusFilter === "house") return !hasSection && hasHouse;
                  if (allocationStatusFilter === "none") return !hasSection && !hasHouse;
                  return true;
                }).map(a => ({
                  Class: a.classAdmissionFor,
                  "Student Name": a.studentName,
                  Section: a.section || "Not Assigned",
                  House: a.house || "Not Assigned",
                }));
                exportToCSV(data, "allocation-report");
              }}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
