import { z } from "zod";

// User types
export type User = {
  id: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: string;
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Enquiry types
export type Enquiry = {
  id: string;
  date: string;
  studentName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  fatherName: string;
  fatherPhone: string;
  fatherOccupation?: string;
  motherName: string;
  motherPhone: string;
  motherOccupation?: string;
  primaryContact: string;
  primaryContactNumber: string;
  hasSibling: boolean;
  siblingAdmissionNo?: string;
  siblingName?: string;
  siblingClass?: string;
  residentialAddress: string;
  city: string;
  state: string;
  pincode: string;
  classAdmissionFor: string;
  admissionStatus: string;
  board: string;
  medium: string;
  previousSchool?: string;
  lastExamPassed?: string;
  marksheet?: any;
  height?: number;
  weight?: number;
  hasMedicalCondition: boolean;
  medicalConditionDetails?: string;
  doctorName?: string;
  doctorPhone?: string;
  localGuardianName?: string;
  localGuardianAddress?: string;
  localGuardianPhone?: string;
  localGuardianRelation?: string;
  declarationTruthful: boolean;
  declarationRules: boolean;
  declarationCancellation: boolean;
  studentSignature?: string;
  parentSignature?: string;
  followUpStatus: string;
  customFollowUp?: string;
  finalStatus: string;
  createdBy: string;
  notes?: string;
  createdAt?: string;
};

export const insertEnquirySchema = z.object({
  date: z.string(),
  studentName: z.string().min(2, "Student name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.string().optional(),
  fatherName: z.string().min(2, "Father's name is required"),
  fatherPhone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  fatherOccupation: z.string().optional(),
  motherName: z.string().min(2, "Mother's name is required"),
  motherPhone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  motherOccupation: z.string().optional(),
  primaryContact: z.enum(["father", "mother", "other"]).default("father"),
  primaryContactNumber: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  hasSibling: z.boolean().default(false),
  siblingAdmissionNo: z.string().optional(),
  siblingName: z.string().optional(),
  siblingClass: z.string().optional(),
  residentialAddress: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  classAdmissionFor: z.string().min(1, "Class required"),
  admissionStatus: z.enum(["Hosteller", "Day Scholar"]),
  board: z.enum(["State Board", "Central Board (CBSE)", "ICSE"]),
  medium: z.enum(["English", "Hindi"]),
  previousSchool: z.string().optional(),
  lastExamPassed: z.string().optional(),
  marksheet: z.any().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  hasMedicalCondition: z.boolean().default(false),
  medicalConditionDetails: z.string().optional(),
  doctorName: z.string().optional(),
  doctorPhone: z.string().optional(),
  localGuardianName: z.string().optional(),
  localGuardianAddress: z.string().optional(),
  localGuardianPhone: z.string().optional(),
  localGuardianRelation: z.string().optional(),
  declarationTruthful: z.boolean().default(false),
  declarationRules: z.boolean().default(false),
  declarationCancellation: z.boolean().default(false),
  studentSignature: z.string().optional(),
  parentSignature: z.string().optional(),
  followUpStatus: z.enum([
    "Pending",
    "Call back later",
    "Applicant not responding",
    "Not reachable",
    "Not interested",
    "Proceed to Admission",
    "Custom"
  ]).default("Pending"),
  customFollowUp: z.string().optional(),
  finalStatus: z.enum(["Pending", "Registered", "Admitted", "Rejected"]).default("Pending"),
  notes: z.string().optional(),
});

export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;

// Registration types
export type Registration = {
  id: string;
  registrationNo: string;
  enquiryId?: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  primaryContactNumber: string;
  classAdmissionFor: string;
  registrationFee: number;
  paymentStatus: string;
  paymentMode?: string;
  paymentDate?: string;
  receiptNumber?: string;
  status: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
};

export const insertRegistrationSchema = z.object({
  enquiryId: z.string().optional(),
  studentName: z.string().min(2, "Student name is required"),
  fatherName: z.string().min(2, "Father's name is required"),
  motherName: z.string().min(2, "Mother's name is required"),
  primaryContactNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  classAdmissionFor: z.string().min(1, "Class required"),
  registrationFee: z.number().default(500),
  paymentStatus: z.enum(["Paid", "Pending"]).default("Pending"),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Cheque"]).optional(),
  paymentDate: z.string().optional(),
  receiptNumber: z.string().optional(),
  status: z.enum(["Registered", "Application Submitted", "Admitted", "Rejected"]).default("Registered"),
});

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

// Application types
export type Application = {
  id: string;
  applicationNo: string;
  registrationId?: string;
  enquiryId?: string;
  dateOfApplication: string;
  academicYear: string;
  studentName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  aadharNo?: string;
  religion?: string;
  category?: string;
  fatherName: string;
  fatherAadhar?: string;
  fatherMobile: string;
  fatherOccupation?: string;
  motherName: string;
  motherAadhar?: string;
  motherMobile?: string;
  motherOccupation?: string;
  permanentAddress: string;
  previousSchool?: string;
  previousClass?: string;
  previousMarks?: string;
  classAdmissionFor: string;
  section: string;
  house: string;
  declarationDate?: string;
  declarationPlace?: string;
  parentSignatureName?: string;
  relationWithCandidate?: string;
  declarationAgreed: boolean;
  documents?: any;
  verificationStatus: string;
  verificationNotes?: string;
  verificationDate?: string;
  verifierId?: string;
  aoStatus?: string;
  aoDecisionDate?: string;
  aoDecisionBy?: string;
  aoRemarks?: string;
  adminStatus?: string;
  adminDecisionDate?: string;
  adminDecisionBy?: string;
  adminRemarks?: string;
  overrideNeeded: boolean;
  finalStatus: string;
  admissionDate?: string;
  studentProfileId?: string;
  syncedToModules?: any;
  createdBy: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const insertApplicationSchema = z.object({
  registrationId: z.string().optional(),
  enquiryId: z.string().optional(),
  dateOfApplication: z.string(),
  academicYear: z.string(),
  studentName: z.string().min(2, "Student name is required"),
  dateOfBirth: z.string(),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.string().optional(),
  aadharNo: z.string().optional(),
  religion: z.string().optional(),
  category: z.enum(["General", "SC", "ST", "OBC", "EWS"]).optional(),
  fatherName: z.string().min(2, "Father's name is required"),
  fatherAadhar: z.string().optional(),
  fatherMobile: z.string().regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  fatherOccupation: z.string().optional(),
  motherName: z.string().min(2, "Mother's name is required"),
  motherAadhar: z.string().optional(),
  motherMobile: z.string().optional(),
  motherOccupation: z.string().optional(),
  permanentAddress: z.string().min(5, "Address is required"),
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  previousMarks: z.string().optional(),
  classAdmissionFor: z.string().min(1, "Class required"),
  section: z.enum(["A", "B", "C", "D", "Not Assigned"]).default("Not Assigned"),
  house: z.enum(["Aastha", "Abhilasha", "Asmita", "Aradhana", "Not Assigned"]).default("Not Assigned"),
  declarationDate: z.string().optional(),
  declarationPlace: z.string().optional(),
  parentSignatureName: z.string().optional(),
  relationWithCandidate: z.string().optional(),
  declarationAgreed: z.boolean().default(false),
  documents: z.any().optional(),
  verificationStatus: z.enum(["PENDING", "IN_VERIFICATION", "CORRECTION_NEEDED", "READY_APPROVAL", "APPROVED"]).default("PENDING"),
  verificationNotes: z.string().optional(),
  verificationDate: z.string().optional(),
  verifierId: z.string().optional(),
  aoStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "CORRECTION_NEEDED", "WAITLIST"]).optional(),
  aoDecisionDate: z.string().optional(),
  aoDecisionBy: z.string().optional(),
  aoRemarks: z.string().optional(),
  adminStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "OVERRIDE"]).optional(),
  adminDecisionDate: z.string().optional(),
  adminDecisionBy: z.string().optional(),
  adminRemarks: z.string().optional(),
  overrideNeeded: z.boolean().default(false),
  finalStatus: z.enum(["PENDING", "READY_APPROVAL", "ADMITTED", "REJECTED", "CORRECTION", "WAITLIST"]).default("PENDING"),
  admissionDate: z.string().optional(),
  studentProfileId: z.string().optional(),
  remarks: z.string().optional(),
});

export type InsertApplication = z.infer<typeof insertApplicationSchema>;

// Zod Schemas for Frontend Forms

// Enquiry Zod Schema - For form validation (keeping for reference)
export const enquirySchema = z.object({
  id: z.string(),
  date: z.string(),
  
  // Section 1: Student & Family Information
  studentName: z.string().min(2, "Student name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.string().optional(),
  
  // Father's Details
  fatherName: z.string().min(2, "Father's name is required"),
  fatherPhone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  fatherOccupation: z.string().optional(),
  
  // Mother's Details
  motherName: z.string().min(2, "Mother's name is required"),
  motherPhone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  motherOccupation: z.string().optional(),
  
  // Primary Contact
  primaryContact: z.enum(["father", "mother", "other"]).default("father"),
  primaryContactNumber: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  
  // Sibling Information
  hasSibling: z.boolean().default(false),
  siblingAdmissionNo: z.string().optional(),
  siblingName: z.string().optional(),
  siblingClass: z.string().optional(),
  
  // Section 2: Contact & Admission Details
  residentialAddress: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  
  classAdmissionFor: z.string().min(1, "Class required"),
  admissionStatus: z.enum(["Hosteller", "Day Scholar"]),
  board: z.enum(["State Board", "Central Board (CBSE)", "ICSE"]),
  medium: z.enum(["English", "Hindi"]),
  
  // Section 3: Academic & Medical Information
  previousSchool: z.string().optional(),
  lastExamPassed: z.string().optional(),
  marksheet: z.object({
    uploaded: z.boolean().default(false),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    uploadDate: z.string().optional(),
  }).optional(),
  
  // Medical Information
  height: z.number().optional(),
  weight: z.number().optional(),
  hasMedicalCondition: z.boolean().default(false),
  medicalConditionDetails: z.string().optional(),
  doctorName: z.string().optional(),
  doctorPhone: z.string().optional(),
  
  // Section 4: Guardian & Declarations (Local Guardian - only for Hostellers)
  localGuardianName: z.string().optional(),
  localGuardianAddress: z.string().optional(),
  localGuardianPhone: z.string().optional(),
  localGuardianRelation: z.string().optional(),
  
  // Declarations
  declarationTruthful: z.boolean().default(false),
  declarationRules: z.boolean().default(false),
  declarationCancellation: z.boolean().default(false),
  
  // Digital Signatures
  studentSignature: z.string().optional(),
  parentSignature: z.string().optional(),
  
  // Follow-up & Status
  followUpStatus: z.enum([
    "Pending",
    "Call back later",
    "Applicant not responding",
    "Not reachable",
    "Not interested",
    "Proceed to Admission",
    "Custom"
  ]).default("Pending"),
  customFollowUp: z.string().optional(),
  finalStatus: z.enum(["Pending", "Registered", "Admitted", "Rejected"]).default("Pending"),
  createdBy: z.string(),
  notes: z.string().optional(),
});

// Registration Schema
export const registrationSchema = z.object({
  id: z.string(),
  registrationNo: z.string(),
  enquiryId: z.string().optional(),
  studentName: z.string().min(2, "Student name is required"),
  fatherName: z.string().min(2, "Father's name is required"),
  motherName: z.string().min(2, "Mother's name is required"),
  primaryContactNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  classAdmissionFor: z.string().min(1, "Class required"),
  registrationFee: z.number().default(500),
  paymentStatus: z.enum(["Paid", "Pending"]).default("Pending"),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Cheque"]).optional(),
  paymentDate: z.string().optional(),
  receiptNumber: z.string().optional(),
  status: z.enum(["Registered", "Application Submitted", "Admitted", "Rejected"]).default("Registered"),
  createdBy: z.string(),
});

export type RegistrationSchema = z.infer<typeof registrationSchema>;
export type InsertRegistrationSchema = Omit<RegistrationSchema, "id" | "registrationNo">;

// Application/Admission Schema with full workflow
export const applicationSchema = z.object({
  id: z.string(),
  applicationNo: z.string(),
  registrationId: z.string().optional(),
  enquiryId: z.string().optional(),
  dateOfApplication: z.string(),
  academicYear: z.string(),
  
  // Student Information
  studentName: z.string().min(2, "Student name is required"),
  dateOfBirth: z.string(),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.string().optional(),
  aadharNo: z.string().optional(),
  religion: z.string().optional(),
  category: z.enum(["General", "SC", "ST", "OBC", "EWS"]).optional(),
  
  // Parent Information
  fatherName: z.string().min(2, "Father's name is required"),
  fatherAadhar: z.string().optional(),
  fatherMobile: z.string().regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  fatherOccupation: z.string().optional(),
  
  motherName: z.string().min(2, "Mother's name is required"),
  motherAadhar: z.string().optional(),
  motherMobile: z.string().optional(),
  motherOccupation: z.string().optional(),
  
  // Address
  permanentAddress: z.string().min(5, "Address is required"),
  
  // Previous School Details
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  previousMarks: z.string().optional(),
  
  // Admission Details
  classAdmissionFor: z.string().min(1, "Class required"),
  section: z.enum(["A", "B", "C", "D", "Not Assigned"]).default("Not Assigned"),
  house: z.enum(["Aastha", "Abhilasha", "Asmita", "Aradhana", "Not Assigned"]).default("Not Assigned"),
  
  // Declaration Fields
  declarationDate: z.string().optional(),
  declarationPlace: z.string().optional(),
  parentSignatureName: z.string().optional(),
  relationWithCandidate: z.string().optional(),
  declarationAgreed: z.boolean().default(false),
  
  // Documents
  documents: z.object({
    transferCertificate: z.object({
      uploaded: z.boolean().default(false),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      uploadDate: z.string().optional(),
      verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
    }).optional(),
    marksheet: z.object({
      uploaded: z.boolean().default(false),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      uploadDate: z.string().optional(),
      verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
    }).optional(),
    aadharCard: z.object({
      uploaded: z.boolean().default(false),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      uploadDate: z.string().optional(),
      verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
    }).optional(),
    casteCertificate: z.object({
      uploaded: z.boolean().default(false),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      uploadDate: z.string().optional(),
      verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
    }).optional(),
    birthCertificate: z.object({
      uploaded: z.boolean().default(false),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      uploadDate: z.string().optional(),
      verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
    }).optional(),
    photos: z.object({
      uploaded: z.boolean().default(false),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      uploadDate: z.string().optional(),
      verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
    }).optional(),
    medicalCertificate: z.object({
      uploaded: z.boolean().default(false),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      uploadDate: z.string().optional(),
      verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
    }).optional(),
  }).default({}),
  
  // Verification Workflow
  verificationStatus: z.enum(["PENDING", "IN_VERIFICATION", "CORRECTION_NEEDED", "READY_APPROVAL", "APPROVED"]).default("PENDING"),
  verificationNotes: z.string().optional(),
  verificationDate: z.string().optional(),
  verifierId: z.string().optional(),
  
  // Approval Workflow
  aoStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "CORRECTION_NEEDED", "WAITLIST"]).optional(),
  aoDecisionDate: z.string().optional(),
  aoDecisionBy: z.string().optional(),
  aoRemarks: z.string().optional(),
  
  adminStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "OVERRIDE"]).optional(),
  adminDecisionDate: z.string().optional(),
  adminDecisionBy: z.string().optional(),
  adminRemarks: z.string().optional(),
  overrideNeeded: z.boolean().default(false),
  
  // Final Status
  finalStatus: z.enum(["PENDING", "READY_APPROVAL", "ADMITTED", "REJECTED", "CORRECTION", "WAITLIST"]).default("PENDING"),
  
  // Post-Admission
  admissionDate: z.string().optional(),
  studentProfileId: z.string().optional(),
  
  // Metadata
  createdBy: z.string(),
  remarks: z.string().optional(),
});

export type ApplicationSchema = z.infer<typeof applicationSchema>;
export type InsertApplicationSchema = Omit<ApplicationSchema, "id" | "applicationNo">;

// Legacy Admission type for backwards compatibility
export type Admission = ApplicationSchema;
export type InsertAdmission = InsertApplicationSchema;
