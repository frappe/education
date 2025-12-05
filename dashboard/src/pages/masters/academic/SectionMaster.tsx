import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Layers,
  Users,
  UserCheck,
  BookOpen
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

interface ClassItem {
  id: string;
  name: string;
  stream: string | null;
}

interface SectionItem {
  id: string;
  classId: string;
  className: string;
  classStream: string | null;
  name: string;
  capacity: number;
  classTeacherId: string | null;
  classTeacherName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: string | null;
}

interface TeacherItem {
  id: string;
  name: string;
  designation: string;
}

const initialFormData = {
  classId: "",
  name: "",
  capacity: "40",
  classTeacherId: "",
  isActive: true,
};

const mockClasses: ClassItem[] = [
  { id: "1", name: "Nursery", stream: null },
  { id: "2", name: "LKG", stream: null },
  { id: "3", name: "UKG", stream: null },
  { id: "4", name: "1", stream: null },
  { id: "5", name: "2", stream: null },
  { id: "6", name: "3", stream: null },
  { id: "7", name: "4", stream: null },
  { id: "8", name: "5", stream: null },
  { id: "9", name: "6", stream: null },
  { id: "10", name: "7", stream: null },
  { id: "11", name: "8", stream: null },
  { id: "12", name: "9", stream: null },
  { id: "13", name: "10", stream: null },
  { id: "14", name: "11", stream: "Science" },
  { id: "15", name: "11", stream: "Commerce" },
  { id: "16", name: "11", stream: "Arts" },
  { id: "17", name: "12", stream: "Science" },
  { id: "18", name: "12", stream: "Commerce" },
  { id: "19", name: "12", stream: "Arts" },
];

const mockTeachers: TeacherItem[] = [
  { id: "t1", name: "Mrs. Sunita Sharma", designation: "Senior Teacher" },
  { id: "t2", name: "Mr. Rajesh Kumar", designation: "PGT Mathematics" },
  { id: "t3", name: "Mrs. Priya Singh", designation: "TGT Science" },
  { id: "t4", name: "Mr. Anil Verma", designation: "PGT Physics" },
  { id: "t5", name: "Mrs. Meera Patel", designation: "TGT English" },
  { id: "t6", name: "Mr. Suresh Gupta", designation: "PGT Chemistry" },
  { id: "t7", name: "Mrs. Kavita Joshi", designation: "Primary Teacher" },
  { id: "t8", name: "Mr. Vikram Singh", designation: "TGT Hindi" },
  { id: "t9", name: "Mrs. Anita Rao", designation: "PGT Biology" },
  { id: "t10", name: "Mr. Deepak Sharma", designation: "TGT Social Science" },
];

const mockSections: SectionItem[] = [
  { id: "s1", classId: "1", className: "Nursery", classStream: null, name: "A", capacity: 30, classTeacherId: "t7", classTeacherName: "Mrs. Kavita Joshi", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s2", classId: "1", className: "Nursery", classStream: null, name: "B", capacity: 30, classTeacherId: null, classTeacherName: null, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s3", classId: "2", className: "LKG", classStream: null, name: "A", capacity: 30, classTeacherId: "t7", classTeacherName: "Mrs. Kavita Joshi", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s4", classId: "2", className: "LKG", classStream: null, name: "B", capacity: 30, classTeacherId: null, classTeacherName: null, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s5", classId: "2", className: "LKG", classStream: null, name: "C", capacity: 30, classTeacherId: null, classTeacherName: null, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s6", classId: "4", className: "1", classStream: null, name: "A", capacity: 40, classTeacherId: "t5", classTeacherName: "Mrs. Meera Patel", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s7", classId: "4", className: "1", classStream: null, name: "B", capacity: 40, classTeacherId: "t8", classTeacherName: "Mr. Vikram Singh", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s8", classId: "4", className: "1", classStream: null, name: "C", capacity: 40, classTeacherId: null, classTeacherName: null, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s9", classId: "9", className: "6", classStream: null, name: "A", capacity: 50, classTeacherId: "t3", classTeacherName: "Mrs. Priya Singh", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s10", classId: "9", className: "6", classStream: null, name: "B", capacity: 50, classTeacherId: "t10", classTeacherName: "Mr. Deepak Sharma", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s11", classId: "9", className: "6", classStream: null, name: "C", capacity: 50, classTeacherId: null, classTeacherName: null, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s12", classId: "13", className: "10", classStream: null, name: "A", capacity: 45, classTeacherId: "t2", classTeacherName: "Mr. Rajesh Kumar", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s13", classId: "13", className: "10", classStream: null, name: "B", capacity: 45, classTeacherId: "t1", classTeacherName: "Mrs. Sunita Sharma", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s14", classId: "14", className: "11", classStream: "Science", name: "A", capacity: 30, classTeacherId: "t4", classTeacherName: "Mr. Anil Verma", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s15", classId: "14", className: "11", classStream: "Science", name: "B", capacity: 30, classTeacherId: "t9", classTeacherName: "Mrs. Anita Rao", isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "s16", classId: "15", className: "11", classStream: "Commerce", name: "A", capacity: 30, classTeacherId: "t6", classTeacherName: "Mr. Suresh Gupta", isActive: true, createdAt: new Date(), updatedAt: null },
];

export default function SectionMaster() {
  const { toast } = useToast();
  const [sections, setSections] = useState<SectionItem[]>(mockSections);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<SectionItem | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [filterClass, setFilterClass] = useState<string>("all");

  const totalSections = sections.length;
  const activeSections = sections.filter(s => s.isActive).length;
  const totalCapacity = sections.reduce((sum, s) => sum + s.capacity, 0);
  const assignedTeachers = sections.filter(s => s.classTeacherId).length;

  const filteredSections = filterClass === "all" 
    ? sections 
    : sections.filter(s => s.classId === filterClass);

  const handleAdd = () => {
    setEditingSection(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEdit = (section: SectionItem) => {
    setEditingSection(section);
    setFormData({
      classId: section.classId,
      name: section.name,
      capacity: section.capacity.toString(),
      classTeacherId: section.classTeacherId || "",
      isActive: section.isActive,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (section: SectionItem) => {
    setSectionToDelete(section);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!sectionToDelete) return;
    
    setSections(sections.filter(s => s.id !== sectionToDelete.id));
    toast({
      title: "Section Deleted",
      description: `Section ${sectionToDelete.name} of ${getClassDisplayName(sectionToDelete)} has been removed.`,
    });
    setDeleteDialogOpen(false);
    setSectionToDelete(null);
  };

  const getClassDisplayName = (section: SectionItem) => {
    if (section.classStream) {
      return `Class ${section.className} - ${section.classStream}`;
    }
    if (["Nursery", "LKG", "UKG"].includes(section.className)) {
      return section.className;
    }
    return `Class ${section.className}`;
  };

  const getClassDisplayNameFromClassItem = (classItem: ClassItem) => {
    if (classItem.stream) {
      return `Class ${classItem.name} - ${classItem.stream}`;
    }
    if (["Nursery", "LKG", "UKG"].includes(classItem.name)) {
      return classItem.name;
    }
    return `Class ${classItem.name}`;
  };

  const handleSave = () => {
    if (!formData.classId) {
      toast({
        title: "Validation Error",
        description: "Please select a class.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a section name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.capacity || parseInt(formData.capacity) < 1) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid capacity (1 or higher).",
        variant: "destructive",
      });
      return;
    }

    const duplicateSection = sections.find(
      s => s.classId === formData.classId && 
           s.name.toUpperCase() === formData.name.toUpperCase() && 
           s.id !== editingSection?.id
    );
    if (duplicateSection) {
      const selectedClass = mockClasses.find(c => c.id === formData.classId);
      toast({
        title: "Duplicate Entry",
        description: `Section ${formData.name} already exists for ${selectedClass ? getClassDisplayNameFromClassItem(selectedClass) : 'this class'}.`,
        variant: "destructive",
      });
      return;
    }

    const selectedClass = mockClasses.find(c => c.id === formData.classId);
    const selectedTeacher = mockTeachers.find(t => t.id === formData.classTeacherId);

    if (editingSection) {
      const updatedSections = sections.map(s =>
        s.id === editingSection.id
          ? {
              ...s,
              classId: formData.classId,
              className: selectedClass?.name || "",
              classStream: selectedClass?.stream || null,
              name: formData.name.toUpperCase(),
              capacity: parseInt(formData.capacity),
              classTeacherId: formData.classTeacherId || null,
              classTeacherName: selectedTeacher?.name || null,
              isActive: formData.isActive,
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      setSections(updatedSections);
      toast({
        title: "Section Updated",
        description: `Section ${formData.name} has been updated.`,
      });
    } else {
      const newSection: SectionItem = {
        id: Date.now().toString(),
        classId: formData.classId,
        className: selectedClass?.name || "",
        classStream: selectedClass?.stream || null,
        name: formData.name.toUpperCase(),
        capacity: parseInt(formData.capacity),
        classTeacherId: formData.classTeacherId || null,
        classTeacherName: selectedTeacher?.name || null,
        isActive: formData.isActive,
        createdAt: new Date(),
        updatedAt: null,
      };
      setSections([...sections, newSection]);
      toast({
        title: "Section Created",
        description: `Section ${formData.name} has been added to ${selectedClass ? getClassDisplayNameFromClassItem(selectedClass) : 'the class'}.`,
      });
    }

    setDialogOpen(false);
    setEditingSection(null);
    setFormData(initialFormData);
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Masters", href: "/masters" },
        { label: "Academic" },
        { label: "Section Master" }
      ]} />
      
      <PageHeader
        title="Section Master"
        description="Manage sections, capacity, and class teacher assignments"
        icon={Layers}
        action={{
          label: "Add Section",
          onClick: handleAdd,
          icon: Plus,
          testId: "button-add-section"
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-total-sections">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-sections">{totalSections}</p>
                  <p className="text-xs text-muted-foreground">Total Sections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-sections">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-active-sections">{activeSections}</p>
                  <p className="text-xs text-muted-foreground">Active Sections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-capacity">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-capacity">{totalCapacity.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Capacity</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-teachers-assigned">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-teachers-assigned">{assignedTeachers}</p>
                  <p className="text-xs text-muted-foreground">Teachers Assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  All Sections
                </CardTitle>
                <CardDescription>
                  Configure sections with capacity limits and class teacher assignments
                </CardDescription>
              </div>
              <div className="w-64">
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger data-testid="select-filter-class">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {mockClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {getClassDisplayNameFromClassItem(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSections.map((section) => (
                    <TableRow key={section.id} data-testid={`row-section-${section.id}`}>
                      <TableCell>
                        <div className="font-medium">{getClassDisplayName(section)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-base font-semibold" data-testid={`badge-section-${section.id}`}>
                          {section.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span data-testid={`text-capacity-${section.id}`}>{section.capacity} students</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {section.classTeacherName ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-green-600" />
                            <span data-testid={`text-teacher-${section.id}`}>{section.classTeacherName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm flex items-center gap-1" data-testid={`text-teacher-${section.id}`}>
                            <Users className="w-4 h-4" />
                            Not Assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={section.isActive ? "default" : "secondary"} data-testid={`badge-status-${section.id}`}>
                          {section.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(section)}
                            data-testid={`button-edit-${section.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(section)}
                            data-testid={`button-delete-${section.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No sections found. {filterClass !== "all" ? "Try selecting a different class filter." : "Click 'Add Section' to create one."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSection ? "Edit Section" : "Add New Section"}
              </DialogTitle>
              <DialogDescription>
                {editingSection
                  ? "Update the section details."
                  : "Create a new section for a class."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="classId">Class *</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) => setFormData({ ...formData, classId: value })}
                >
                  <SelectTrigger id="classId" data-testid="select-class">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {getClassDisplayNameFromClassItem(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Section Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    maxLength={2}
                    data-testid="input-section-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    placeholder="e.g., 40"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    data-testid="input-capacity"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classTeacherId">Class Teacher</Label>
                <Select
                  value={formData.classTeacherId}
                  onValueChange={(value) => setFormData({ ...formData, classTeacherId: value })}
                >
                  <SelectTrigger id="classTeacherId" data-testid="select-class-teacher">
                    <SelectValue placeholder="Select class teacher (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {mockTeachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} - {t.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign a class teacher responsible for this section
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive sections won't accept new admissions
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                  data-testid="switch-is-active"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-section">
                Cancel
              </Button>
              <Button onClick={handleSave} data-testid="button-save-section">
                {editingSection ? "Update" : "Create"} Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete Section "{sectionToDelete?.name}" of {sectionToDelete && getClassDisplayName(sectionToDelete)}?
                <span className="block mt-2 text-destructive font-medium">
                  This action cannot be undone. Students in this section will need to be reassigned.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
