'use client';

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Home, Bus, Award, Info, Pause, Play } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import feeSchemesData from "@/mockData/feeSchemeTypes.json";

interface FeeScheme {
  id: string;
  code: string;
  name: string;
  description: string;
  schoolFeeWaived: boolean;
  hostelFeeWaived: boolean;
  busFeeWaived: boolean;
  isActive: boolean;
  specialRules?: string;
  hostelType?: string;
  acSurcharge?: number;
}

interface FormData {
  name: string;
  code: string;
  description: string;
  schoolFeeWaived: boolean;
  hostelFeeWaived: boolean;
  busFeeWaived: boolean;
  isActive: boolean;
  specialRules: string;
  hostelType: string;
  acSurcharge: number;
}

export default function FeeSchemes() {
  const [schemes, setSchemes] = useState<FeeScheme[]>(feeSchemesData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<FeeScheme | null>(null);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [schemeToToggle, setSchemeToToggle] = useState<FeeScheme | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    schoolFeeWaived: false,
    hostelFeeWaived: false,
    busFeeWaived: false,
    isActive: true,
    specialRules: '',
    hostelType: '',
    acSurcharge: 0,
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const getSchemeTypeColor = (code: string) => {
    if (['RTE', 'MDY', 'JUY', 'SHRESHTA', 'ATAL'].includes(code)) {
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700';
    }
    if (code === 'STAFF_CHILDREN') {
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
    }
    return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700';
  };

  const getSchemeTypeLabel = (code: string) => {
    if (['RTE', 'MDY', 'JUY', 'SHRESHTA', 'ATAL'].includes(code)) {
      return 'Government Scheme';
    }
    if (code === 'STAFF_CHILDREN') {
      return 'Staff Benefit';
    }
    if (code === 'HOSTEL_AC' || code === 'HOSTEL_NON_AC') {
      return 'Hostel';
    }
    return 'Standard';
  };

  const handleAddScheme = () => {
    setEditingScheme(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      schoolFeeWaived: false,
      hostelFeeWaived: false,
      busFeeWaived: false,
      isActive: true,
      specialRules: '',
      hostelType: '',
      acSurcharge: 0,
    });
    setDialogOpen(true);
  };

  const handleEditScheme = (scheme: FeeScheme) => {
    setEditingScheme(scheme);
    setFormData({
      name: scheme.name,
      code: scheme.code,
      description: scheme.description,
      schoolFeeWaived: scheme.schoolFeeWaived,
      hostelFeeWaived: scheme.hostelFeeWaived,
      busFeeWaived: scheme.busFeeWaived,
      isActive: scheme.isActive,
      specialRules: scheme.specialRules || '',
      hostelType: scheme.hostelType || '',
      acSurcharge: scheme.acSurcharge || 0,
    });
    setDialogOpen(true);
  };

  const handleViewDetails = (scheme: FeeScheme) => {
    setLocation(`/fees/schemes/${scheme.code}`);
  };

  const handlePauseResumeClick = (scheme: FeeScheme) => {
    setSchemeToToggle(scheme);
    setPauseConfirmOpen(true);
  };

  const handleConfirmToggle = () => {
    if (!schemeToToggle) return;

    const updatedSchemes = schemes.map(s =>
      s.id === schemeToToggle.id
        ? { ...s, isActive: !s.isActive }
        : s
    );
    setSchemes(updatedSchemes);

    const action = schemeToToggle.isActive ? 'paused' : 'resumed';
    toast({
      title: "Success",
      description: `Fee scheme "${schemeToToggle.name}" has been ${action}`,
    });

    setPauseConfirmOpen(false);
    setSchemeToToggle(null);
  };

  const handleSaveScheme = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingScheme) {
      setSchemes(schemes.map(s =>
        s.id === editingScheme.id
          ? { ...editingScheme, ...formData }
          : s
      ));
      toast({
        title: "Success",
        description: `Fee scheme "${formData.name}" updated successfully`,
      });
    } else {
      const newScheme: FeeScheme = {
        id: `SCH${String(schemes.length + 1).padStart(3, '0')}`,
        ...formData,
      };
      setSchemes([...schemes, newScheme]);
      toast({
        title: "Success",
        description: `Fee scheme "${formData.name}" created successfully`,
      });
    }

    setDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Masters", href: "/masters" },
        { label: "Fee" },
        { label: "Fee Schemes" }
      ]} />
      
      <PageHeader
        title="Fee Schemes"
        description="Manage all fee schemes and their configurations"
        action={{
          label: "Add New Scheme",
          onClick: handleAddScheme,
          icon: Award,
          testId: "button-add-scheme"
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schemes.map((scheme) => (
          <Card 
            key={scheme.id} 
            data-testid={`card-scheme-${scheme.code}`} 
            className={`hover-elevate transition-opacity ${!scheme.isActive ? 'opacity-60' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-lg" data-testid={`text-scheme-name-${scheme.code}`}>
                    {scheme.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {scheme.description}
                  </CardDescription>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getSchemeTypeColor(scheme.code)}`}
                  data-testid={`badge-scheme-type-${scheme.code}`}
                >
                  {getSchemeTypeLabel(scheme.code)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">School Fee:</span>
                  <span 
                    className={`font-medium ml-auto ${scheme.schoolFeeWaived ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}
                    data-testid={`text-school-fee-${scheme.code}`}
                  >
                    {scheme.schoolFeeWaived ? 'Waived' : 'Payable'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Home className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Hostel Fee:</span>
                  <span 
                    className={`font-medium ml-auto ${scheme.hostelFeeWaived ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}
                    data-testid={`text-hostel-fee-${scheme.code}`}
                  >
                    {scheme.hostelFeeWaived ? 'Waived' : 'Payable'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Bus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Bus Fee:</span>
                  <span 
                    className={`font-medium ml-auto ${scheme.busFeeWaived ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}
                    data-testid={`text-bus-fee-${scheme.code}`}
                  >
                    {scheme.busFeeWaived ? 'Waived' : 'Payable'}
                  </span>
                </div>
              </div>

              {scheme.specialRules && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{scheme.specialRules}</span>
                  </div>
                </div>
              )}

              {scheme.hostelType && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <Home className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Type:</span>
                    <Badge 
                      variant="secondary" 
                      className="text-xs ml-auto"
                      data-testid={`badge-hostel-type-${scheme.code}`}
                    >
                      {scheme.hostelType === 'AC' ? 'AC (+₹500/month)' : 'Non-AC'}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleViewDetails(scheme)}
                  data-testid={`button-view-scheme-${scheme.code}`}
                >
                  View Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEditScheme(scheme)}
                  data-testid={`button-edit-scheme-${scheme.code}`}
                >
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePauseResumeClick(scheme)}
                  data-testid={`button-toggle-scheme-${scheme.code}`}
                  title={scheme.isActive ? 'Pause Scheme' : 'Resume Scheme'}
                >
                  {scheme.isActive ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-end pt-1">
                <Badge 
                  variant={scheme.isActive ? "default" : "secondary"}
                  className="text-xs"
                  data-testid={`badge-status-${scheme.code}`}
                >
                  {scheme.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pause/Resume Confirmation Dialog */}
      <AlertDialog open={pauseConfirmOpen} onOpenChange={setPauseConfirmOpen}>
        <AlertDialogContent data-testid="dialog-pause-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-pause-confirm-title">
              {schemeToToggle?.isActive ? 'Pause Scheme?' : 'Resume Scheme?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {schemeToToggle?.isActive ? (
                  <>
                    <p>You are about to pause <strong>{schemeToToggle?.name}</strong>.</p>
                    <p className="text-sm text-muted-foreground">
                      New admissions cannot use this scheme while it is paused. Existing students will not be affected.
                    </p>
                  </>
                ) : (
                  <>
                    <p>You are about to resume <strong>{schemeToToggle?.name}</strong>.</p>
                    <p className="text-sm text-muted-foreground">
                      This scheme will be available for new admissions again.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-toggle">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmToggle}
              data-testid="button-confirm-toggle"
            >
              {schemeToToggle?.isActive ? 'Pause' : 'Resume'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Scheme Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-scheme-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingScheme ? 'Edit Fee Scheme' : 'Add New Fee Scheme'}
            </DialogTitle>
            <DialogDescription>
              {editingScheme ? 'Update the fee scheme details below' : 'Create a new fee scheme with the details below'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Scheme Name */}
            <div className="space-y-2">
              <Label htmlFor="schemeName" className="text-foreground">
                Scheme Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="schemeName"
                data-testid="input-scheme-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Day Scholar, RTE"
              />
            </div>

            {/* Scheme Code */}
            <div className="space-y-2">
              <Label htmlFor="schemeCode" className="text-foreground">
                Scheme Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="schemeCode"
                data-testid="input-scheme-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., DAY_SCHOLAR"
                disabled={!!editingScheme}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="schemeDesc" className="text-foreground">
                Description
              </Label>
              <Textarea
                id="schemeDesc"
                data-testid="input-scheme-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the scheme"
                rows={3}
              />
            </div>

            {/* Fee Waivers */}
            <div className="space-y-3 pt-2">
              <Label className="text-foreground">Fee Waivers</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="schoolFee"
                    data-testid="checkbox-school-fee-waived"
                    checked={formData.schoolFeeWaived}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, schoolFeeWaived: !!checked })
                    }
                  />
                  <Label htmlFor="schoolFee" className="font-normal cursor-pointer">
                    School Fee Waived
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hostelFee"
                    data-testid="checkbox-hostel-fee-waived"
                    checked={formData.hostelFeeWaived}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hostelFeeWaived: !!checked })
                    }
                  />
                  <Label htmlFor="hostelFee" className="font-normal cursor-pointer">
                    Hostel Fee Waived
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="busFee"
                    data-testid="checkbox-bus-fee-waived"
                    checked={formData.busFeeWaived}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, busFeeWaived: !!checked })
                    }
                  />
                  <Label htmlFor="busFee" className="font-normal cursor-pointer">
                    Bus Fee Waived
                  </Label>
                </div>
              </div>
            </div>

            {/* Hostel Type */}
            <div className="space-y-2">
              <Label htmlFor="hostelType" className="text-foreground">
                Hostel Type
              </Label>
              <Select value={formData.hostelType || "NONE"} onValueChange={(value) =>
                setFormData({ ...formData, hostelType: value === "NONE" ? "" : value })
              }>
                <SelectTrigger id="hostelType" data-testid="select-hostel-type">
                  <SelectValue placeholder="Select hostel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="NON_AC">Non-AC</SelectItem>
                  <SelectItem value="AC">AC (+₹500/month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AC Surcharge */}
            {formData.hostelType === 'AC' && (
              <div className="space-y-2">
                <Label htmlFor="acSurcharge" className="text-foreground">
                  AC Surcharge (₹/month)
                </Label>
                <Input
                  id="acSurcharge"
                  data-testid="input-ac-surcharge"
                  type="number"
                  value={formData.acSurcharge}
                  onChange={(e) => setFormData({ ...formData, acSurcharge: parseInt(e.target.value) || 0 })}
                  placeholder="500"
                />
              </div>
            )}

            {/* Special Rules */}
            <div className="space-y-2">
              <Label htmlFor="specialRules" className="text-foreground">
                Special Rules
              </Label>
              <Textarea
                id="specialRules"
                data-testid="input-special-rules"
                value={formData.specialRules}
                onChange={(e) => setFormData({ ...formData, specialRules: e.target.value })}
                placeholder="Any special rules or conditions for this scheme"
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="isActive"
                data-testid="checkbox-is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: !!checked })
                }
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                Scheme is Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveScheme}
              data-testid="button-save-scheme"
            >
              {editingScheme ? 'Update Scheme' : 'Create Scheme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
