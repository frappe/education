import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface AcademicYearFormProps {
  formData: AcademicYearFormData;
  setFormData: (data: AcademicYearFormData) => void;
  editingYear: AcademicYear | null;
  activeYear: AcademicYear | undefined;
}

export function AcademicYearForm({ 
  formData, 
  setFormData, 
  editingYear, 
  activeYear 
}: AcademicYearFormProps) {
  return (
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
            <SelectItem value="In-active">Inactive</SelectItem>
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
  );
}
