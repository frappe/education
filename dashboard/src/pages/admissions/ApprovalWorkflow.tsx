import { useState } from "react";
import { useAdmissionData } from "@/context/AdmissionDataContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Breadcrumb } from "@/components/Breadcrumb";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, FileText, User, Clock, Download, AlertCircle, CheckCircle2, Eye } from "lucide-react";

const DOCUMENT_TYPES = [
  "Transfer Certificate",
  "Marksheet",
  "Aadhar Card",
  "Caste Certificate",
  "Birth Certificate",
  "Photos",
  "Medical Certificate",
  "Bank Details",
  "PEN Number",
  "APAAR ID",
];

export default function ApprovalWorkflow() {
  const { user } = useApp();
  const { applications, verifyDocuments, approveByAO, approveByAdmin, assignHouseAndClass } = useAdmissionData();
  const { toast } = useToast();
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"verify" | "ao" | "admin" | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "waitlist" | "correction" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [sectionAssignment, setSectionAssignment] = useState("");
  const [houseAssignment, setHouseAssignment] = useState("");
  const [documentApprovals, setDocumentApprovals] = useState<Record<string, "approved" | "rejected" | null>>({});
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);

  // Filter applications based on user role
  const pendingVerification = applications.filter((app) => app.verificationStatus === "PENDING" || app.verificationStatus === "IN_VERIFICATION");
  const pendingAOApproval = applications.filter((app) => app.aoStatus === "PENDING");
  const pendingAdminApproval = applications.filter((app) => app.adminStatus === "PENDING");

  const openView = (app: any, type: "verify" | "ao" | "admin") => {
    setSelectedApp(app);
    setDecisionType(type);
    setViewDialogOpen(true);
    setDecision(null);
    setRemarks("");
    setSectionAssignment(app.section || "");
    setHouseAssignment(app.house || "");
    setDocumentApprovals({});
  };

  const toggleDocumentApproval = (docName: string, status: "approved" | "rejected") => {
    setDocumentApprovals(prev => ({
      ...prev,
      [docName]: prev[docName] === status ? null : status
    }));
  };

  const getApprovedDocumentCount = () => {
    return Object.values(documentApprovals).filter(status => status === "approved").length;
  };

  const getAllDocumentsReviewed = () => {
    return DOCUMENT_TYPES.every(doc => documentApprovals[doc] !== null && documentApprovals[doc] !== undefined);
  };

  const handleVerifyDocuments = (approved: boolean) => {
    if (!selectedApp) return;
    try {
      verifyDocuments(selectedApp.id, approved, remarks);
      toast({
        title: "Success",
        description: approved ? "Documents verified successfully" : "Documents sent for correction",
      });
      setSelectedApp(null);
      setViewDialogOpen(false);
      setDecision(null);
      setRemarks("");
      setDocumentApprovals({});
    } catch (error) {
      toast({ title: "Error", description: "Failed to process verification", variant: "destructive" });
    }
  };

  const handleAOApproval = (approved: boolean) => {
    if (!selectedApp) return;
    try {
      approveByAO(selectedApp.id, approved, remarks);
      toast({
        title: "Success",
        description: approved ? "Application approved by AO" : "Application rejected by AO",
      });
      setSelectedApp(null);
      setViewDialogOpen(false);
      setDecision(null);
      setRemarks("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to process AO approval", variant: "destructive" });
    }
  };

  const handleAdminApproval = () => {
    if (!selectedApp || !decision) return;
    try {
      approveByAdmin(selectedApp.id, decision === "approve", remarks);
      if (decision === "approve" && sectionAssignment && houseAssignment) {
        assignHouseAndClass(selectedApp.id, houseAssignment, sectionAssignment);
      }
      toast({
        title: "Success",
        description: `Application ${decision} successfully`,
      });
      setSelectedApp(null);
      setViewDialogOpen(false);
      setDecision(null);
      setRemarks("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to process admin approval", variant: "destructive" });
    }
  };

  const ApplicationCard = ({ app, type }: any) => (
    <Card className="hover-elevate cursor-pointer" onClick={() => openView(app, type)} data-testid={`card-application-${app.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{app.studentName}</CardTitle>
            <p className="text-sm text-muted-foreground">{app.applicationNo}</p>
          </div>
          <Badge>{app.finalStatus}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Class:</span> {app.classAdmissionFor}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Applied:</span> {app.dateOfApplication}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Father:</span> {app.fatherName}
        </div>
      </CardContent>
    </Card>
  );

  // Document Verification View
  const DocumentVerificationView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Student Name</Label>
          <p className="font-semibold">{selectedApp?.studentName}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Application No.</Label>
          <p className="font-semibold">{selectedApp?.applicationNo}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Father's Name</Label>
          <p className="font-semibold">{selectedApp?.fatherName}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Class</Label>
          <p className="font-semibold">{selectedApp?.classAdmissionFor}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Mobile</Label>
          <p className="font-semibold">{selectedApp?.fatherMobile}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Application Date</Label>
          <p className="font-semibold">{selectedApp?.dateOfApplication}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Document Review</Label>
          <span className="text-sm text-muted-foreground">
            {getApprovedDocumentCount()} / {DOCUMENT_TYPES.length} documents approved
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DOCUMENT_TYPES.map((doc) => {
              const docKey = doc.toLowerCase().replace(/\s+/g, "");
              const isUploaded = selectedApp?.documents?.[docKey]?.uploaded || false;
              const approvalStatus = documentApprovals[doc];
              
              return (
                <TableRow key={doc}>
                  <TableCell>{doc}</TableCell>
                  <TableCell>
                    {!isUploaded ? (
                      <Badge variant="outline">Not Uploaded</Badge>
                    ) : approvalStatus === "approved" ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : approvalStatus === "rejected" ? (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending Review</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isUploaded && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingDocument(doc)}
                          data-testid={`button-view-${doc.toLowerCase().replace(/\s+/g, "-")}`}
                          title="View document"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={approvalStatus === "approved" ? "default" : "outline"}
                          onClick={() => toggleDocumentApproval(doc, "approved")}
                          data-testid={`button-approve-${doc.toLowerCase().replace(/\s+/g, "-")}`}
                          title="Approve"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={approvalStatus === "rejected" ? "destructive" : "outline"}
                          onClick={() => toggleDocumentApproval(doc, "rejected")}
                          data-testid={`button-reject-${doc.toLowerCase().replace(/\s+/g, "-")}`}
                          title="Reject"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div>
        <Label htmlFor="remarks">Verifier Remarks</Label>
        <Textarea
          id="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add notes about document verification..."
          className="mt-1"
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => handleVerifyDocuments(true)}
          className="flex-1"
          disabled={!getAllDocumentsReviewed()}
          title={!getAllDocumentsReviewed() ? "Review all documents before approving" : ""}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve All Documents
        </Button>
        <Button
          onClick={() => handleVerifyDocuments(false)}
          className="flex-1"
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject & Request Correction
        </Button>
      </div>
    </div>
  );

  // AO Approval View
  const AOApprovalView = () => (
    <div className="space-y-6">
      {/* Student Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Student Name</Label>
              <p className="font-semibold">{selectedApp?.studentName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date of Birth</Label>
              <p className="font-semibold">{selectedApp?.dateOfBirth}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Gender</Label>
              <p className="font-semibold">{selectedApp?.gender}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Blood Group</Label>
              <p className="font-semibold">{selectedApp?.bloodGroup}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Aadhar No.</Label>
              <p className="font-semibold">{selectedApp?.aadharNo}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Application No.</Label>
              <p className="font-semibold">{selectedApp?.applicationNo}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parent Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parent Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Father's Name</Label>
                <p className="font-semibold">{selectedApp?.fatherName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Mobile</Label>
                <p className="font-semibold">{selectedApp?.fatherMobile}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Occupation</Label>
                <p className="font-semibold">{selectedApp?.fatherOccupation}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Aadhar</Label>
                <p className="font-semibold">{selectedApp?.fatherAadhar}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mother's Name</Label>
                  <p className="font-semibold">{selectedApp?.motherName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mother's Mobile</Label>
                  <p className="font-semibold">{selectedApp?.motherMobile}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mother's Occupation</Label>
                  <p className="font-semibold">{selectedApp?.motherOccupation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mother's Aadhar</Label>
                  <p className="font-semibold">{selectedApp?.motherAadhar}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Previous School</Label>
              <p className="font-semibold">{selectedApp?.previousSchool}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Previous Class</Label>
              <p className="font-semibold">{selectedApp?.previousClass}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Class Admission For</Label>
              <p className="font-semibold">{selectedApp?.classAdmissionFor}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Permanent Address</Label>
              <p className="font-semibold text-sm">{selectedApp?.permanentAddress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DOCUMENT_TYPES.map((doc) => {
              const docKey = doc.toLowerCase().replace(/\s+/g, "");
              const isUploaded = selectedApp?.documents?.[docKey]?.uploaded || false;
              const verStatus = selectedApp?.documents?.[docKey]?.verificationStatus;
              
              return (
                <div key={doc} className="flex items-center justify-between pb-2 border-b last:border-0">
                  <span className="text-sm">{doc}</span>
                  <div className="flex items-center gap-2">
                    {!isUploaded ? (
                      <Badge variant="outline" className="text-xs">Not Uploaded</Badge>
                    ) : verStatus === "VERIFIED" ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Verification History */}
      <Card className="bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">Verification History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-semibold">Documents Verified</p>
                <p className="text-xs text-muted-foreground">Verification Date: {selectedApp?.verificationDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AO Decision */}
      <div>
        <Label htmlFor="ao-remarks">AO Recommendation & Remarks</Label>
        <Textarea
          id="ao-remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add your recommendation and notes for Admin approval..."
          className="mt-1"
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => handleAOApproval(true)}
          className="flex-1"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve & Recommend
        </Button>
        <Button
          onClick={() => handleAOApproval(false)}
          className="flex-1"
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject Application
        </Button>
      </div>
    </div>
  );

  // Admin Approval View
  const AdminApprovalView = () => (
    <div className="space-y-6">
      {/* Student Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Student Name</Label>
              <p className="font-semibold">{selectedApp?.studentName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date of Birth</Label>
              <p className="font-semibold">{selectedApp?.dateOfBirth}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Gender</Label>
              <p className="font-semibold">{selectedApp?.gender}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Blood Group</Label>
              <p className="font-semibold">{selectedApp?.bloodGroup}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Aadhar No.</Label>
              <p className="font-semibold">{selectedApp?.aadharNo}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Application No.</Label>
              <p className="font-semibold">{selectedApp?.applicationNo}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parent Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parent Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Father's Name</Label>
                <p className="font-semibold">{selectedApp?.fatherName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Mobile</Label>
                <p className="font-semibold">{selectedApp?.fatherMobile}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Occupation</Label>
                <p className="font-semibold">{selectedApp?.fatherOccupation}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Aadhar</Label>
                <p className="font-semibold">{selectedApp?.fatherAadhar}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mother's Name</Label>
                  <p className="font-semibold">{selectedApp?.motherName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mother's Mobile</Label>
                  <p className="font-semibold">{selectedApp?.motherMobile}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mother's Occupation</Label>
                  <p className="font-semibold">{selectedApp?.motherOccupation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mother's Aadhar</Label>
                  <p className="font-semibold">{selectedApp?.motherAadhar}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Previous School</Label>
              <p className="font-semibold">{selectedApp?.previousSchool}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Previous Class</Label>
              <p className="font-semibold">{selectedApp?.previousClass}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Class Admission For</Label>
              <p className="font-semibold">{selectedApp?.classAdmissionFor}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Applied Date</Label>
              <p className="font-semibold">{selectedApp?.dateOfApplication}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DOCUMENT_TYPES.map((doc) => {
              const docKey = doc.toLowerCase().replace(/\s+/g, "");
              const isUploaded = selectedApp?.documents?.[docKey]?.uploaded || false;
              const verStatus = selectedApp?.documents?.[docKey]?.verificationStatus;
              
              return (
                <div key={doc} className="flex items-center justify-between pb-2 border-b last:border-0">
                  <span className="text-sm">{doc}</span>
                  <div className="flex items-center gap-2">
                    {!isUploaded ? (
                      <Badge variant="outline" className="text-xs">Not Uploaded</Badge>
                    ) : verStatus === "VERIFIED" ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Approval History */}
      <Card className="bg-green-50">
        <CardHeader>
          <CardTitle className="text-sm">Approval History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Documents Verified</p>
              <p className="text-xs text-muted-foreground">Verification Date: {selectedApp?.verificationDate}</p>
            </div>
          </div>
          <div className="border-t pt-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold">AO Approved & Recommended</p>
              <p className="text-xs text-muted-foreground">Decision Date: {selectedApp?.aoDecisionDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AO Decision Summary */}
      {selectedApp?.aoRemarks && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">AO Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{selectedApp?.aoRemarks}</p>
          </CardContent>
        </Card>
      )}

      {/* Section & House Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section & House Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="section">Section Assignment</Label>
              <Select value={sectionAssignment} onValueChange={setSectionAssignment}>
                <SelectTrigger data-testid="select-section-assignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["A", "B", "C", "D", "E"].map((section) => (
                    <SelectItem key={section} value={section}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="house">House Assignment</Label>
              <Select value={houseAssignment} onValueChange={setHouseAssignment}>
                <SelectTrigger data-testid="select-house-assignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Aastha", "Abhilasha", "Asmita", "Atman", "Asha", "Ananda"].map((house) => (
                    <SelectItem key={house} value={house}>{house}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Decision */}
      <div>
        <Label htmlFor="admin-remarks">Admin Decision & Remarks</Label>
        <Textarea
          id="admin-remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add notes about your final decision..."
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Final Decision</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setDecision("approve")}
            variant={decision === "approve" ? "default" : "outline"}
            data-testid="button-admit"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Admit
          </Button>
          <Button
            onClick={() => setDecision("reject")}
            variant={decision === "reject" ? "destructive" : "outline"}
            data-testid="button-reject"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={() => setDecision("waitlist")}
            variant={decision === "waitlist" ? "secondary" : "outline"}
            data-testid="button-waitlist"
          >
            Waitlist
          </Button>
          <Button
            onClick={() => setDecision("correction")}
            variant={decision === "correction" ? "secondary" : "outline"}
            data-testid="button-correction"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Correction
          </Button>
        </div>
      </div>

      <Button
        onClick={handleAdminApproval}
        className="w-full"
        disabled={!decision}
        data-testid="button-confirm-decision"
      >
        Confirm Final Decision
      </Button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Admissions", href: "/admissions/enquiries" },
        { label: "Approve Application" }
      ]} />
      <div>
        <h1 className="text-3xl font-bold">Approve Application</h1>
        <p className="text-muted-foreground">Manage admissions through verification and approval stages</p>
      </div>

      <Tabs defaultValue="verification" className="space-y-4">
        <TabsList>
          <TabsTrigger value="verification" className="gap-2">
            <FileText className="h-4 w-4" />
            Document Verification ({pendingVerification.length})
          </TabsTrigger>
          <TabsTrigger value="ao" className="gap-2">
            <User className="h-4 w-4" />
            AO Approval ({pendingAOApproval.length})
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2">
            <Clock className="h-4 w-4" />
            Admin Approval ({pendingAdminApproval.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verification" className="space-y-4">
          {pendingVerification.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No documents pending verification
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingVerification.map((app) => (
                <ApplicationCard key={app.id} app={app} type="verify" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ao" className="space-y-4">
          {pendingAOApproval.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No applications pending AO approval
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingAOApproval.map((app) => (
                <ApplicationCard key={app.id} app={app} type="ao" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          {pendingAdminApproval.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No applications pending admin approval
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingAdminApproval.map((app) => (
                <ApplicationCard key={app.id} app={app} type="admin" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {decisionType === "verify" && "Document Verification"}
              {decisionType === "ao" && "AO Approval Review"}
              {decisionType === "admin" && "Admin Final Decision"}
            </DialogTitle>
            <DialogDescription>
              {selectedApp?.studentName} - {selectedApp?.applicationNo}
            </DialogDescription>
          </DialogHeader>

          {decisionType === "verify" && <DocumentVerificationView />}
          {decisionType === "ao" && <AOApprovalView />}
          {decisionType === "admin" && <AdminApprovalView />}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!viewingDocument} onOpenChange={(open) => !open && setViewingDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {viewingDocument}
              </div>
            </DialogTitle>
            <DialogDescription>
              Document from {selectedApp?.studentName}'s application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground">Document Name</Label>
                    <p className="font-semibold">{viewingDocument}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Student</Label>
                    <p className="font-semibold">{selectedApp?.studentName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-semibold">
                      {documentApprovals[viewingDocument || ""] === "approved" ? (
                        <Badge className="bg-green-100 text-green-800">Approved</Badge>
                      ) : documentApprovals[viewingDocument || ""] === "rejected" ? (
                        <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                      ) : (
                        <Badge variant="outline">Pending Review</Badge>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                <div className="space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-blue-600" />
                  <p>Document preview would display here</p>
                  <p className="text-xs">In production, the document file would be shown</p>
                  <Button variant="outline" size="sm" className="mt-2" data-testid="button-download-document">
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDocument(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
