import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateStudentFee } from "@/utils/feeCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Users,
  FileText,
  Upload,
  CheckCircle2,
  Circle,
  Loader2,
  Info,
  Home as HomeIcon,
  GraduationCap,
  FileCheck,
  ScrollText,
  IndianRupee,
  AlertCircle,
  Search,
  X,
  Percent,
  Gift,
  Calendar,
  CreditCard,
  Receipt,
  Wallet,
  Clock,
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FormStepper } from "@/components/FormStepper";
import { type Enquiry } from "@shared/schema";
import { useAdmissionData } from "@/context/AdmissionDataContext";
import feeSchemes from "@/mockData/feeSchemes.json";
import students from "@/mockData/students.json";

const insertAdmissionSchema = z.object({
  registrationId: z.string().optional(),
  dateOfApplication: z.string(),
  academicYear: z.string(),
  studentName: z.string(),
  dateOfBirth: z.string(),
  gender: z.enum(["Male", "Female", "Other"]),
  studentPhoto: z.string().optional(),
  studentWhatsapp: z.string().optional(),
  bloodGroup: z.string().optional(),
  aadharNo: z.string().optional(),
  religion: z.string().optional(),
  category: z.string().optional(),
  singleGirlChild: z.boolean().default(false),
  speciallyAbled: z.boolean().default(false),
  disabilityType: z.string().optional(),
  ewsStatus: z.boolean().default(false),
  aplBplStatus: z.string().optional(),
  admissionType: z.enum(["General", "RTE", "Govt", "Hostel", "MDY"]),
  classAdmissionFor: z.string(),
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
  previousMarks: z.string().optional(),
  previousBoard: z.string().optional(),
  reasonForTransfer: z.string().optional(),
  numberOfSiblings: z.string().optional(),
  siblingDetails: z.string().optional(),
  homeType: z.string().optional(),
  homeLocation: z.string().optional(),
  internetFacility: z.boolean().default(false),
  section: z.string().default("Not Assigned"),
  house: z.string().default("Not Assigned"),
  transportRequired: z.boolean().default(false),
  hostelRequired: z.boolean().default(false),
  feeStructure: z.any().optional(),
  documents: z.any().optional(),
  declarationDate: z.string().optional(),
  declarationPlace: z.string().optional(),
  parentSignatureName: z.string().optional(),
  relationWithCandidate: z.string().optional(),
  declarationAgreed: z.boolean().default(false),
  finalStatus: z.string().default("PENDING"),
  remarks: z.string().optional(),
  // Fee Configuration Fields
  aoDiscountEnabled: z.boolean().default(false),
  aoDiscountType: z.string().optional(),
  aoDiscountAmount: z.number().default(0),
  aoDiscountReason: z.string().optional(),
  aoDiscountApprovedBy: z.string().optional(),
  // Payment Collection at Admission
  collectPaymentAtAdmission: z.boolean().default(false),
  paymentAmount: z.number().default(0),
  paymentMode: z.string().optional(),
  paymentReference: z.string().optional(),
  paymentDate: z.string().optional(),
  // Installment Plan
  installmentPlanType: z.string().default("full"),
  customInstallmentMonths: z.number().default(3),
  installmentSchedule: z.any().optional(),
});

type InsertAdmission = z.infer<typeof insertAdmissionSchema>;

export default function NewApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { registrations, enquiries } = useAdmissionData();
  const [enquiryId, setEnquiryId] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 9;
  const [hasSiblingInSchool, setHasSiblingInSchool] = useState(false);
  const [siblingStudentId, setSiblingStudentId] = useState("");
  const [foundSibling, setFoundSibling] = useState<any>(null);

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Helper function to get fee scheme based on selected class
  const getFeeScheme = (selectedClass: string) => {
    const classNum = parseInt(selectedClass?.replace(/\D/g, '') || '0');
    
    if (classNum >= 11 && classNum <= 12) {
      return feeSchemes.find(s => s.class === "11-12") || feeSchemes[4];
    } else if (classNum >= 9 && classNum <= 10) {
      return feeSchemes.find(s => s.class === "9-10") || feeSchemes[3];
    } else if (classNum >= 6 && classNum <= 8) {
      return feeSchemes.find(s => s.class === "6-8") || feeSchemes[2];
    } else if (classNum >= 3 && classNum <= 5) {
      return feeSchemes.find(s => s.class === "3-5") || feeSchemes[1];
    } else {
      // Pre-KG, LKG, UKG, Class 1-2
      return feeSchemes.find(s => s.class === "1-2") || feeSchemes[0];
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eId = params.get("enquiry");
    const rId = params.get("registration");
    if (eId) {
      setEnquiryId(eId);
    }
    if (rId) {
      setRegistrationId(rId);
    }
  }, []);

  const { data: enquiry, isLoading: isLoadingEnquiry } = useQuery<Enquiry>({
    queryKey: ["/api/enquiries", enquiryId],
    enabled: !!enquiryId,
  });

  const form = useForm<InsertAdmission>({
    resolver: zodResolver(insertAdmissionSchema),
    defaultValues: {
      registrationId: "",
      dateOfApplication: new Date().toISOString().split("T")[0],
      academicYear: "2025-26",
      studentName: "",
      dateOfBirth: "",
      gender: "Male" as const,
      studentPhoto: "",
      studentWhatsapp: "",
      bloodGroup: "",
      aadharNo: "",
      religion: "",
      category: undefined,
      singleGirlChild: false,
      speciallyAbled: false,
      disabilityType: "",
      ewsStatus: false,
      aplBplStatus: "None",
      admissionType: "General" as const,
      classAdmissionFor: "",
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
      previousMarks: "",
      previousBoard: "",
      reasonForTransfer: "",
      numberOfSiblings: "",
      siblingDetails: "",
      homeType: "Own",
      homeLocation: "Urban",
      internetFacility: false,
      section: "Not Assigned" as const,
      house: "Not Assigned" as const,
      transportRequired: false,
      hostelRequired: false,
      feeStructure: undefined,
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
      finalStatus: "PENDING",
      remarks: "",
      // Fee Configuration Fields
      aoDiscountEnabled: false,
      aoDiscountType: "",
      aoDiscountAmount: 0,
      aoDiscountReason: "",
      aoDiscountApprovedBy: "",
      collectPaymentAtAdmission: false,
      paymentAmount: 0,
      paymentMode: "",
      paymentReference: "",
      paymentDate: new Date().toISOString().split("T")[0],
      installmentPlanType: "full",
      customInstallmentMonths: 3,
      installmentSchedule: [],
    },
  });

  useEffect(() => {
    if (enquiry) {
      form.setValue("studentName", enquiry.studentName);
      form.setValue("dateOfBirth", enquiry.dateOfBirth);
      form.setValue("gender", enquiry.gender as "Male" | "Female" | "Other");
      if (enquiry.bloodGroup) form.setValue("bloodGroup", enquiry.bloodGroup);
      
      form.setValue("fatherName", enquiry.fatherName);
      form.setValue("fatherMobile", enquiry.fatherPhone);
      if (enquiry.fatherOccupation) form.setValue("fatherOccupation", enquiry.fatherOccupation);
      
      form.setValue("motherName", enquiry.motherName);
      if (enquiry.motherPhone) form.setValue("motherMobile", enquiry.motherPhone);
      if (enquiry.motherOccupation) form.setValue("motherOccupation", enquiry.motherOccupation);
      
      const fullAddress = `${enquiry.residentialAddress}, ${enquiry.city}, ${enquiry.state} - ${enquiry.pincode}`;
      form.setValue("permanentAddress", fullAddress);
      
      if (enquiry.previousSchool) form.setValue("previousSchool", enquiry.previousSchool);
      form.setValue("classAdmissionFor", enquiry.classAdmissionFor);
    }
  }, [enquiry, form]);

  useEffect(() => {
    if (registrationId) {
      const registration = registrations.find((r: any) => r.id === registrationId);
      const linkedEnquiry = registration?.enquiryId ? enquiries.find((e: any) => e.id === registration.enquiryId) : null;

      if (registration) {
        form.setValue("registrationId", registration.id);
        form.setValue("studentName", registration.studentName);
        form.setValue("classAdmissionFor", registration.classAdmissionFor);
        form.setValue("fatherName", registration.fatherName);
        form.setValue("fatherMobile", registration.primaryContactNumber);
        form.setValue("motherName", registration.motherName);
      }

      if (linkedEnquiry) {
        form.setValue("dateOfBirth", linkedEnquiry.dateOfBirth);
        form.setValue("gender", linkedEnquiry.gender as "Male" | "Female" | "Other");
        if (linkedEnquiry.bloodGroup) form.setValue("bloodGroup", linkedEnquiry.bloodGroup);
        if (linkedEnquiry.fatherOccupation) form.setValue("fatherOccupation", linkedEnquiry.fatherOccupation);
        if (linkedEnquiry.motherPhone) form.setValue("motherMobile", linkedEnquiry.motherPhone);
        if (linkedEnquiry.motherOccupation) form.setValue("motherOccupation", linkedEnquiry.motherOccupation);
        const fullAddress = `${linkedEnquiry.residentialAddress}, ${linkedEnquiry.city}, ${linkedEnquiry.state} - ${linkedEnquiry.pincode}`;
        form.setValue("permanentAddress", fullAddress);
        if (linkedEnquiry.previousSchool) form.setValue("previousSchool", linkedEnquiry.previousSchool);
      }
    }
  }, [registrationId, registrations, enquiries, form]);

  // Watch for changes in class, transport, and hostel to update fee structure
  const watchedClass = form.watch("classAdmissionFor");
  const watchedTransport = form.watch("transportRequired");
  const watchedHostel = form.watch("hostelRequired");

  // Compute and update feeStructure whenever class, transport, or hostel changes
  useEffect(() => {
    if (!watchedClass) return;

    const scheme = getFeeScheme(watchedClass);
    if (!scheme) return;

    const baseTuition = scheme.baseTuition;
    const transport = watchedTransport ? scheme.transport : 0;
    const hostel = watchedHostel ? scheme.hostel : 0;
    const total = baseTuition + transport + hostel;

    const feeStructure = {
      baseTuition,
      transport: watchedTransport ? scheme.transport : null,
      hostel: watchedHostel ? scheme.hostel : null,
      transportSelected: watchedTransport,
      hostelSelected: watchedHostel,
      total,
    };

    form.setValue("feeStructure", feeStructure);
  }, [watchedClass, watchedTransport, watchedHostel, form]);

  const { mutate: createApplication, isPending } = useMutation({
    mutationFn: async (data: InsertAdmission) => {
      return await apiRequest("POST", "/api/applications", data);
    },
  });

  const onSubmit = (data: InsertAdmission) => {
    createApplication(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
        
        // Enhanced feedback with application details
        const studentName = data.studentName || "Student";
        const className = data.classAdmissionFor || "Class";
        const admissionType = data.admissionType || "General";
        const applicationDate = new Date().toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        
        toast({
          title: "Application Submitted Successfully! 🎉",
          description: `Your application for admission to ${className} (${admissionType}) has been received. Application ID: APP-${Date.now()}. You will receive updates via WhatsApp at the registered number.`,
          duration: 5000,
        });
        
        // Redirect after a short delay to allow user to see the toast
        setTimeout(() => {
          navigate("/admissions/applications");
        }, 1500);
      },
      onError: (error: any) => {
        toast({
          title: "Submission Failed",
          description: error?.message || "Please check your information and try again",
          variant: "destructive",
        });
      },
    });
  };

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

  const isPreFilledField = (fieldName: string): boolean => {
    if (!enquiry) return false;
    const preFilled = [
      "studentName", "dateOfBirth", "gender", "bloodGroup",
      "fatherName", "fatherMobile", "fatherOccupation",
      "motherName", "motherMobile", "motherOccupation",
      "permanentAddress", "previousSchool", "classAdmissionFor"
    ];
    return preFilled.includes(fieldName);
  };

  const searchSiblingByStudentId = () => {
    if (!siblingStudentId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Student ID",
        variant: "destructive",
      });
      return;
    }

    const student = students.find((s: any) => s.id.toUpperCase() === siblingStudentId.toUpperCase());
    
    if (student) {
      setFoundSibling(student);
      form.setValue("numberOfSiblings", "1");
      form.setValue("siblingDetails", `${student.name} - ${student.class}`);
      toast({
        title: "Success",
        description: `Found sibling: ${student.name} (${student.class})`,
      });
    } else {
      setFoundSibling(null);
      toast({
        title: "Not Found",
        description: "No student found with this ID",
        variant: "destructive",
      });
    }
  };

  if (isLoadingEnquiry) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Admissions", href: "/admissions/applications" },
        { label: "Applications", href: "/admissions/applications" },
        { label: "New Application" }
      ]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New Admission Application</h1>
          <p className="text-muted-foreground">Complete application form for admission</p>
        </div>
      </div>

      {enquiry && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Auto-filled from Enquiry</CardTitle>
            </div>
            <CardDescription>
              Data pre-filled from Enquiry #{enquiry.id} • {enquiry.studentName} • {new Date(enquiry.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg border-primary/10">
          <div className="border-b px-6">
            <FormStepper
              steps={[
                { label: "Student Details", icon: User },
                { label: "Admission Details", icon: GraduationCap },
                { label: "Parent / Guardian", icon: Users },
                { label: "Category & Status", icon: FileText },
                { label: "Previous School & Academics", icon: HomeIcon },
                { label: "Sibling & Home Info", icon: Users },
                { label: "Document Uploads", icon: Upload },
                { label: "Fee Structure", icon: IndianRupee },
                { label: "Declaration & Review", icon: ScrollText },
              ]}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-4 sm:p-6 lg:p-8">
            
            {/* Step 1: Student Information */}
            {currentStep === 1 && (
            <div className="space-y-6">
              {/* Photo Upload Section */}
              <div className="border rounded-lg p-4 bg-card/30">
                <FormField
                  control={form.control}
                  name="studentPhoto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Student Photo <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-center gap-4">
                          {field.value && (
                            <div className="relative w-32 h-40 rounded-md overflow-hidden border-2 border-primary/30">
                              <img 
                                src={field.value} 
                                alt="Student" 
                                className="w-full h-full object-cover"
                                data-testid="img-student-photo"
                              />
                            </div>
                          )}
                          <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-primary rounded-md cursor-pointer hover:bg-primary/5 transition-colors">
                            <Upload className="w-4 h-4 text-primary" />
                            <span className="font-medium">Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    field.onChange(reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              data-testid="input-student-photo"
                            />
                          </label>
                          <p className="text-xs text-muted-foreground text-center">JPG, PNG or GIF (Max 5MB)</p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-academic-year" />
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
                    <FormLabel>Student Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter student name"
                        {...field}
                        className={isPreFilledField("studentName") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                        data-testid="input-student-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className={isPreFilledField("dateOfBirth") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                          data-testid="input-dob"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentWhatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student's WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter WhatsApp number"
                          type="tel"
                          {...field}
                          value={field.value ?? ""}
                          maxLength={10}
                          data-testid="input-student-whatsapp"
                        />
                      </FormControl>
                      <FormDescription>10 digit mobile number</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Gender as Button Cards */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-3 gap-3">
                        {["Male", "Female", "Other"].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={`p-3 border-2 rounded-lg font-medium transition-all ${
                              field.value === value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                            data-testid={`button-gender-${value.toLowerCase()}`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Group</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger
                            className={isPreFilledField("bloodGroup") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                            data-testid="select-blood-group"
                          >
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aadharNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Aadhar Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12 digit Aadhar number"
                          {...field}
                          value={field.value ?? ""}
                          maxLength={12}
                          data-testid="input-student-aadhar"
                        />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </div>
            )}

            {/* Step 2: Admission Details */}
            {currentStep === 2 && (
            <div className="space-y-6">
              {/* Application Date */}
              <FormField
                control={form.control}
                name="dateOfApplication"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-application-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Class Selection */}
              <FormField
                control={form.control}
                name="classAdmissionFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Applying For <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-class-admission-for">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pre-KG">Pre-KG</SelectItem>
                        <SelectItem value="LKG">LKG</SelectItem>
                        <SelectItem value="UKG">UKG</SelectItem>
                        <SelectItem value="Class 1">Class 1</SelectItem>
                        <SelectItem value="Class 2">Class 2</SelectItem>
                        <SelectItem value="Class 3">Class 3</SelectItem>
                        <SelectItem value="Class 4">Class 4</SelectItem>
                        <SelectItem value="Class 5">Class 5</SelectItem>
                        <SelectItem value="Class 6">Class 6</SelectItem>
                        <SelectItem value="Class 7">Class 7</SelectItem>
                        <SelectItem value="Class 8">Class 8</SelectItem>
                        <SelectItem value="Class 9">Class 9</SelectItem>
                        <SelectItem value="Class 10">Class 10</SelectItem>
                        <SelectItem value="Class 11">Class 11</SelectItem>
                        <SelectItem value="Class 12">Class 12</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Admission Type as Button Cards */}
              <FormField
                control={form.control}
                name="admissionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Type <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {["General", "RTE", "Govt", "Hostel", "MDY"].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={`p-3 border-2 rounded-lg font-medium transition-all text-center ${
                              field.value === value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                            data-testid={`button-admission-type-${value.toLowerCase()}`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription className="mt-2">
                      {field.value === "RTE" && "Reservred seats under Right to Free and Compulsory Education Act"}
                      {field.value === "Govt" && "Government scheme admission"}
                      {field.value === "Hostel" && "Hostel facility admission"}
                      {field.value === "MDY" && "Mid Day Meal Yojana linked admission"}
                      {field.value === "General" && "Regular general admission"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            )}

            {/* Step 3: Parent Information */}
            {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Father's Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fatherName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Father's Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter father's name"
                            {...field}
                            className={isPreFilledField("fatherName") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                            data-testid="input-father-name"
                          />
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
                          <Input
                            placeholder="12 digit Aadhar"
                            {...field}
                            value={field.value ?? ""}
                            maxLength={12}
                            data-testid="input-father-aadhar"
                          />
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
                        <FormLabel>Mobile Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="10 digit mobile"
                            {...field}
                            maxLength={10}
                            className={isPreFilledField("fatherMobile") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                            data-testid="input-father-mobile"
                          />
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
                        <FormLabel>Occupation</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter occupation"
                            {...field}
                            value={field.value ?? ""}
                            className={isPreFilledField("fatherOccupation") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                            data-testid="input-father-occupation"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Mother's Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="motherName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mother's Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter mother's name"
                            {...field}
                            className={isPreFilledField("motherName") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                            data-testid="input-mother-name"
                          />
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
                          <Input
                            placeholder="12 digit Aadhar"
                            {...field}
                            value={field.value ?? ""}
                            maxLength={12}
                            data-testid="input-mother-aadhar"
                          />
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
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="10 digit mobile"
                            {...field}
                            value={field.value ?? ""}
                            maxLength={10}
                            className={isPreFilledField("motherMobile") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                            data-testid="input-mother-mobile"
                          />
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
                        <FormLabel>Occupation</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter occupation"
                            {...field}
                            value={field.value ?? ""}
                            className={isPreFilledField("motherOccupation") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                            data-testid="input-mother-occupation"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            )}

            {/* Step 4: Category & Status */}
            {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="SC">SC (Scheduled Caste)</SelectItem>
                          <SelectItem value="ST">ST (Scheduled Tribe)</SelectItem>
                          <SelectItem value="OBC">OBC (Other Backward Class)</SelectItem>
                          <SelectItem value="EWS">EWS (Economically Weaker Section)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Religion</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-religion">
                            <SelectValue placeholder="Select religion" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Hindu">Hindu</SelectItem>
                          <SelectItem value="Muslim">Muslim</SelectItem>
                          <SelectItem value="Christian">Christian</SelectItem>
                          <SelectItem value="Sikh">Sikh</SelectItem>
                          <SelectItem value="Buddhist">Buddhist</SelectItem>
                          <SelectItem value="Jain">Jain</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-card/30">
                <h3 className="font-semibold text-base">Special Status</h3>
                
                <FormField
                  control={form.control}
                  name="singleGirlChild"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <FormLabel className="cursor-pointer">Single Girl Child</FormLabel>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-single-girl-child" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="speciallyAbled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <FormLabel className="cursor-pointer">Specially Abled / Divyang</FormLabel>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-specially-abled" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("speciallyAbled") && (
                  <FormField
                    control={form.control}
                    name="disabilityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type of Disability</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Physical, Visual, Hearing, etc." {...field} value={field.value ?? ""} data-testid="input-disability-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="ewsStatus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <FormLabel className="cursor-pointer">EWS Status (Economically Weaker Section)</FormLabel>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-ews-status" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aplBplStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family Income Status (APL/BPL)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "None"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-apl-bpl-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="APL">APL (Above Poverty Line)</SelectItem>
                          <SelectItem value="BPL">BPL (Below Poverty Line)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* Step 5: Previous School & Academics */}
            {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Previous School Information</h3>
                
                <FormField
                  control={form.control}
                  name="previousSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous School Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter name of previous school"
                          {...field}
                          value={field.value ?? ""}
                          className={isPreFilledField("previousSchool") ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                          data-testid="input-previous-school"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="previousClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Class / Grade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-previous-class">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pre-KG">Pre-KG</SelectItem>
                            <SelectItem value="LKG">LKG</SelectItem>
                            <SelectItem value="UKG">UKG</SelectItem>
                            <SelectItem value="Class 1">Class 1</SelectItem>
                            <SelectItem value="Class 2">Class 2</SelectItem>
                            <SelectItem value="Class 3">Class 3</SelectItem>
                            <SelectItem value="Class 4">Class 4</SelectItem>
                            <SelectItem value="Class 5">Class 5</SelectItem>
                            <SelectItem value="Class 6">Class 6</SelectItem>
                            <SelectItem value="Class 7">Class 7</SelectItem>
                            <SelectItem value="Class 8">Class 8</SelectItem>
                            <SelectItem value="Class 9">Class 9</SelectItem>
                            <SelectItem value="Class 10">Class 10</SelectItem>
                            <SelectItem value="Class 11">Class 11</SelectItem>
                            <SelectItem value="Class 12">Class 12</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="previousBoard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Board / Curriculum</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-previous-board">
                              <SelectValue placeholder="Select board" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CBSE">CBSE</SelectItem>
                            <SelectItem value="ICSE">ICSE</SelectItem>
                            <SelectItem value="State">State Board</SelectItem>
                            <SelectItem value="IB">IB</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="previousMarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Year Marks / Percentage</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 85% or 425/500"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-previous-marks"
                        />
                      </FormControl>
                      <FormDescription>Enter marks or percentage obtained in previous class</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasonForTransfer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Changing School (Optional)</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="E.g., relocation, academic programs, etc."
                          {...field}
                          value={field.value ?? ""}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          data-testid="input-reason-for-transfer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* Step 6: Sibling & Home Info */}
            {currentStep === 6 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Sibling Information</h3>
                
                {/* Toggle for sibling in same school */}
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-card/50">
                  <Checkbox 
                    checked={hasSiblingInSchool} 
                    onCheckedChange={(checked) => {
                      setHasSiblingInSchool(checked as boolean);
                      if (!checked) {
                        setFoundSibling(null);
                        setSiblingStudentId("");
                      }
                    }}
                    data-testid="checkbox-sibling-in-school"
                  />
                  <label className="text-sm font-medium cursor-pointer">Sibling studying in this school?</label>
                </div>

                {/* Sibling lookup section */}
                {hasSiblingInSchool && (
                  <div className="space-y-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter sibling's Student ID (e.g., STU001)"
                        value={siblingStudentId}
                        onChange={(e) => setSiblingStudentId(e.target.value)}
                        data-testid="input-sibling-student-id"
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        onClick={searchSiblingByStudentId}
                        variant="default"
                        data-testid="button-search-sibling"
                        className="gap-2"
                      >
                        <Search className="h-4 w-4" />
                        Search
                      </Button>
                    </div>

                    {foundSibling && (
                      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-green-900 dark:text-green-100">Sibling Found</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Name</p>
                                  <p className="font-medium">{foundSibling.name}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">ID</p>
                                  <p className="font-medium">{foundSibling.id}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Class</p>
                                  <p className="font-medium">{foundSibling.class}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Roll No</p>
                                  <p className="font-medium">{foundSibling.rollNo}</p>
                                </div>
                              </div>
                              <p className="text-xs text-green-700 dark:text-green-300 mt-2">✓ Eligible for ₹1,500 sibling discount</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setFoundSibling(null);
                                setSiblingStudentId("");
                              }}
                              data-testid="button-clear-sibling"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="numberOfSiblings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Siblings {hasSiblingInSchool ? "(Auto-filled)" : ""}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter number of siblings"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-number-of-siblings"
                          disabled={foundSibling ? true : false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="siblingDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sibling Details {hasSiblingInSchool && foundSibling ? "(Auto-filled)" : "(Optional)"}</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="E.g., Name, Age, School/Class for each sibling"
                          {...field}
                          value={field.value ?? ""}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          data-testid="input-sibling-details"
                          disabled={foundSibling ? true : false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-card/30">
                <h3 className="font-semibold text-base">Home Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="homeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? "Own"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-home-type">
                              <SelectValue placeholder="Select home type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Own">Own</SelectItem>
                            <SelectItem value="Rented">Rented</SelectItem>
                            <SelectItem value="Paying Guest">Paying Guest</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="homeLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? "Urban"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-home-location">
                              <SelectValue placeholder="Select area type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Urban">Urban</SelectItem>
                            <SelectItem value="Rural">Rural</SelectItem>
                            <SelectItem value="Semi-Urban">Semi-Urban</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="internetFacility"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <FormLabel className="cursor-pointer">Internet Facility Available</FormLabel>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-internet-facility" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* Step 7: Document Uploads */}
            {currentStep === 7 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Document Uploads
                </h3>
                <p className="text-sm text-muted-foreground">Upload required and optional documents</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "transferCertificate", label: "Transfer Certificate (TC)" },
                  { key: "marksheet", label: "Previous Marksheet" },
                  { key: "aadharCard", label: "Aadhar Card" },
                  { key: "casteCertificate", label: "Caste Certificate" },
                  { key: "birthCertificate", label: "Birth Certificate" },
                  { key: "photos", label: "Passport Photos" },
                  { key: "medicalCertificate", label: "Medical Certificate" },
                  { key: "bankDetails", label: "Bank Details" },
                  { key: "penNumber", label: "PEN Number" },
                  { key: "apaarId", label: "APAAR ID" },
                ].map((doc) => {
                  const docData = form.watch(`documents.${doc.key}` as any);
                  return (
                    <div key={doc.key} className="space-y-2">
                      <label className="text-sm font-medium">{doc.label}</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          onChange={(e) => handleFileUpload(doc.key, e.target.files?.[0] || null)}
                          data-testid={`input-file-${doc.key}`}
                          className="text-sm"
                        />
                        {docData?.uploaded && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                      {docData?.uploaded && (
                        <p className="text-xs text-muted-foreground">
                          {docData.fileName} ({Math.round((docData.fileSize || 0) / 1024)}KB)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Step 8: Fee Structure with Discount, Installment, and Payment Options */}
            {currentStep === 8 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  Fee Structure & Payment Configuration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Review fee structure, apply discounts, set payment plans, and optionally collect payment.
                </p>
              </div>

              {(() => {
                const classAdmissionFor = form.getValues("classAdmissionFor");
                const admissionType = form.getValues("admissionType");
                const singleGirlChild = form.getValues("singleGirlChild");
                const ewsStatus = form.getValues("ewsStatus");
                const previousMarks = form.getValues("previousMarks");
                const numberOfSiblings = form.getValues("numberOfSiblings");
                const aoDiscountEnabled = form.watch("aoDiscountEnabled");
                const aoDiscountAmount = form.watch("aoDiscountAmount") || 0;
                const collectPaymentAtAdmission = form.watch("collectPaymentAtAdmission");
                const paymentAmount = form.watch("paymentAmount") || 0;
                const installmentPlanType = form.watch("installmentPlanType") || "full";
                const customInstallmentMonths = form.watch("customInstallmentMonths") || 3;
                
                // Guard: Check if class is selected
                if (!classAdmissionFor) {
                  return (
                    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                          <AlertCircle className="h-5 w-5" />
                          <p>Please select a class in Step 2 (Admission Details) to view fee structure.</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                
                // Map admission type to scheme code
                const schemeCodeMap: Record<string, string> = {
                  "General": "DAY_SCHOLAR",
                  "RTE": "RTE",
                  "Govt": "MDY",
                  "Hostel": "HOSTEL_AC",
                  "MDY": "MDY"
                };
                const schemeCode = schemeCodeMap[admissionType] || "DAY_SCHOLAR";
                
                // Calculate merit percentage if available
                let meritPercentage: number | undefined;
                if (previousMarks) {
                  const numMarks = parseInt(previousMarks.toString());
                  if (!isNaN(numMarks)) {
                    meritPercentage = numMarks;
                  }
                }
                
                // Calculate fee using utility (including AO discount as special discount)
                const feeCalculation = calculateStudentFee({
                  classNumber: classAdmissionFor,
                  schemeCode,
                  meritPercentage,
                  hasSiblingEnrolled: !!numberOfSiblings && parseInt(numberOfSiblings) > 0,
                  specialDiscount: aoDiscountEnabled ? aoDiscountAmount : 0,
                });
                
                const { feeBreakdown, totalFee, discountBreakdown, totalDiscounts, netFee } = feeCalculation;
                
                // Calculate remaining balance after payment at admission
                const remainingBalance = collectPaymentAtAdmission ? Math.max(netFee - paymentAmount, 0) : netFee;
                
                // Calculate installments based on plan type
                const getInstallmentMonths = () => {
                  switch (installmentPlanType) {
                    case "quarterly": return 3;
                    case "biannual": return 6;
                    case "custom": return customInstallmentMonths;
                    default: return 1;
                  }
                };
                
                const installmentMonths = getInstallmentMonths();
                const amountForInstallments = remainingBalance;
                const installmentAmount = installmentPlanType !== "full" ? Math.round(amountForInstallments / installmentMonths) : amountForInstallments;
                
                // Generate installment schedule
                const generateInstallmentSchedule = () => {
                  if (installmentPlanType === "full") return [];
                  const schedule = [];
                  const startDate = new Date();
                  for (let i = 0; i < installmentMonths; i++) {
                    const dueDate = addMonths(startDate, i);
                    const amount = i === installmentMonths - 1 
                      ? amountForInstallments - (installmentAmount * (installmentMonths - 1))
                      : installmentAmount;
                    schedule.push({
                      installmentNo: i + 1,
                      dueDate: format(dueDate, "dd MMM yyyy"),
                      amount,
                    });
                  }
                  return schedule;
                };
                
                const installmentSchedule = generateInstallmentSchedule();
                
                return (
                  <div className="space-y-6">
                    {/* Fee Breakdown Card */}
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Receipt className="h-5 w-5" />
                          Fee Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Scheme Info */}
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Scheme:</span>
                            <Badge variant="outline">{admissionType}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Class:</span>
                            <Badge variant="outline">{classAdmissionFor}</Badge>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        {/* Fee Items */}
                        <div className="space-y-2 text-sm">
                          {feeBreakdown.tuitionFee > 0 && (
                            <div className="flex justify-between">
                              <span>Tuition Fee</span>
                              <span className="font-medium">₹{feeBreakdown.tuitionFee.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {feeBreakdown.transportFee > 0 && (
                            <div className="flex justify-between">
                              <span>Transport Fee</span>
                              <span className="font-medium">₹{feeBreakdown.transportFee.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {feeBreakdown.libraryFee > 0 && (
                            <div className="flex justify-between">
                              <span>Library Fee</span>
                              <span className="font-medium">₹{feeBreakdown.libraryFee.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {feeBreakdown.sportsFee > 0 && (
                            <div className="flex justify-between">
                              <span>Sports Fee</span>
                              <span className="font-medium">₹{feeBreakdown.sportsFee.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {feeBreakdown.hostelFee > 0 && (
                            <div className="flex justify-between">
                              <span>Hostel Fee</span>
                              <span className="font-medium">₹{feeBreakdown.hostelFee.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {feeBreakdown.messFee > 0 && (
                            <div className="flex justify-between">
                              <span>Mess Fee</span>
                              <span className="font-medium">₹{feeBreakdown.messFee.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {feeBreakdown.cautionFee > 0 && (
                            <div className="flex justify-between">
                              <span>Caution Fee (Refundable)</span>
                              <span className="font-medium">₹{feeBreakdown.cautionFee.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold pt-2 border-t">
                            <span>Gross Total</span>
                            <span>₹{totalFee.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        
                        {/* Discounts & Concessions */}
                        {discountBreakdown.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2 text-sm">
                              <h4 className="font-semibold text-green-700 dark:text-green-400">Discounts Applied</h4>
                              {discountBreakdown.map((discount, idx) => (
                                <div key={idx} className="flex justify-between text-green-700 dark:text-green-400">
                                  <span>{discount.type}</span>
                                  <span className="font-medium">- ₹{discount.amount.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                              <div className="flex justify-between font-semibold pt-2 border-t border-green-700/30">
                                <span>Total Concessions</span>
                                <span className="text-green-700 dark:text-green-400">- ₹{totalDiscounts.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Auto-detected Concessions Info */}
                        {(singleGirlChild || ewsStatus || (numberOfSiblings && parseInt(numberOfSiblings) > 0)) && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200">
                            <p className="font-semibold mb-1">Auto-Detected Eligibility:</p>
                            <ul className="space-y-1">
                              {singleGirlChild && <li>• Single Girl Child Status</li>}
                              {ewsStatus && <li>• Economically Weaker Section (EWS)</li>}
                              {numberOfSiblings && parseInt(numberOfSiblings) > 0 && <li>• Sibling Discount (₹1,500)</li>}
                              {previousMarks && <li>• Merit-based Discount Eligible</li>}
                            </ul>
                          </div>
                        )}
                        
                        <Separator />
                        
                        {/* Net Fee */}
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Net Fee Payable (Annual)</span>
                          <span className="text-primary text-2xl">₹{netFee.toLocaleString('en-IN')}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AO/Admin Discount Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Gift className="h-5 w-5 text-purple-600" />
                            AO/Admin Discount
                          </CardTitle>
                          <FormField
                            control={form.control}
                            name="aoDiscountEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-ao-discount"
                                  />
                                </FormControl>
                                <Label className="text-sm">{field.value ? "Enabled" : "Disabled"}</Label>
                              </FormItem>
                            )}
                          />
                        </div>
                        <CardDescription>Apply special discount approved by Admission Officer or Admin</CardDescription>
                      </CardHeader>
                      {aoDiscountEnabled && (
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="aoDiscountType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Discount Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ao-discount-type">
                                        <SelectValue placeholder="Select discount type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Special">Special Discount</SelectItem>
                                      <SelectItem value="Administrative">Administrative Concession</SelectItem>
                                      <SelectItem value="Financial Hardship">Financial Hardship</SelectItem>
                                      <SelectItem value="Scholarship">Scholarship Award</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="aoDiscountAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Discount Amount (₹)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Enter amount"
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      data-testid="input-ao-discount-amount"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="aoDiscountReason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reason for Discount</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Enter reason for applying this discount..."
                                    className="resize-none"
                                    {...field}
                                    data-testid="input-ao-discount-reason"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="aoDiscountApprovedBy"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Approved By</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-ao-discount-approved-by">
                                      <SelectValue placeholder="Select approver" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="AO - Admission Officer">AO - Admission Officer</SelectItem>
                                    <SelectItem value="Admin - Principal">Admin - Principal</SelectItem>
                                    <SelectItem value="Admin - Director">Admin - Director</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      )}
                    </Card>

                    {/* Flexible Installment Plan Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-green-600" />
                          Payment Plan
                        </CardTitle>
                        <CardDescription>Choose how the {collectPaymentAtAdmission && paymentAmount > 0 ? "remaining balance" : "fee"} will be paid</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="installmentPlanType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plan Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? "full"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-installment-plan">
                                    <SelectValue placeholder="Select payment plan" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="full">Full Payment (One-time)</SelectItem>
                                  <SelectItem value="quarterly">Quarterly (3 Installments)</SelectItem>
                                  <SelectItem value="biannual">Bi-Annual (6 Installments)</SelectItem>
                                  <SelectItem value="custom">Custom Installments</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {installmentPlanType === "custom" && (
                          <FormField
                            control={form.control}
                            name="customInstallmentMonths"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Installments</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={2}
                                    max={12}
                                    placeholder="Enter number of installments"
                                    value={field.value || 3}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                                    data-testid="input-custom-months"
                                  />
                                </FormControl>
                                <FormDescription>Between 2 and 12 installments</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        {/* Installment Schedule Preview */}
                        {installmentPlanType !== "full" && installmentSchedule.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Installment Schedule Preview
                            </h4>
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-20">No.</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {installmentSchedule.map((inst) => (
                                    <TableRow key={inst.installmentNo}>
                                      <TableCell className="font-medium">{inst.installmentNo}</TableCell>
                                      <TableCell>{inst.dueDate}</TableCell>
                                      <TableCell className="text-right font-medium">₹{inst.amount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Total: ₹{amountForInstallments.toLocaleString('en-IN')} in {installmentMonths} installments
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Collect Payment at Admission Section */}
                    <Card className="border-green-200 dark:border-green-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-green-600" />
                            Collect Payment at Admission
                            <Badge variant="outline" className="ml-2">Optional</Badge>
                          </CardTitle>
                          <FormField
                            control={form.control}
                            name="collectPaymentAtAdmission"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-collect-payment"
                                  />
                                </FormControl>
                                <Label className="text-sm">{field.value ? "Yes" : "No"}</Label>
                              </FormItem>
                            )}
                          />
                        </div>
                        <CardDescription>Collect payment upfront at admission time (remaining balance goes to installment plan)</CardDescription>
                      </CardHeader>
                      {collectPaymentAtAdmission && (
                        <CardContent className="space-y-4">
                          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-200">
                            <p className="flex items-center gap-2">
                              <Info className="h-4 w-4" />
                              Payment at admission is optional. Remaining balance will be due as per the payment plan.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="paymentAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Payment Amount (₹)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Enter payment amount"
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      max={netFee}
                                      data-testid="input-payment-amount"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    {`Max: ₹${netFee.toLocaleString('en-IN')}`}
                                  </FormDescription>
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
                                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-payment-mode">
                                        <SelectValue placeholder="Select payment mode" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Cash">Cash</SelectItem>
                                      <SelectItem value="Cheque">Cheque</SelectItem>
                                      <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                                      <SelectItem value="UPI">UPI</SelectItem>
                                      <SelectItem value="Demand Draft">Demand Draft</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="paymentReference"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Transaction/Reference ID</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter reference number"
                                      {...field}
                                      data-testid="input-payment-reference"
                                    />
                                  </FormControl>
                                  <FormDescription>Cheque no., UTR, Transaction ID, etc.</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="paymentDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Payment Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      data-testid="input-payment-date"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Receipt Preview */}
                          {paymentAmount > 0 && (
                            <div className="border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg p-4 bg-green-50/50 dark:bg-green-950/30">
                              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-green-600" />
                                Receipt Preview
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Student</p>
                                  <p className="font-medium">{form.getValues("studentName") || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Class</p>
                                  <p className="font-medium">{classAdmissionFor}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Amount</p>
                                  <p className="font-semibold text-green-600">₹{paymentAmount.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Mode</p>
                                  <p className="font-medium">{form.getValues("paymentMode") || "—"}</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-3 italic">
                                * Receipt will be generated after application submission
                              </p>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>

                    {/* Fee Summary Card */}
                    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Final Fee Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Gross Fee</span>
                            <span>₹{totalFee.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Total Discounts</span>
                            <span>- ₹{totalDiscounts.toLocaleString('en-IN')}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold text-base">
                            <span>Net Fee Payable</span>
                            <span>₹{netFee.toLocaleString('en-IN')}</span>
                          </div>
                          {installmentPlanType !== "full" && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>Payment Plan</span>
                              <span>{installmentMonths} Installments</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
            )}

            {/* Step 9: Declaration & Review */}
            {currentStep === 9 && (
            <div className="space-y-8">
              {/* REVIEW SUMMARY SECTION */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 mb-3">
                    <FileCheck className="h-6 w-6 text-primary" />
                    Application Review
                  </h2>
                  <p className="text-muted-foreground">Please review your application details before submitting. Click "Edit" on any section to make changes.</p>
                </div>

                {/* Step 1: Student Details */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">Student Details</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(1)}
                      data-testid="button-edit-step-1"
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{form.getValues("studentName")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{form.getValues("dateOfBirth")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium">{form.getValues("gender")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Blood Group</p>
                        <p className="font-medium">{form.getValues("bloodGroup") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Aadhar Number</p>
                        <p className="font-medium">{form.getValues("aadharNo") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">WhatsApp</p>
                        <p className="font-medium">{form.getValues("studentWhatsapp") || "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2: Admission Details */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">Admission Details</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(2)}
                      data-testid="button-edit-step-2"
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Application Date</p>
                        <p className="font-medium">{form.getValues("dateOfApplication")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Class Applying For</p>
                        <p className="font-medium">{form.getValues("classAdmissionFor")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Admission Type</p>
                        <p className="font-medium">{form.getValues("admissionType")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Parent/Guardian */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">Parent / Guardian Details</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(3)}
                      data-testid="button-edit-step-3"
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Father's Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{form.getValues("fatherName")}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mobile</p>
                          <p className="font-medium">{form.getValues("fatherMobile")}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Occupation</p>
                          <p className="font-medium">{form.getValues("fatherOccupation") || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Mother's Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{form.getValues("motherName")}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mobile</p>
                          <p className="font-medium">{form.getValues("motherMobile") || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Occupation</p>
                          <p className="font-medium">{form.getValues("motherOccupation") || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 4: Category & Status */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">Category & Status</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(4)}
                      data-testid="button-edit-step-4"
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Religion</p>
                        <p className="font-medium">{form.getValues("religion") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium">{form.getValues("category") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Single Girl Child</p>
                        <p className="font-medium">{form.getValues("singleGirlChild") ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">EWS Status</p>
                        <p className="font-medium">{form.getValues("ewsStatus") ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">APL/BPL Status</p>
                        <p className="font-medium">{form.getValues("aplBplStatus")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 5: Previous School & Academics */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">Previous School & Academics</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(5)}
                      data-testid="button-edit-step-5"
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Previous School</p>
                        <p className="font-medium">{form.getValues("previousSchool") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Previous Class</p>
                        <p className="font-medium">{form.getValues("previousClass") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Board</p>
                        <p className="font-medium">{form.getValues("previousBoard") || "—"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Previous Marks/Percentage</p>
                        <p className="font-medium">{form.getValues("previousMarks") || "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 6: Sibling & Home Info */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">Sibling & Home Information</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(6)}
                      data-testid="button-edit-step-6"
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {foundSibling && (
                      <>
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <h4 className="font-semibold text-green-900 dark:text-green-100">Sibling Verified from School</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Name</p>
                              <p className="font-medium">{foundSibling.name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Student ID</p>
                              <p className="font-medium">{foundSibling.id}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Class</p>
                              <p className="font-medium">{foundSibling.class}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Roll No</p>
                              <p className="font-medium">{foundSibling.rollNo}</p>
                            </div>
                          </div>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-2">✓ Eligible for ₹1,500 sibling discount in fee calculation</p>
                        </div>
                        <Separator />
                      </>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Number of Siblings</p>
                        <p className="font-medium">{form.getValues("numberOfSiblings") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Home Type</p>
                        <p className="font-medium">{form.getValues("homeType") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Area Type</p>
                        <p className="font-medium">{form.getValues("homeLocation") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Internet Facility</p>
                        <p className="font-medium">{form.getValues("internetFacility") ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 7: Document Uploads (Review) */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Document Uploads
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(7)}
                      data-testid="button-edit-step-7-docs"
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: "transferCertificate", label: "Transfer Certificate (TC)" },
                        { key: "marksheet", label: "Previous Marksheet" },
                        { key: "aadharCard", label: "Aadhar Card" },
                        { key: "casteCertificate", label: "Caste Certificate" },
                        { key: "birthCertificate", label: "Birth Certificate" },
                        { key: "photos", label: "Passport Photos" },
                        { key: "medicalCertificate", label: "Medical Certificate" },
                        { key: "bankDetails", label: "Bank Details" },
                        { key: "penNumber", label: "PEN Number" },
                        { key: "apaarId", label: "APAAR ID" },
                      ].map((doc) => {
                        const docData = form.watch(`documents.${doc.key}` as any);
                        const isUploaded = docData?.uploaded;
                        return (
                          <div key={doc.key} className="flex items-center gap-2">
                            {isUploaded ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" data-testid={`icon-uploaded-${doc.key}`} />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" data-testid={`icon-pending-${doc.key}`} />
                            )}
                            <p className="text-sm font-medium truncate">
                              {doc.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Step 8: Fee Structure & Payment Configuration */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <IndianRupee className="h-5 w-5" />
                      Fee Structure & Payment
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(8)}
                      data-testid="button-edit-step-8"
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const selectedClass = form.getValues("classAdmissionFor");
                      const admissionType = form.getValues("admissionType");
                      const numberOfSiblings = form.getValues("numberOfSiblings");
                      const previousMarks = form.getValues("previousMarks");
                      const aoDiscountEnabled = form.getValues("aoDiscountEnabled");
                      const aoDiscountAmount = form.getValues("aoDiscountAmount") || 0;
                      const aoDiscountType = form.getValues("aoDiscountType");
                      const aoDiscountReason = form.getValues("aoDiscountReason");
                      const installmentPlanType = form.getValues("installmentPlanType") || "full";
                      const customInstallmentMonths = form.getValues("customInstallmentMonths") || 3;
                      const paymentMode = form.getValues("paymentMode");
                      const paymentReference = form.getValues("paymentReference");
                      
                      // Map admission type to scheme code
                      const schemeCodeMap: Record<string, string> = {
                        "General": "DAY_SCHOLAR",
                        "RTE": "RTE",
                        "Govt": "MDY",
                        "Hostel": "HOSTEL_AC",
                        "MDY": "MDY"
                      };
                      const schemeCode = schemeCodeMap[admissionType] || "DAY_SCHOLAR";
                      
                      let meritPercentage: number | undefined;
                      if (previousMarks) {
                        const numMarks = parseInt(previousMarks.toString());
                        if (!isNaN(numMarks)) meritPercentage = numMarks;
                      }
                      
                      const feeCalculation = calculateStudentFee({
                        classNumber: selectedClass,
                        schemeCode,
                        meritPercentage,
                        hasSiblingEnrolled: !!numberOfSiblings && parseInt(numberOfSiblings) > 0,
                        specialDiscount: aoDiscountEnabled ? aoDiscountAmount : 0,
                      });
                      
                      const { totalFee, totalDiscounts, netFee } = feeCalculation;
                      const collectPaymentAtAdmission = form.getValues("collectPaymentAtAdmission");
                      const paymentAmount = form.getValues("paymentAmount") || 0;
                      const remainingBalance = collectPaymentAtAdmission ? Math.max(netFee - paymentAmount, 0) : netFee;
                      
                      const getInstallmentMonths = () => {
                        switch (installmentPlanType) {
                          case "quarterly": return 3;
                          case "biannual": return 6;
                          case "custom": return customInstallmentMonths;
                          default: return 1;
                        }
                      };
                      const installmentMonths = getInstallmentMonths();
                      
                      return (
                        <div className="space-y-4">
                          {/* Fee Summary */}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Gross Fee</span>
                              <span>₹{totalFee.toLocaleString('en-IN')}</span>
                            </div>
                            {totalDiscounts > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Total Discounts</span>
                                <span>- ₹{totalDiscounts.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-semibold text-base">
                              <span>Net Fee Payable</span>
                              <span className="text-primary">₹{netFee.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          
                          {/* AO Discount Applied */}
                          {aoDiscountEnabled && aoDiscountAmount > 0 && (
                            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 space-y-1">
                              <div className="flex items-center gap-2">
                                <Gift className="h-4 w-4 text-purple-600" />
                                <span className="font-medium text-sm text-purple-800 dark:text-purple-200">AO/Admin Discount Applied</span>
                              </div>
                              <div className="text-sm text-purple-700 dark:text-purple-300 pl-6">
                                <p>Type: {aoDiscountType || "Special"}</p>
                                <p>Amount: ₹{aoDiscountAmount.toLocaleString('en-IN')}</p>
                                {aoDiscountReason && <p>Reason: {aoDiscountReason}</p>}
                              </div>
                            </div>
                          )}
                          
                          
                          {/* Installment Plan */}
                          {installmentPlanType !== "full" && (
                            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-sm text-green-800 dark:text-green-200">Installment Plan</span>
                              </div>
                              <div className="text-sm text-green-700 dark:text-green-300 pl-6">
                                <p>Plan: {installmentPlanType === "quarterly" ? "Quarterly (3)" : installmentPlanType === "biannual" ? "Bi-Annual (6)" : `Custom (${customInstallmentMonths})`}</p>
                                <p>Installments: {installmentMonths}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Payment Collected at Admission */}
                          {collectPaymentAtAdmission && paymentAmount > 0 && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-1">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-emerald-600" />
                                <span className="font-medium text-sm text-emerald-800 dark:text-emerald-200">Payment Collected at Admission</span>
                              </div>
                              <div className="text-sm text-emerald-700 dark:text-emerald-300 pl-6">
                                <p>Amount: ₹{paymentAmount.toLocaleString('en-IN')}</p>
                                <p>Remaining Balance: ₹{remainingBalance.toLocaleString('en-IN')}</p>
                                <p>Mode: {form.getValues("paymentMode") || "—"}</p>
                                {form.getValues("paymentReference") && <p>Reference: {form.getValues("paymentReference")}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* DECLARATION SECTION */}
              <div className="space-y-4 border rounded-lg p-6 bg-card/50">
                <h3 className="font-semibold text-lg">Declaration</h3>
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="text-gray-700 dark:text-gray-300 italic">
                    "I hereby declare that the above information including name of the candidate, father's/guardian's name, mother's name and date of birth furnished by me is correct to the best of my knowledge & belief. I shall abide by the rules of the School."
                  </p>
                  <div className="flex gap-3 border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      In case student is from other board, Transfer Certificate should be countersigned by the Competent Authority.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="relationWithCandidate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relation with Candidate</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-relation-with-candidate">
                              <SelectValue placeholder="Select relation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Guardian">Guardian</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="declarationAgreed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-declaration-agreed"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          I agree to the declaration and confirm that all information is accurate
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* Action Buttons */}
            <div className="border-t pt-6 flex justify-between gap-4">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    data-testid="button-prev"
                  >
                    Previous
                  </Button>
                )}
                {currentStep === 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admissions/applications")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {currentStep < 9 && (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    data-testid="button-next"
                  >
                    Next
                  </Button>
                )}
                {currentStep === 9 && (
                  <Button type="submit" disabled={isPending} data-testid="button-submit">
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit Application
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
        </Card>
      </div>
    </div>
  );
}
