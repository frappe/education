import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Lock, 
  Unlock,
  Check,
  AlertCircle,
  CalendarDays,
  Settings2,
  Archive
} from "lucide-react";
import { useFrappeGetDocList, useFrappeCreateDoc, useFrappeUpdateDoc } from "frappe-react-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import { TableCard } from "@/components/common/TableCard";
import { DataTableColumn } from "@/components/common/DataTable";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StatsCard } from "@/components/common/StatsCard";

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
  status: "Inactive",
  promoteStudents: true,
  resetFeeStructure: false,
  resetAllocations: false,
  promotionBasis: "performance_based",
  passingRuleSource: "term_exam_weighted",
  graceRuleApply: false,
  minAttendanceRequired: "",
};

const mockAcademicYears: AcademicYear[] = [
  {
    id: "1",
    name: "2024-25",
    startDate: "2024-04-01",
    endDate: "2025-03-31",
    status: "Active",
    promoteStudents: true,
    resetFeeStructure: false,
    resetAllocations: false,
    promotionBasis: "performance_based",
    passingRuleSource: "term_exam_weighted",
    graceRuleApply: true,
    minAttendanceRequired: 75,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    createdAt: new Date("2024-03-15"),
    createdBy: "admin",
    updatedAt: null,
  },
  {
    id: "2",
    name: "2023-24",
    startDate: "2023-04-01",
    endDate: "2024-03-31",
    status: "Inactive",
    promoteStudents: true,
    resetFeeStructure: true,
    resetAllocations: true,
    promotionBasis: "performance_based",
    passingRuleSource: "final_exam_only",
    graceRuleApply: false,
    minAttendanceRequired: 80,
    isLocked: true,
    lockedAt: "2024-04-01",
    lockedBy: "admin",
    createdAt: new Date("2023-03-10"),
    createdBy: "admin",
    updatedAt: "2024-04-01",
  },
  {
    id: "3",
    name: "2022-23",
    startDate: "2022-04-01",
    endDate: "2023-03-31",
    status: "Inactive",
    promoteStudents: true,
    resetFeeStructure: true,
    resetAllocations: true,
    promotionBasis: "auto_promote",
    passingRuleSource: "term_exam_weighted",
    graceRuleApply: false,
    minAttendanceRequired: null,
    isLocked: true,
    lockedAt: "2023-04-01",
    lockedBy: "admin",
    createdAt: new Date("2022-03-12"),
    createdBy: "admin",
    updatedAt: "2023-04-01",
  },
];

export default function AcademicYearMaster() {
  const { toast } = useToast();
  const breadcrumbs = useBreadcrumbs();
  
  // Frappe SDK hooks
  const { data: frappeData, isLoading, error, mutate } = useFrappeGetDocList("Academic Year", {
    fields: [
      "name",
      "academic_year_name",
      "year_start_date",
      "year_end_date",
      "status",
      "lock_status",
      "promote_students",
      "reset_fee_structure",
      "reset_house",
      "reset_section",
      "promotion_based_on",
      "passing_rule",
      "allow_grace_rules",
      "minimum_attendance_required_",
      "creation",
      "modified",
      "owner"
    ],
    orderBy: {
      field: "year_start_date",
      order: "desc"
    }
  });

  const { createDoc } = useFrappeCreateDoc();
  const { updateDoc } = useFrappeUpdateDoc();

  // Debug logging
  useEffect(() => {
    console.log('Frappe Data:', frappeData);
    console.log('Is Loading:', isLoading);
    console.log('Error:', error);
  }, [frappeData, isLoading, error]);

  // Transform Frappe data to match interface
  const academicYears: AcademicYear[] = (frappeData || []).map((doc: any) => ({
    id: doc.name,
    name: doc.academic_year_name || doc.name,
    startDate: doc.year_start_date,
    endDate: doc.year_end_date,
    status: doc.status || "Inactive",
    promoteStudents: doc.promote_students === 1,
    resetFeeStructure: doc.reset_fee_structure === 1,
    resetAllocations: doc.reset_section === 1 || doc.reset_house === 1,
    promotionBasis: doc.promotion_based_on === "Auto Promote All" ? "auto_promote" : "performance_based",
    passingRuleSource: doc.passing_rule === "Final Exam Only" ? "final_exam_only" : "term_exam_weighted",
    graceRuleApply: doc.allow_grace_rules === 1,
    minAttendanceRequired: doc.minimum_attendance_required_ || null,
    isLocked: doc.lock_status === "Locked",
    lockedAt: null,
    lockedBy: null,
    createdAt: doc.creation,
    createdBy: doc.owner,
    updatedAt: doc.modified
  }));
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState<AcademicYearFormData>(initialFormData);
  
  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);
  const [yearToActivate, setYearToActivate] = useState<AcademicYear | null>(null);
  
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [yearToLock, setYearToLock] = useState<AcademicYear | null>(null);

  const activeYear = academicYears.find(y => y.status === "Active");

  const handleAddNew = () => {
    setEditingYear(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEdit = (year: AcademicYear) => {
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

  const handleActivateClick = (year: AcademicYear) => {
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
      // Update the year to Active
      await updateDoc("Academic Year", yearToActivate.id, {
        status: "Active"
      });

      // Refresh the list
      await mutate();

      toast({
        title: "Academic Year Activated",
        description: `${yearToActivate.name} is now the active academic year. All other years have been deactivated.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to activate academic year",
        variant: "destructive",
      });
    }
    
    setActivateConfirmOpen(false);
    setYearToActivate(null);
  };

  const handleLockClick = (year: AcademicYear) => {
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

      await mutate();

      toast({
        title: "Academic Year Locked",
        description: `${yearToLock.name} has been locked. No further changes can be made to this year.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to lock academic year",
        variant: "destructive",
      });
    }
    
    setLockConfirmOpen(false);
    setYearToLock(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    if (formData.minAttendanceRequired) {
      const attendance = parseInt(formData.minAttendanceRequired);
      if (isNaN(attendance) || attendance < 0 || attendance > 100) {
        toast({
          title: "Validation Error",
          description: "Minimum attendance must be between 0 and 100.",
          variant: "destructive",
        });
        return;
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
      return;
    }

    try {
      const docData = {
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

      if (editingYear) {
        await updateDoc("Academic Year", editingYear.id, docData);
        toast({
          title: "Success",
          description: `Academic year "${formData.name}" has been updated.`,
        });
      } else {
        await createDoc("Academic Year", docData);
        toast({
          title: "Success",
          description: `Academic year "${formData.name}" has been created.`,
        });
      }

      // Refresh the list
      await mutate();

      setDialogOpen(false);
      setEditingYear(null);
      setFormData(initialFormData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save academic year",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const academicYearColumns: DataTableColumn<AcademicYear>[] = [
    {
      key: "name",
      label: "Academic Year",
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">
            Created: {format(new Date(row.createdAt), "dd MMM yyyy")}
          </div>
        </div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      render: (_, row) => (
        <div className="text-sm">
          {formatDate(row.startDate)} - {formatDate(row.endDate)}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_, row) => (
        <Badge
          variant={row.status === "Active" ? "default" : "secondary"}
          data-testid={`badge-status-${row.id}`}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "rollover",
      label: "Roll-over Rules",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.promoteStudents && (
            <Badge variant="outline" className="text-xs">
              Promote
            </Badge>
          )}
          {row.resetFeeStructure && (
            <Badge variant="outline" className="text-xs">
              Reset Fees
            </Badge>
          )}
          {row.resetAllocations && (
            <Badge variant="outline" className="text-xs">
              Reset Alloc
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "promotion",
      label: "Promotion Rules",
      render: (_, row) => (
        <div className="space-y-1">
          <div className="text-xs">
            <span className="text-muted-foreground">Basis: </span>
            <span className="font-medium">
              {row.promotionBasis === "auto_promote" ? "Auto" : "Performance"}
            </span>
          </div>
          {row.promotionBasis === "performance_based" && (
            <div className="text-xs">
              <span className="text-muted-foreground">Rule: </span>
              <span className="font-medium">
                {row.passingRuleSource === "final_exam_only" ? "Final Exam" : "Weighted Avg"}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {row.graceRuleApply && (
              <Badge variant="outline" className="text-xs">
                Grace
              </Badge>
            )}
            {row.minAttendanceRequired && (
              <Badge variant="outline" className="text-xs">
                {row.minAttendanceRequired}% Att.
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "lockStatus",
      label: "Lock Status",
      render: (_, row) =>
        row.isLocked ? (
          <div className="flex items-center gap-1 text-amber-600">
            <Lock className="w-4 h-4" />
            <span className="text-xs">Locked</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-green-600">
            <Unlock className="w-4 h-4" />
            <span className="text-xs">Unlocked</span>
          </div>
        ),
    },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <Breadcrumb items={breadcrumbs} />
      
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading academic years...</div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center p-8">
          <div className="text-destructive">Error loading academic years: {error.message}</div>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="space-y-4">
        <PageHeader
          title="Academic Year Master"
          description="Manage academic years and roll-over settings"
          action={{
            label: "Add Academic Year",
            icon: Plus,
            onClick: handleAddNew,
            testId: "button-add-academic-year"
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Current Active Year"
          value={activeYear?.name || "Not Set"}
          description={
            activeYear
              ? `${formatDate(activeYear.startDate)} - ${formatDate(activeYear.endDate)}`
              : undefined
          }
          icon={CalendarDays}
          iconColor="text-primary"
          testId="text-active-year"
        />

        <StatsCard
          title="Total Years"
          value={academicYears.length}
          description="Academic years configured"
          icon={Settings2}
          iconColor="text-blue-600"
          testId="text-total-years"
        />

        <StatsCard
          title="Locked Years"
          value={academicYears.filter(y => y.isLocked).length}
          description="Archived and locked"
          icon={Archive}
          iconColor="text-amber-600"
          testId="text-locked-years"
        />
      </div>

      <TableCard
        title="Academic Years"
        icon={Calendar}
        description="Configure academic years and their roll-over rules. Only one year can be active at a time."
        table={{
          data: academicYears,
          columns: academicYearColumns,
          getRowKey: (row) => row.id,
          testId: "table-academic-years",
          actionsColumn: {
            label: "Actions",
            headerClassName: "text-right",
            cellClassName: "text-right",
            render: (row) => (
              <div className="flex items-center justify-end gap-2">
                {row.status !== "Active" && !row.isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActivateClick(row)}
                    data-testid={`button-activate-${row.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Activate
                  </Button>
                )}
                {!row.isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(row)}
                    data-testid={`button-edit-${row.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                {!row.isLocked && row.status !== "Active" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleLockClick(row)}
                    data-testid={`button-lock-${row.id}`}
                  >
                    <Lock className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ),
          },
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[calc(100vh-200px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingYear ? "Edit Academic Year" : "Add New Academic Year"}
            </DialogTitle>
            <DialogDescription>
              {editingYear
                ? "Update the academic year details and roll-over rules."
                : "Create a new academic year with roll-over configuration."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Academic Year Name *</Label>
              <Input
                id="name"
                placeholder="e.g., 2025-26"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-year-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {formData.status === "Active" && activeYear && !editingYear && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Setting this as active will deactivate "{activeYear.name}"
                </p>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Roll-over Rules</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="promoteStudents">Promote All Students</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically promote students to next class
                  </p>
                </div>
                <Switch
                  id="promoteStudents"
                  checked={formData.promoteStudents}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, promoteStudents: checked })
                  }
                  data-testid="switch-promote-students"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="resetFeeStructure">Reset Fee Structure</Label>
                  <p className="text-xs text-muted-foreground">
                    Clear fee structure for new year configuration
                  </p>
                </div>
                <Switch
                  id="resetFeeStructure"
                  checked={formData.resetFeeStructure}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, resetFeeStructure: checked })
                  }
                  data-testid="switch-reset-fees"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="resetAllocations">Reset Allocations</Label>
                  <p className="text-xs text-muted-foreground">
                    Clear house and section allocations
                  </p>
                </div>
                <Switch
                  id="resetAllocations"
                  checked={formData.resetAllocations}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, resetAllocations: checked })
                  }
                  data-testid="switch-reset-allocations"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Promotion Rules</h4>
              
              <div className="space-y-2">
                <Label htmlFor="promotionBasis">Promotion Based On</Label>
                <Select
                  value={formData.promotionBasis}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    promotionBasis: value,
                    passingRuleSource: value === "auto_promote" ? "" : formData.passingRuleSource 
                  })}
                >
                  <SelectTrigger id="promotionBasis" data-testid="select-promotion-basis">
                    <SelectValue placeholder="Select promotion basis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_promote">Auto Promote All</SelectItem>
                    <SelectItem value="performance_based">Academic Performance Based (Recommended)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.promotionBasis === "auto_promote" 
                    ? "All students will be automatically promoted to the next class" 
                    : "Students will be promoted based on their academic performance"}
                </p>
              </div>

              {formData.promotionBasis === "performance_based" && (
                <div className="space-y-2">
                  <Label htmlFor="passingRuleSource">Passing Rule Source</Label>
                  <Select
                    value={formData.passingRuleSource}
                    onValueChange={(value) => setFormData({ ...formData, passingRuleSource: value })}
                  >
                    <SelectTrigger id="passingRuleSource" data-testid="select-passing-rule">
                      <SelectValue placeholder="Select passing rule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="final_exam_only">Final Exam Only</SelectItem>
                      <SelectItem value="term_exam_weighted">Term + Exam Weighted Average</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.passingRuleSource === "final_exam_only" 
                      ? "Promotion based on final examination scores only" 
                      : "Promotion based on weighted average of terms and exams"}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="graceRuleApply">Apply Grace Rules</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow grace marks for borderline cases
                  </p>
                </div>
                <Switch
                  id="graceRuleApply"
                  checked={formData.graceRuleApply}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, graceRuleApply: checked })
                  }
                  data-testid="switch-grace-rule"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minAttendance">Minimum Attendance Required (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="minAttendance"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g., 75"
                    value={formData.minAttendanceRequired}
                    onChange={(e) => setFormData({ ...formData, minAttendanceRequired: e.target.value })}
                    className="w-24"
                    data-testid="input-min-attendance"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty if attendance is not required for promotion
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-year">
              {editingYear ? "Update" : "Create"} Academic Year
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={activateConfirmOpen} onOpenChange={setActivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Academic Year?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set "{yearToActivate?.name}" as the active academic year.
              {activeYear && (
                <span className="block mt-2 text-amber-600">
                  The currently active year "{activeYear.name}" will be deactivated.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmActivate}>
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={lockConfirmOpen} onOpenChange={setLockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock Academic Year?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently lock "{yearToLock?.name}". Once locked:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>No changes can be made to this academic year</li>
                <li>It cannot be activated again</li>
                <li>All data will be preserved for archival reports</li>
              </ul>
              <span className="block mt-2 font-medium text-destructive">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmLock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Lock Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}
    </div>
  );
}
