import { useEffect } from "react";
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
import { useFrappeGetDocList } from "frappe-react-sdk";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import { TableCard } from "@/components/common/TableCard";
import { DataTableColumn } from "@/components/common/DataTable";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StatsCard } from "@/components/common/StatsCard";
import { AcademicYearForm } from "@/components/masters/AcademicYearForm";
import { FormDialog } from "@/components/common/FormDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAcademicYearForm } from "@/hooks/useAcademicYearForm";
import { useAcademicYearActions } from "@/hooks/useAcademicYearActions";
import { useState } from "react";

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

export default function AcademicYearMaster() {
  const breadcrumbs = useBreadcrumbs();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
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

  const handleRefreshData = async () => {
    console.log("🔄 Force refreshing data from backend...");
    await mutate(undefined, { revalidate: true });
    console.log("✅ Data refreshed from backend");
  };

  const handleRetryLogin = () => {
    console.log('Retrying after login...');
    // Force a full page reload to get fresh auth state
    window.location.reload();
  };

  // Debug logging
  useEffect(() => {
    console.log('Frappe Data:', frappeData);
    console.log('Is Loading:', isLoading);
    console.log('Error:', error);
    
    // Check if user is not authenticated
    if (error && (error as any)?.exception === 'frappe.exceptions.PermissionError') {
      console.error('❌ Authentication Error: User is not logged into Frappe');
      console.log('💡 Solution: Please login to Frappe first at http://education.localhost:8003');
      console.log('📋 Checking cookies...', document.cookie);
    }
  }, [frappeData, isLoading, error]);

  // Transform Frappe data to match interface
  const academicYears: AcademicYear[] = (frappeData || []).map((doc: any) => ({
    id: doc.name,
    name: doc.academic_year_name || doc.name,
    startDate: doc.year_start_date,
    endDate: doc.year_end_date,
    status: doc.status || "In-active",
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

  const activeYear = academicYears.find(y => y.status === "Active");

  // Pagination calculations
  const totalItems = academicYears.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = academicYears.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  // Form management hook
  const {
    dialogOpen,
    editingYear,
    formData,
    setFormData,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSave,
    isSaving,
  } = useAcademicYearForm({
    onSuccess: handleRefreshData,
    academicYears,
  });

  // Actions hook (activate/lock)
  const {
    activateConfirmOpen,
    setActivateConfirmOpen,
    yearToActivate,
    openActivateDialog,
    handleConfirmActivate,
    lockConfirmOpen,
    setLockConfirmOpen,
    yearToLock,
    openLockDialog,
    handleConfirmLock,
  } = useAcademicYearActions({
    onSuccess: handleRefreshData,
  });

  const handleAddNew = openCreateDialog;
  const handleEdit = openEditDialog;
  const handleActivateClick = openActivateDialog;
  const handleLockClick = openLockDialog;
  const handleDialogClose = (open: boolean) => {
    if (!open) closeDialog();
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-destructive/20 p-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-destructive">Authentication Required</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {(error as any)?.exception === 'frappe.exceptions.PermissionError' 
                  ? 'You need to be logged into Frappe to access this feature.'
                  : `Error loading academic years: ${error.message}`}
              </p>
              {(error as any)?.exception === 'frappe.exceptions.PermissionError' && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">To fix this:</p>
                  <ol className="text-sm text-left list-decimal list-inside space-y-1">
                    <li>Open a new tab: <a href="http://education.localhost:8003" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">http://education.localhost:8003</a></li>
                    <li>Login with your Frappe credentials (usually <code className="bg-muted px-1 py-0.5 rounded">Administrator</code>)</li>
                    <li>Come back to this tab and click the button below</li>
                  </ol>
                  <Button 
                    onClick={handleRetryLogin}
                    className="mt-4"
                    variant="default"
                  >
                    Retry After Login
                  </Button>
                </div>
              )}
            </div>
          </div>
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
          data: paginatedData,
          columns: academicYearColumns,
          getRowKey: (row) => row.id,
          testId: "table-academic-years",
          pagination: {
            currentPage,
            pageSize,
            totalItems,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
            pageSizeOptions: [5, 10, 20, 50],
            showInfo: true,
          },
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

      <FormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        title={editingYear ? "Edit Academic Year" : "Add New Academic Year"}
        description={
          editingYear
            ? "Update the academic year details and roll-over rules."
            : "Create a new academic year with roll-over configuration."
        }
        onSave={handleSave}
        saveText={isSaving ? "Saving..." : (editingYear ? "Update Academic Year" : "Create Academic Year")}
        saveButtonTestId="button-save-year"
        maxWidth="lg"
      >
        <AcademicYearForm
          formData={formData}
          setFormData={setFormData}
          editingYear={editingYear}
          activeYear={activeYear}
        />
      </FormDialog>

      <ConfirmDialog
        open={activateConfirmOpen}
        onOpenChange={setActivateConfirmOpen}
        title="Activate Academic Year?"
        description={
          <>
            This will set "{yearToActivate?.name}" as the active academic year.
            {activeYear && (
              <span className="block mt-2 text-amber-600">
                The currently active year "{activeYear.name}" will be deactivated.
              </span>
            )}
          </>
        }
        onConfirm={handleConfirmActivate}
        confirmText="Activate"
      />

      <ConfirmDialog
        open={lockConfirmOpen}
        onOpenChange={setLockConfirmOpen}
        title="Lock Academic Year?"
        description={
          <>
            This will permanently lock "{yearToLock?.name}". Once locked:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>No changes can be made to this academic year</li>
              <li>It cannot be activated again</li>
              <li>All data will be preserved for archival reports</li>
            </ul>
            <span className="block mt-2 font-medium text-destructive">
              This action cannot be undone.
            </span>
          </>
        }
        onConfirm={handleConfirmLock}
        confirmText="Lock Permanently"
        variant="destructive"
      />
        </>
      )}
    </div>
  );
}
