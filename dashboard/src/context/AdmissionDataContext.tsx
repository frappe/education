import { createContext, useContext, useState, ReactNode } from "react";
import { Enquiry, RegistrationSchema, ApplicationSchema } from "@shared/schema";
import initialEnquiries from "@/mockData/enquiries.json";
import initialRegistrations from "@/mockData/registrations.json";
import initialAdmissions from "@/mockData/admissions.json";

interface AdmissionDataContextType {
  enquiries: Enquiry[];
  registrations: any[];
  applications: any[];
  
  // Enquiry methods
  addEnquiry: (enquiry: Enquiry) => void;
  updateEnquiry: (id: string, updates: Partial<Enquiry>) => void;
  deleteEnquiry: (id: string) => void;
  
  // Registration methods
  addRegistration: (registration: any) => void;
  updateRegistration: (id: string, updates: Partial<any>) => void;
  deleteRegistration: (id: string) => void;
  
  // Application/Admission methods
  addApplication: (application: any) => void;
  updateApplication: (id: string, updates: Partial<any>) => void;
  deleteApplication: (id: string) => void;
  
  // Workflow action methods
  submitDocuments: (appId: string, documents: any) => void;
  verifyDocuments: (appId: string, verified: boolean, notes?: string) => void;
  approveByAO: (appId: string, approved: boolean, remarks?: string) => void;
  approveByAdmin: (appId: string, approved: boolean, remarks?: string) => void;
  assignHouseAndClass: (appId: string, house: string, section: string) => void;
  finalizeAdmission: (appId: string) => void;
  
  // Backwards compatibility
  admissions: any[];
  addAdmission: (admission: any) => void;
  updateAdmission: (id: string, updates: Partial<any>) => void;
  deleteAdmission: (id: string) => void;
}

const AdmissionDataContext = createContext<AdmissionDataContextType | undefined>(undefined);

export function AdmissionDataProvider({ children }: { children: ReactNode }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initialEnquiries as any[]);
  const [registrations, setRegistrations] = useState<any[]>(initialRegistrations as any[]);
  const [applications, setApplications] = useState<any[]>(initialAdmissions as any[]);

  // ==================== Enquiry Methods ====================
  const addEnquiry = (enquiry: Enquiry) => {
    setEnquiries((prev) => [...prev, enquiry]);
  };

  const updateEnquiry = (id: string, updates: Partial<Enquiry>) => {
    setEnquiries((prev) =>
      prev.map((enq) => (enq.id === id ? { ...enq, ...updates } : enq))
    );
  };

  const deleteEnquiry = (id: string) => {
    setEnquiries((prev) => prev.filter((enq) => enq.id !== id));
  };

  // ==================== Registration Methods ====================
  const addRegistration = (registration: RegistrationSchema) => {
    setRegistrations((prev) => [...prev, registration]);
  };

  const updateRegistration = (id: string, updates: Partial<RegistrationSchema>) => {
    setRegistrations((prev) =>
      prev.map((reg) => (reg.id === id ? { ...reg, ...updates } : reg))
    );
  };

  const deleteRegistration = (id: string) => {
    setRegistrations((prev) => prev.filter((reg) => reg.id !== id));
  };

  // ==================== Application Methods ====================
  const addApplication = (application: ApplicationSchema) => {
    setApplications((prev) => [...prev, application]);
  };

  const updateApplication = (id: string, updates: Partial<ApplicationSchema>) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, ...updates } : app))
    );
  };

  const deleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
  };

  // ==================== Workflow Action Methods ====================
  const submitDocuments = (appId: string, documents: any) => {
    updateApplication(appId, {
      documents,
      verificationStatus: "PENDING",
    });
  };

  const verifyDocuments = (appId: string, verified: boolean, notes?: string) => {
    updateApplication(appId, {
      verificationStatus: verified ? "APPROVED" : "CORRECTION_NEEDED",
      verificationNotes: notes,
      verificationDate: new Date().toISOString(),
      finalStatus: verified ? "READY_APPROVAL" : "CORRECTION",
    });
  };

  const approveByAO = (appId: string, approved: boolean, remarks?: string) => {
    const status = approved ? "APPROVED" : "REJECTED";
    updateApplication(appId, {
      aoStatus: status,
      aoDecisionDate: new Date().toISOString(),
      aoRemarks: remarks,
    });
  };

  const approveByAdmin = (appId: string, approved: boolean, remarks?: string) => {
    const status = approved ? "APPROVED" : "REJECTED";
    updateApplication(appId, {
      adminStatus: status,
      adminDecisionDate: new Date().toISOString(),
      adminRemarks: remarks,
      finalStatus: approved ? "ADMITTED" : "REJECTED",
    });
  };

  const assignHouseAndClass = (
    appId: string,
    house: "Aastha" | "Abhilasha" | "Asmita" | "Aradhana" | "Not Assigned",
    section: "A" | "B" | "C" | "D" | "Not Assigned"
  ) => {
    updateApplication(appId, {
      house,
      section,
    });
  };

  const finalizeAdmission = (appId: string) => {
    updateApplication(appId, {
      finalStatus: "ADMITTED",
      admissionDate: new Date().toISOString().split("T")[0],
    });
  };

  // ==================== Backwards Compatibility ====================
  const addAdmission = (admission: ApplicationSchema) => addApplication(admission);
  const updateAdmission = (id: string, updates: Partial<ApplicationSchema>) => updateApplication(id, updates);
  const deleteAdmission = (id: string) => deleteApplication(id);

  return (
    <AdmissionDataContext.Provider
      value={{
        enquiries,
        registrations,
        applications,
        addEnquiry,
        updateEnquiry,
        deleteEnquiry,
        addRegistration,
        updateRegistration,
        deleteRegistration,
        addApplication,
        updateApplication,
        deleteApplication,
        submitDocuments,
        verifyDocuments,
        approveByAO,
        approveByAdmin,
        assignHouseAndClass,
        finalizeAdmission,
        // Backwards compatibility
        admissions: applications,
        addAdmission,
        updateAdmission,
        deleteAdmission,
      }}
    >
      {children}
    </AdmissionDataContext.Provider>
  );
}

export function useAdmissionData() {
  const context = useContext(AdmissionDataContext);
  if (!context) {
    throw new Error("useAdmissionData must be used within AdmissionDataProvider");
  }
  return context;
}
