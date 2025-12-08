import { useState } from "react";
import { useFrappeCreateDoc, useFrappeUpdateDoc } from "frappe-react-sdk";
import { useToast } from "@/hooks/use-toast";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  promoteStudents: boolean;
  resetFeeStructure: boolean;
  resetAllocations: boolean;
  promotionBasis: string;
  passingRuleSource: string;
  graceRuleApply: boolean;
  minAttendanceRequired: number | null;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  createdAt: Date | string;
  createdBy: string;
  updatedAt: string | null;
}

interface AcademicYearFormData {
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  promoteStudents: boolean;
  resetFeeStructure: boolean;
  resetAllocations: boolean;
  promotionBasis: string;
  passingRuleSource: string;
  graceRuleApply: boolean;
  minAttendanceRequired: string;
}

const initialFormData: AcademicYearFormData = {
  name: "",
  startDate: "",
  endDate: "",
  status: "In-active",
  promoteStudents: true,
  resetFeeStructure: false,
  resetAllocations: false,
  promotionBasis: "performance_based",
  passingRuleSource: "term_exam_weighted",
  graceRuleApply: false,
  minAttendanceRequired: "",
};

interface UseAcademicYearFormProps {
  onSuccess: () => void;
  academicYears: AcademicYear[];
}

export function useAcademicYearForm({ onSuccess, academicYears }: UseAcademicYearFormProps) {
  const { toast } = useToast();
  const { createDoc } = useFrappeCreateDoc();
  const { updateDoc } = useFrappeUpdateDoc();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState<AcademicYearFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  const openCreateDialog = () => {
    setEditingYear(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (year: AcademicYear) => {
    if (year.isLocked) {
      toast({
        title: "Cannot Edit",
        description: "This academic year is locked and cannot be modified.",
        variant: "destructive",
      });
      return;
    }
    setEditingYear(year);
    setFormData({
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      status: year.status,
      promoteStudents: year.promoteStudents,
      resetFeeStructure: year.resetFeeStructure,
      resetAllocations: year.resetAllocations,
      promotionBasis: year.promotionBasis,
      passingRuleSource: year.passingRuleSource,
      graceRuleApply: year.graceRuleApply,
      minAttendanceRequired: year.minAttendanceRequired?.toString() || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = (open?: boolean) => {
    if (open === false || open === undefined) {
      setDialogOpen(false);
      setEditingYear(null);
      setFormData(initialFormData);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return false;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.minAttendanceRequired) {
      const attendance = parseInt(formData.minAttendanceRequired);
      if (isNaN(attendance) || attendance < 0 || attendance > 100) {
        toast({
          title: "Validation Error",
          description: "Minimum attendance must be between 0 and 100.",
          variant: "destructive",
        });
        return false;
      }
    }

    const existingYear = academicYears.find(
      y => y.name === formData.name && y.id !== editingYear?.id
    );
    if (existingYear) {
      toast({
        title: "Duplicate Entry",
        description: "An academic year with this name already exists.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    console.log("handleSave called");
    
    if (isSaving) {
      console.log("Already saving, skipping...");
      return;
    }
    
    if (!validateForm()) {
      console.log("Validation failed");
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare doc data
      let docData: any;
      
      if (editingYear) {
        // For update, use useFrappeUpdateDoc which handles CSRF properly
        docData = {
          academic_year_name: formData.name, // ✅ FIXED: Include the name field!
          year_start_date: formData.startDate,
          year_end_date: formData.endDate,
          status: formData.status,
          promote_students: formData.promoteStudents ? 1 : 0,
          reset_fee_structure: formData.resetFeeStructure ? 1 : 0,
          reset_section: formData.resetAllocations ? 1 : 0,
          reset_house: formData.resetAllocations ? 1 : 0,
          promotion_based_on: formData.promotionBasis === "auto_promote" ? "Auto Promote All" : "Academic Year Based",
          passing_rule: formData.passingRuleSource === "final_exam_only" ? "Final Exam Only" : "Term + Exam weighted only",
          allow_grace_rules: formData.graceRuleApply ? 1 : 0,
          minimum_attendance_required_: formData.minAttendanceRequired ? parseFloat(formData.minAttendanceRequired) : null,
        };
        
        console.log("=== UPDATE REQUEST ===");
        console.log("Document ID:", editingYear.id);
        console.log("Form Data (UI):", formData);
        console.log("Payload (Backend):", JSON.stringify(docData, null, 2));
        
        // Use updateDoc which handles CSRF tokens properly
        const result = await updateDoc("Academic Year", editingYear.id, docData);
        console.log("✅ Update successful - Backend response:", result);
        
        toast({
          title: "Success",
          description: `Academic year "${formData.name}" has been updated.`,
        });
        
        // Close dialog first
        closeDialog();
        
        // Small delay to ensure dialog closes before refresh
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force data refresh with revalidation
        console.log("🔄 Triggering data refresh...");
        await onSuccess();
        console.log("✅ Data refresh complete");
      } else {
        // For create, include the name field
        docData = {
          academic_year_name: formData.name,
          year_start_date: formData.startDate,
          year_end_date: formData.endDate,
          status: formData.status,
          promote_students: formData.promoteStudents ? 1 : 0,
          reset_fee_structure: formData.resetFeeStructure ? 1 : 0,
          reset_section: formData.resetAllocations ? 1 : 0,
          reset_house: formData.resetAllocations ? 1 : 0,
          promotion_based_on: formData.promotionBasis === "auto_promote" ? "Auto Promote All" : "Academic Year Based",
          passing_rule: formData.passingRuleSource === "final_exam_only" ? "Final Exam Only" : "Term + Exam weighted only",
          allow_grace_rules: formData.graceRuleApply ? 1 : 0,
          minimum_attendance_required_: formData.minAttendanceRequired ? parseFloat(formData.minAttendanceRequired) : null,
        };
        
        console.log("Creating new document");
        console.log("DocData:", docData);
        
        const result = await createDoc("Academic Year", docData);
        console.log("✅ Create successful:", result);
        
        toast({
          title: "Success",
          description: `Academic year "${formData.name}" has been created.`,
        });
        
        // Close dialog first
        closeDialog();
        
        // Small delay to ensure dialog closes before refresh
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force data refresh with revalidation
        console.log("🔄 Triggering data refresh...");
        await onSuccess();
        console.log("✅ Data refresh complete");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      console.error("Error details:", {
        message: error.message,
        httpStatus: error.httpStatus,
        httpStatusText: error.httpStatusText,
        exception: error.exception,
        exc_type: error.exc_type,
        _server_messages: error._server_messages,
      });
      
      // Extract more meaningful error message
      let errorMessage = "Failed to save academic year";
      
      // Try to parse server messages
      if (error._server_messages) {
        try {
          const messages = JSON.parse(error._server_messages);
          const parsedMessage = JSON.parse(messages[0]);
          if (parsedMessage.message) {
            errorMessage = parsedMessage.message;
          }
        } catch (e) {
          console.error("Could not parse server messages:", e);
        }
      }
      
      if (!errorMessage || errorMessage === "Failed to save academic year") {
        if (error.exception) {
          errorMessage = error.exception;
        } else if (error.httpStatusText) {
          errorMessage = error.httpStatusText;
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    dialogOpen,
    editingYear,
    formData,
    setFormData,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSave,
    isSaving,
  };
}
