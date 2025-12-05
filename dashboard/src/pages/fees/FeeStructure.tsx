import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Edit, FileText, IndianRupee, Check, X } from "lucide-react";
import feeStructureData from "@/mockData/feeStructure.json";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

type FeeStructure = {
  class: string;
  tuitionFee: number;
  transportFee: number;
  libraryFee: number;
  sportsFee: number;
  hostelFee: number;
  messFee: number;
  cautionFee: number;
};

type FeeHeadKey = keyof Omit<FeeStructure, 'class'>;

export default function FeeStructure() {
  const [feeStructure, setFeeStructure] = useState<FeeStructure[]>(feeStructureData as FeeStructure[]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedFees, setEditedFees] = useState<Record<string, Record<FeeHeadKey, string>>>({});
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [inlineEdits, setInlineEdits] = useState<Partial<Record<FeeHeadKey, string>>>({});
  const { toast } = useToast();

  const feeHeads: Array<{ key: FeeHeadKey; label: string }> = [
    { key: "tuitionFee", label: "Tuition Fee" },
    { key: "transportFee", label: "Transport Fee" },
    { key: "libraryFee", label: "Library Fee" },
    { key: "sportsFee", label: "Sports Fee" },
    { key: "hostelFee", label: "Hostel Fee" },
    { key: "messFee", label: "Mess Fee" },
    { key: "cautionFee", label: "Caution Fee" }
  ];

  const calculateTotal = (classData: FeeStructure) => {
    return feeHeads.reduce((sum, head) => sum + (classData[head.key] || 0), 0);
  };

  const handleOpenEditDialog = () => {
    const initialEdited: Record<string, Record<FeeHeadKey, string>> = {};
    feeStructure.forEach(classData => {
      initialEdited[classData.class] = {} as Record<FeeHeadKey, string>;
      feeHeads.forEach(head => {
        initialEdited[classData.class][head.key] = classData[head.key]?.toString() || '0';
      });
    });
    setEditedFees(initialEdited);
    setIsEditDialogOpen(true);
  };

  const handleFeeChange = (className: string, feeKey: FeeHeadKey, value: string) => {
    setEditedFees(prev => ({
      ...prev,
      [className]: {
        ...prev[className],
        [feeKey]: value
      }
    }));
  };

  const handleSaveChanges = () => {
    try {
      const updated = feeStructure.map(classData => {
        const updatedClass = { ...classData };
        feeHeads.forEach(head => {
          const value = parseInt(editedFees[classData.class][head.key]) || 0;
          updatedClass[head.key] = value;
        });
        return updatedClass;
      });
      setFeeStructure(updated);
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Fee structure updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update fee structure",
        variant: "destructive",
      });
    }
  };

  const handleStartInlineEdit = (classData: FeeStructure) => {
    const initialEdits: Partial<Record<FeeHeadKey, string>> = {};
    feeHeads.forEach(head => {
      initialEdits[head.key] = classData[head.key]?.toString() || '0';
    });
    setInlineEdits(initialEdits);
    setEditingClass(classData.class);
  };

  const handleInlineChange = (feeKey: FeeHeadKey, value: string) => {
    setInlineEdits(prev => ({
      ...prev,
      [feeKey]: value
    }));
  };

  const handleSaveInlineEdit = () => {
    try {
      const updated = feeStructure.map(classData => {
        if (classData.class === editingClass) {
          const updatedClass = { ...classData };
          feeHeads.forEach(head => {
            const value = parseInt(inlineEdits[head.key] || '0') || 0;
            updatedClass[head.key] = value;
          });
          return updatedClass;
        }
        return classData;
      });
      setFeeStructure(updated);
      setEditingClass(null);
      setInlineEdits({});
      toast({
        title: "Success",
        description: `${editingClass} fees updated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update fees",
        variant: "destructive",
      });
    }
  };

  const handleCancelInlineEdit = () => {
    setEditingClass(null);
    setInlineEdits({});
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Fees", href: "/fees" },
        { label: "Fee Structure" }
      ]} />
      
      <PageHeader
        title="Fee Structure Configuration"
        description="Class-wise fee amounts for Academic Year 2024-25"
        action={{
          label: "Update Structure",
          icon: Edit,
          onClick: handleOpenEditDialog,
          testId: "button-update-structure"
        }}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-bulk-edit-fees">
          <DialogHeader>
            <DialogTitle>Bulk Edit Fee Structure</DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-2 bg-muted text-left font-semibold">Class</th>
                  {feeHeads.map(head => (
                    <th 
                      key={head.key} 
                      className="border border-border p-2 bg-muted text-right font-semibold text-sm"
                    >
                      {head.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feeStructure.map(classData => (
                  <tr key={classData.class} data-testid={`edit-row-${classData.class}`}>
                    <td className="border border-border p-2 font-medium bg-muted/30">
                      {classData.class}
                    </td>
                    {feeHeads.map(head => (
                      <td key={head.key} className="border border-border p-1">
                        <Input
                          type="number"
                          min="0"
                          value={editedFees[classData.class]?.[head.key] || '0'}
                          onChange={(e) => handleFeeChange(classData.class, head.key, e.target.value)}
                          className="h-8 text-right text-sm"
                          data-testid={`input-${head.key}-${classData.class}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
            <p><strong>Note:</strong> Enter fee amounts in rupees. Leave at 0 if not applicable for a class.</p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges}
              data-testid="button-save-fees"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Fee Heads by Class
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="table-fee-structure">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Class</TableHead>
                  {feeHeads.map((head) => (
                    <TableHead key={head.key} className="text-right font-semibold">
                      {head.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold">Total</TableHead>
                  <TableHead className="text-center font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStructure.map((classData) => {
                  const isEditing = editingClass === classData.class;
                  const displayTotal = isEditing 
                    ? feeHeads.reduce((sum, head) => sum + (parseInt(inlineEdits[head.key] || '0') || 0), 0)
                    : calculateTotal(classData);

                  return (
                    <TableRow key={classData.class} data-testid={`row-class-${classData.class}`}>
                      <TableCell className="font-medium" data-testid={`text-class-${classData.class}`}>
                        {classData.class}
                      </TableCell>
                      {feeHeads.map((head) => (
                        <TableCell 
                          key={head.key} 
                          className="text-right p-1" 
                          data-testid={`text-${head.key}-${classData.class}`}
                        >
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              value={inlineEdits[head.key] || '0'}
                              onChange={(e) => handleInlineChange(head.key, e.target.value)}
                              className="h-8 text-right text-sm"
                              data-testid={`inline-input-${head.key}-${classData.class}`}
                            />
                          ) : (
                            classData[head.key] > 0 ? (
                              <span className="font-mono">₹{classData[head.key].toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )
                          )}
                        </TableCell>
                      ))}
                      <TableCell 
                        className="text-right font-semibold" 
                        data-testid={`text-total-${classData.class}`}
                      >
                        <span className="font-mono">₹{displayTotal.toLocaleString('en-IN')}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={handleSaveInlineEdit}
                              data-testid={`button-save-inline-${classData.class}`}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={handleCancelInlineEdit}
                              data-testid={`button-cancel-inline-${classData.class}`}
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleStartInlineEdit(classData)}
                            data-testid={`button-edit-${classData.class}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 border border-border rounded-md bg-muted/30">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Fee Head Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {feeHeads.map((head) => {
                const total = feeStructure.reduce((sum, classData) => sum + (classData[head.key] || 0), 0);
                const avg = Math.round(total / feeStructure.length);
                return (
                  <div key={head.key} className="space-y-1" data-testid={`summary-${head.key}`}>
                    <p className="text-xs text-muted-foreground">{head.label}</p>
                    <p className="text-sm font-semibold">Avg: ₹{avg.toLocaleString('en-IN')}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <p>
              <strong>Note:</strong> Fee amounts shown are annual fees. Hostel and Mess fees are applicable only 
              for residential students. Caution Fee is a one-time refundable deposit of ₹2,000.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
