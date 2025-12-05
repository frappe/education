import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, Percent, Gift, IndianRupee, Plus, Edit } from "lucide-react";
import discountsData from "@/mockData/discounts.json";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

// Temporary feature flag to hide Add/Edit discount actions while aligning processes
const SHOW_DISCOUNT_ACTIONS = false;

type Discount = {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  discountType: string;
  discountPercentage?: number;
  discountAmount: number;
  appliedOn: string;
  reason: string;
  appliedDate: string;
  approvedBy: string;
};

type NewDiscountForm = {
  studentId: string;
  studentName: string;
  class: string;
  discountType: string;
  discountPercentage: string;
  discountAmount: string;
  appliedOn: string;
  reason: string;
  approvedBy: string;
};

type DiscountMaster = {
  siblingAmount: number;
  meritLow: number;
  meritHigh: number;
  staffTwoYounger: number;
  staffTwoElder: number;
  staffThreeYoungest: number;
  staffThreeMiddle: number;
  specialApprovalRequired: boolean;
};

export default function DiscountManagement() {
  const [discounts, setDiscounts] = useState<Discount[]>(discountsData as Discount[]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewDiscount, setViewDiscount] = useState<Discount | null>(null);
  const [editingMasterType, setEditingMasterType] = useState<string | null>(null);
  const [discountMaster, setDiscountMaster] = useState<DiscountMaster>({
    siblingAmount: 1500,
    meritLow: 50,
    meritHigh: 75,
    staffTwoYounger: 100,
    staffTwoElder: 50,
    staffThreeYoungest: 100,
    staffThreeMiddle: 50,
    specialApprovalRequired: true
  });
  const [masterFormData, setMasterFormData] = useState<Partial<DiscountMaster>>({});
  const [newDiscount, setNewDiscount] = useState<NewDiscountForm>({
    studentId: '',
    studentName: '',
    class: '',
    discountType: 'Sibling Discount',
    discountPercentage: '',
    discountAmount: '',
    appliedOn: 'Tuition Fee',
    reason: '',
    approvedBy: 'Principal'
  });
  const { toast } = useToast();

  const handleEditMaster = (type: string) => {
    if (type === 'Sibling Discount') {
      setMasterFormData({ siblingAmount: discountMaster.siblingAmount });
    } else if (type === 'Merit Discount') {
      setMasterFormData({ meritLow: discountMaster.meritLow, meritHigh: discountMaster.meritHigh });
    } else if (type === 'Staff Children') {
      setMasterFormData({
        staffTwoYounger: discountMaster.staffTwoYounger,
        staffTwoElder: discountMaster.staffTwoElder,
        staffThreeYoungest: discountMaster.staffThreeYoungest,
        staffThreeMiddle: discountMaster.staffThreeMiddle
      });
    } else if (type === 'Special Discount') {
      setMasterFormData({ specialApprovalRequired: discountMaster.specialApprovalRequired });
    }
    setEditingMasterType(type);
  };

  const handleSaveMasterChanges = () => {
    try {
      setDiscountMaster({
        ...discountMaster,
        ...masterFormData
      });
      setEditingMasterType(null);
      setMasterFormData({});
      toast({
        title: "Success",
        description: `${editingMasterType} rules updated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update discount rules",
        variant: "destructive",
      });
    }
  };

  const discountTypes = [
    {
      name: "Sibling Discount",
      amount: `₹${discountMaster.siblingAmount.toLocaleString('en-IN')}`,
      description: "Fixed discount for siblings",
      count: discounts.filter(d => d.discountType === "Sibling Discount").length,
      total: discounts.filter(d => d.discountType === "Sibling Discount")
        .reduce((sum, d) => sum + d.discountAmount, 0),
      icon: Users,
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
    },
    {
      name: "Merit Discount",
      amount: `${discountMaster.meritLow}% / ${discountMaster.meritHigh}%`,
      description: "Based on academic performance",
      count: discounts.filter(d => d.discountType === "Merit Discount").length,
      total: discounts.filter(d => d.discountType === "Merit Discount")
        .reduce((sum, d) => sum + d.discountAmount, 0),
      icon: Percent,
      color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
    },
    {
      name: "Staff Children",
      amount: "Variable",
      description: "Special rules for staff children",
      count: discounts.filter(d => d.discountType.startsWith("Staff Children")).length,
      total: discounts.filter(d => d.discountType.startsWith("Staff Children"))
        .reduce((sum, d) => sum + d.discountAmount, 0),
      icon: Gift,
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
    },
    {
      name: "Special Discount",
      amount: "Variable",
      description: "Case-by-case approval",
      count: discounts.filter(d => d.discountType === "Special Discount").length,
      total: discounts.filter(d => d.discountType === "Special Discount")
        .reduce((sum, d) => sum + d.discountAmount, 0),
      icon: IndianRupee,
      color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
    }
  ];

  const totalDiscountGiven = discounts.reduce((sum, d) => sum + d.discountAmount, 0);

  const handleAddDiscount = () => {
    if (!newDiscount.studentId || !newDiscount.studentName || !newDiscount.class || !newDiscount.discountAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const discount: Discount = {
        id: `DISC-${Date.now()}`,
        studentId: newDiscount.studentId,
        studentName: newDiscount.studentName,
        class: newDiscount.class,
        discountType: newDiscount.discountType,
        discountPercentage: newDiscount.discountPercentage ? parseInt(newDiscount.discountPercentage) : undefined,
        discountAmount: parseInt(newDiscount.discountAmount),
        appliedOn: newDiscount.appliedOn,
        reason: newDiscount.reason,
        appliedDate: new Date().toISOString(),
        approvedBy: newDiscount.approvedBy
      };

      setDiscounts([...discounts, discount]);
      setIsAddDialogOpen(false);
      setNewDiscount({
        studentId: '',
        studentName: '',
        class: '',
        discountType: 'Sibling Discount',
        discountPercentage: '',
        discountAmount: '',
        appliedOn: 'Tuition Fee',
        reason: '',
        approvedBy: 'Principal'
      });
      toast({
        title: "Success",
        description: "Discount added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add discount",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Masters", href: "/masters" },
        { label: "Fee" },
        { label: "Discount Management" }
      ]} />
      
      <PageHeader
        title="Discount Management"
        description="Manage fee discounts and view applied discounts"
        customActions={
          SHOW_DISCOUNT_ACTIONS ? (
            <Button 
              data-testid="button-add-discount"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Discount
            </Button>
          ) : undefined
        }
      />

      {/* Add Discount Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-add-discount">
          <DialogHeader>
            <DialogTitle>Add New Discount</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Student ID</label>
                <Input
                  placeholder="STU-001"
                  value={newDiscount.studentId}
                  onChange={(e) => setNewDiscount({...newDiscount, studentId: e.target.value})}
                  data-testid="input-student-id"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Student Name</label>
                <Input
                  placeholder="John Doe"
                  value={newDiscount.studentName}
                  onChange={(e) => setNewDiscount({...newDiscount, studentName: e.target.value})}
                  data-testid="input-student-name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <Select value={newDiscount.class} onValueChange={(value) => setNewDiscount({...newDiscount, class: value})}>
                  <SelectTrigger data-testid="select-class">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Type</label>
                <Select value={newDiscount.discountType} onValueChange={(value) => setNewDiscount({...newDiscount, discountType: value})}>
                  <SelectTrigger data-testid="select-discount-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sibling Discount">Sibling Discount</SelectItem>
                    <SelectItem value="Merit Discount">Merit Discount</SelectItem>
                    <SelectItem value="Staff Children (2)">Staff Children (2)</SelectItem>
                    <SelectItem value="Staff Children (3)">Staff Children (3)</SelectItem>
                    <SelectItem value="Special Discount">Special Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Percentage</label>
                <Input
                  type="number"
                  placeholder="50"
                  value={newDiscount.discountPercentage}
                  onChange={(e) => setNewDiscount({...newDiscount, discountPercentage: e.target.value})}
                  data-testid="input-discount-percentage"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={newDiscount.discountAmount}
                  onChange={(e) => setNewDiscount({...newDiscount, discountAmount: e.target.value})}
                  data-testid="input-discount-amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Applied On</label>
              <Select value={newDiscount.appliedOn} onValueChange={(value) => setNewDiscount({...newDiscount, appliedOn: value})}>
                <SelectTrigger data-testid="select-applied-on">
                  <SelectValue placeholder="Select fee head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tuition Fee">Tuition Fee</SelectItem>
                  <SelectItem value="Transport Fee">Transport Fee</SelectItem>
                  <SelectItem value="Hostel Fee">Hostel Fee</SelectItem>
                  <SelectItem value="All Fees">All Fees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Input
                placeholder="Reason for discount"
                value={newDiscount.reason}
                onChange={(e) => setNewDiscount({...newDiscount, reason: e.target.value})}
                data-testid="input-reason"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Approved By</label>
              <Select value={newDiscount.approvedBy} onValueChange={(value) => setNewDiscount({...newDiscount, approvedBy: value})}>
                <SelectTrigger data-testid="select-approved-by">
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Principal">Principal</SelectItem>
                  <SelectItem value="Vice Principal">Vice Principal</SelectItem>
                  <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              data-testid="button-cancel-add-discount"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddDiscount}
              data-testid="button-save-add-discount"
            >
              Add Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Discount Master Dialog */}
      <Dialog open={!!editingMasterType} onOpenChange={(open) => !open && setEditingMasterType(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-master">
          <DialogHeader>
            <DialogTitle>Edit {editingMasterType} Rules</DialogTitle>
          </DialogHeader>

          {editingMasterType === 'Sibling Discount' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sibling Discount Amount (₹)</label>
                <Input
                  type="number"
                  value={masterFormData.siblingAmount || ''}
                  onChange={(e) => setMasterFormData({...masterFormData, siblingAmount: parseInt(e.target.value) || 0})}
                  data-testid="input-sibling-amount"
                />
              </div>
              <div className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <p><strong>Current:</strong> ₹{discountMaster.siblingAmount.toLocaleString('en-IN')}</p>
                <p className="mt-2">Fixed amount given to students with enrolled siblings</p>
              </div>
            </div>
          )}

          {editingMasterType === 'Merit Discount' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Low Merit Percentage (%)</label>
                  <Input
                    type="number"
                    value={masterFormData.meritLow || ''}
                    onChange={(e) => setMasterFormData({...masterFormData, meritLow: parseInt(e.target.value) || 0})}
                    data-testid="input-merit-low"
                  />
                  <p className="text-xs text-muted-foreground">For 85-89% marks</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">High Merit Percentage (%)</label>
                  <Input
                    type="number"
                    value={masterFormData.meritHigh || ''}
                    onChange={(e) => setMasterFormData({...masterFormData, meritHigh: parseInt(e.target.value) || 0})}
                    data-testid="input-merit-high"
                  />
                  <p className="text-xs text-muted-foreground">For 90%+ marks</p>
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <p><strong>Current:</strong> {discountMaster.meritLow}% / {discountMaster.meritHigh}%</p>
              </div>
            </div>
          )}

          {editingMasterType === 'Staff Children' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-2">For 2 Children:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Younger Child (%)</label>
                      <Input
                        type="number"
                        value={masterFormData.staffTwoYounger || ''}
                        onChange={(e) => setMasterFormData({...masterFormData, staffTwoYounger: parseInt(e.target.value) || 0})}
                        data-testid="input-staff-two-younger"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Elder Child (%)</label>
                      <Input
                        type="number"
                        value={masterFormData.staffTwoElder || ''}
                        onChange={(e) => setMasterFormData({...masterFormData, staffTwoElder: parseInt(e.target.value) || 0})}
                        data-testid="input-staff-two-elder"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">For 3 Children:</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Youngest (%)</label>
                      <Input
                        type="number"
                        value={masterFormData.staffThreeYoungest || ''}
                        onChange={(e) => setMasterFormData({...masterFormData, staffThreeYoungest: parseInt(e.target.value) || 0})}
                        data-testid="input-staff-three-youngest"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Middle (%)</label>
                      <Input
                        type="number"
                        value={masterFormData.staffThreeMiddle || ''}
                        onChange={(e) => setMasterFormData({...masterFormData, staffThreeMiddle: parseInt(e.target.value) || 0})}
                        data-testid="input-staff-three-middle"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Eldest (%)</label>
                      <Input
                        type="number"
                        value="0"
                        disabled
                        data-testid="input-staff-three-eldest"
                      />
                      <p className="text-xs text-muted-foreground">Full fee</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <p><strong>Current Rules:</strong></p>
                <p>2 Children: Younger {discountMaster.staffTwoYounger}%, Elder {discountMaster.staffTwoElder}%</p>
                <p>3 Children: Youngest {discountMaster.staffThreeYoungest}%, Middle {discountMaster.staffThreeMiddle}%, Eldest 0%</p>
              </div>
            </div>
          )}

          {editingMasterType === 'Special Discount' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Principal Approval Required</label>
                <Select 
                  value={masterFormData.specialApprovalRequired ? 'yes' : 'no'} 
                  onValueChange={(value) => setMasterFormData({...masterFormData, specialApprovalRequired: value === 'yes'})}
                >
                  <SelectTrigger data-testid="select-special-approval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <p><strong>Purpose:</strong> Case-by-case approval system for special discounts</p>
                <p className="mt-2"><strong>Current:</strong> Approval {masterFormData.specialApprovalRequired ? 'Required' : 'Not Required'}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setEditingMasterType(null)}
              data-testid="button-cancel-edit-master"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMasterChanges}
              data-testid="button-save-edit-master"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {discountTypes.map((type) => (
          <Card key={type.name} data-testid={`card-discount-type-${type.name.toLowerCase().replace(/ /g, '-')}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-2">
                <div className={`w-10 h-10 rounded-md ${type.color} flex items-center justify-center`}>
                  <type.icon className="w-5 h-5" />
                </div>
                {SHOW_DISCOUNT_ACTIONS && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditMaster(type.name)}
                    data-testid={`button-edit-master-${type.name.toLowerCase().replace(/ /g, '-')}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardTitle className="text-base">{type.name}</CardTitle>
              <CardDescription className="text-xs">{type.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Amount:</span>
                <span className="text-sm font-semibold" data-testid={`text-discount-amount-${type.name.toLowerCase().replace(/ /g, '-')}`}>
                  {type.amount}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Students:</span>
                <span className="text-sm font-semibold" data-testid={`text-discount-count-${type.name.toLowerCase().replace(/ /g, '-')}`}>
                  {type.count}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">Total Given:</span>
                <span className="text-sm font-semibold text-foreground" data-testid={`text-discount-total-${type.name.toLowerCase().replace(/ /g, '-')}`}>
                  ₹{type.total.toLocaleString('en-IN')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Applied Discounts</CardTitle>
              <CardDescription className="mt-1">
                All discounts currently applied to students
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Discount Given</p>
              <p className="text-2xl font-semibold text-foreground" data-testid="text-total-discount-given">
                ₹{totalDiscountGiven.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="table-applied-discounts">
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Discount Type</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead className="text-right">Amount / %</TableHead>
                  <TableHead className="text-right">Discount Amount</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id} data-testid={`row-discount-${discount.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium" data-testid={`text-student-name-${discount.id}`}>
                          {discount.studentName}
                        </p>
                        <p className="text-xs text-muted-foreground">{discount.studentId}</p>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-class-${discount.id}`}>{discount.class}</TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-type-${discount.id}`}>
                        {discount.discountType}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-applied-on-${discount.id}`}>{discount.appliedOn}</TableCell>
                    <TableCell className="text-right" data-testid={`text-percentage-${discount.id}`}>
                      {discount.discountPercentage ? `${discount.discountPercentage}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`text-amount-${discount.id}`}>
                      ₹{discount.discountAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell data-testid={`text-applied-date-${discount.id}`}>
                      {new Date(discount.appliedDate).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell data-testid={`text-approved-by-${discount.id}`}>
                      {discount.approvedBy}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        data-testid={`button-view-${discount.id}`}
                        onClick={() => setViewDiscount(discount)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 p-3 border border-border rounded-md bg-muted/30">
            <h4 className="text-sm font-semibold mb-2">Discount Rules:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Sibling Discount:</strong> ₹{discountMaster.siblingAmount.toLocaleString('en-IN')} flat discount per student with enrolled sibling</li>
              <li>• <strong>Merit Discount:</strong> {discountMaster.meritLow}% for 85-89% marks, {discountMaster.meritHigh}% for 90%+ marks in previous year</li>
              <li>• <strong>Staff Children (2):</strong> Younger child {discountMaster.staffTwoYounger}%, Elder child {discountMaster.staffTwoElder}%</li>
              <li>• <strong>Staff Children (3):</strong> Youngest {discountMaster.staffThreeYoungest}%, Middle {discountMaster.staffThreeMiddle}%, Eldest full fee</li>
              <li>• <strong>Special Discount:</strong> Requires {discountMaster.specialApprovalRequired ? 'approval' : 'no approval'} from Principal/Management</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* View Discount Dialog */}
      <Dialog open={!!viewDiscount} onOpenChange={(open) => !open && setViewDiscount(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-view-discount">
          <DialogHeader>
            <DialogTitle>Discount Details</DialogTitle>
          </DialogHeader>

          {viewDiscount && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Student ID</p>
                  <p className="text-base font-semibold" data-testid="view-student-id">{viewDiscount.studentId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Student Name</p>
                  <p className="text-base font-semibold" data-testid="view-student-name">{viewDiscount.studentName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Class</p>
                  <p className="text-base font-semibold" data-testid="view-class">{viewDiscount.class}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Discount Type</p>
                  <Badge variant="outline" data-testid="view-type">{viewDiscount.discountType}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Applied On</p>
                  <p className="text-base font-semibold" data-testid="view-applied-on">{viewDiscount.appliedOn}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Percentage</p>
                  <p className="text-base font-semibold" data-testid="view-percentage">
                    {viewDiscount.discountPercentage ? `${viewDiscount.discountPercentage}%` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Discount Amount</p>
                  <p className="text-base font-semibold text-green-600" data-testid="view-amount">
                    ₹{viewDiscount.discountAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Applied Date</p>
                  <p className="text-base font-semibold" data-testid="view-date">
                    {new Date(viewDiscount.appliedDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Reason</p>
                <p className="text-base" data-testid="view-reason">{viewDiscount.reason || "N/A"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved By</p>
                <p className="text-base font-semibold" data-testid="view-approved-by">{viewDiscount.approvedBy}</p>
              </div>

              <div className="p-3 border border-border rounded-md bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <strong>Discount ID:</strong> {viewDiscount.id}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setViewDiscount(null)}
              data-testid="button-close-view"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
