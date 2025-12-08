import { useState } from "react";
import { useFrappeUpdateDoc } from "frappe-react-sdk";
import { useToast } from "@/hooks/use-toast";

interface AcademicYear {
  id: string;
  name: string;
  status: string;
  isLocked: boolean;
}

interface UseAcademicYearActionsProps {
  onSuccess: () => void;
}

export function useAcademicYearActions({ onSuccess }: UseAcademicYearActionsProps) {
  const { toast } = useToast();
  const { updateDoc } = useFrappeUpdateDoc();

  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);
  const [yearToActivate, setYearToActivate] = useState<AcademicYear | null>(null);

  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [yearToLock, setYearToLock] = useState<AcademicYear | null>(null);

  const openActivateDialog = (year: AcademicYear) => {
    if (year.isLocked) {
      toast({
        title: "Cannot Activate",
        description: "This academic year is locked and cannot be activated.",
        variant: "destructive",
      });
      return;
    }
    setYearToActivate(year);
    setActivateConfirmOpen(true);
  };

  const handleConfirmActivate = async () => {
    if (!yearToActivate) return;

    try {
      await updateDoc("Academic Year", yearToActivate.id, {
        status: "Active"
      });

      toast({
        title: "Academic Year Activated",
        description: `${yearToActivate.name} is now the active academic year. All other years have been deactivated.`,
      });

      setActivateConfirmOpen(false);
      setYearToActivate(null);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to activate academic year",
        variant: "destructive",
      });
    }
  };

  const openLockDialog = (year: AcademicYear) => {
    if (year.status === "Active") {
      toast({
        title: "Cannot Lock",
        description: "Cannot lock the currently active academic year. Please activate another year first.",
        variant: "destructive",
      });
      return;
    }
    setYearToLock(year);
    setLockConfirmOpen(true);
  };

  const handleConfirmLock = async () => {
    if (!yearToLock) return;

    try {
      await updateDoc("Academic Year", yearToLock.id, {
        lock_status: "Locked"
      });

      toast({
        title: "Academic Year Locked",
        description: `${yearToLock.name} has been locked. No further changes can be made to this year.`,
      });

      setLockConfirmOpen(false);
      setYearToLock(null);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to lock academic year",
        variant: "destructive",
      });
    }
  };

  return {
    // Activate
    activateConfirmOpen,
    setActivateConfirmOpen,
    yearToActivate,
    openActivateDialog,
    handleConfirmActivate,
    // Lock
    lockConfirmOpen,
    setLockConfirmOpen,
    yearToLock,
    openLockDialog,
    handleConfirmLock,
  };
}
