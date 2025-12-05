import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTableColumn } from "@/components/common/DataTable";
import { TableCard } from "@/components/common/TableCard";
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
  BookOpen,
  GraduationCap,
  Users,
  Layers
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

interface ClassItem {
  id: string;
  name: string;
  classOrder: number;
  stream: string | null;
  maxIntake: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: string | null;
}

const initialFormData = {
  name: "",
  classOrder: "",
  stream: "",
  maxIntake: "",
  isActive: true,
};

const mockClasses: ClassItem[] = [
  { id: "1", name: "Nursery", classOrder: 1, stream: null, maxIntake: 60, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "2", name: "LKG", classOrder: 2, stream: null, maxIntake: 90, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "3", name: "UKG", classOrder: 3, stream: null, maxIntake: 90, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "4", name: "1", classOrder: 4, stream: null, maxIntake: 120, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "5", name: "2", classOrder: 5, stream: null, maxIntake: 120, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "6", name: "3", classOrder: 6, stream: null, maxIntake: 120, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "7", name: "4", classOrder: 7, stream: null, maxIntake: 120, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "8", name: "5", classOrder: 8, stream: null, maxIntake: 120, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "9", name: "6", classOrder: 9, stream: null, maxIntake: 150, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "10", name: "7", classOrder: 10, stream: null, maxIntake: 150, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "11", name: "8", classOrder: 11, stream: null, maxIntake: 150, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "12", name: "9", classOrder: 12, stream: null, maxIntake: 180, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "13", name: "10", classOrder: 13, stream: null, maxIntake: 180, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "14", name: "11", classOrder: 14, stream: "Science", maxIntake: 60, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "15", name: "11", classOrder: 15, stream: "Commerce", maxIntake: 60, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "16", name: "11", classOrder: 16, stream: "Arts", maxIntake: 40, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "17", name: "12", classOrder: 17, stream: "Science", maxIntake: 60, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "18", name: "12", classOrder: 18, stream: "Commerce", maxIntake: 60, isActive: true, createdAt: new Date(), updatedAt: null },
  { id: "19", name: "12", classOrder: 19, stream: "Arts", maxIntake: 40, isActive: true, createdAt: new Date(), updatedAt: null },
];

export default function ClassMaster() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>(mockClasses);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalClasses = classes.length;
  const activeClasses = classes.filter(c => c.isActive).length;
  const totalCapacity = classes.reduce((sum, c) => sum + c.maxIntake, 0);
  const seniorSecondaryClasses = classes.filter(c => c.stream).length;

  // Paginate classes
  const paginatedClasses = classes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAdd = () => {
    setEditingClass(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEdit = (classItem: ClassItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      classOrder: classItem.classOrder.toString(),
      stream: classItem.stream || "",
      maxIntake: classItem.maxIntake.toString(),
      isActive: classItem.isActive,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (classItem: ClassItem) => {
    setClassToDelete(classItem);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!classToDelete) return;
    
    setClasses(classes.filter(c => c.id !== classToDelete.id));
    toast({
      title: "Class Deleted",
      description: `${classToDelete.name}${classToDelete.stream ? ` (${classToDelete.stream})` : ""} has been removed.`,
    });
    setDeleteDialogOpen(false);
    setClassToDelete(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a class name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.classOrder || parseInt(formData.classOrder) < 1) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid class order (1 or higher).",
        variant: "destructive",
      });
      return;
    }

    if (!formData.maxIntake || parseInt(formData.maxIntake) < 1) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid maximum intake (1 or higher).",
        variant: "destructive",
      });
      return;
    }

    const requiresStream = formData.name === "11" || formData.name === "12";
    if (requiresStream && !formData.stream) {
      toast({
        title: "Validation Error",
        description: "Stream is required for Class 11 and 12.",
        variant: "destructive",
      });
      return;
    }

    const duplicateClass = classes.find(
      c => c.name === formData.name && 
           c.stream === (formData.stream || null) && 
           c.id !== editingClass?.id
    );
    if (duplicateClass) {
      toast({
        title: "Duplicate Entry",
        description: `Class ${formData.name}${formData.stream ? ` (${formData.stream})` : ""} already exists.`,
        variant: "destructive",
      });
      return;
    }

    if (editingClass) {
      const updatedClasses = classes.map(c =>
        c.id === editingClass.id
          ? {
              ...c,
              name: formData.name,
              classOrder: parseInt(formData.classOrder),
              stream: formData.stream || null,
              maxIntake: parseInt(formData.maxIntake),
              isActive: formData.isActive,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      setClasses(updatedClasses);
      toast({
        title: "Class Updated",
        description: `${formData.name}${formData.stream ? ` (${formData.stream})` : ""} has been updated.`,
      });
    } else {
      const newClass: ClassItem = {
        id: Date.now().toString(),
        name: formData.name,
        classOrder: parseInt(formData.classOrder),
        stream: formData.stream || null,
        maxIntake: parseInt(formData.maxIntake),
        isActive: formData.isActive,
        createdAt: new Date(),
        updatedAt: null,
      };
      setClasses([...classes, newClass].sort((a, b) => a.classOrder - b.classOrder));
      toast({
        title: "Class Created",
        description: `${formData.name}${formData.stream ? ` (${formData.stream})` : ""} has been added.`,
      });
    }

    setDialogOpen(false);
    setEditingClass(null);
    setFormData(initialFormData);
  };

  const getClassDisplayName = (classItem: ClassItem) => {
    if (classItem.stream) {
      return `Class ${classItem.name} - ${classItem.stream}`;
    }
    if (["Nursery", "LKG", "UKG"].includes(classItem.name)) {
      return classItem.name;
    }
    return `Class ${classItem.name}`;
  };

  const columns: DataTableColumn<ClassItem>[] = [
    {
      key: "classOrder",
      label: "Order",
      render: (value, row) => (
        <Badge variant="outline" data-testid={`badge-order-${row.id}`}>{value}</Badge>
      ),
    },
    {
      key: "name",
      label: "Class Name",
      render: (_, row) => (
        <div className="font-medium" data-testid={`text-classname-${row.id}`}>
          {getClassDisplayName(row)}
        </div>
      ),
    },
    {
      key: "stream",
      label: "Stream",
      render: (value, row) => (
        value ? (
          <Badge variant="secondary" data-testid={`badge-stream-${row.id}`}>{value}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm" data-testid={`text-stream-${row.id}`}>-</span>
        )
      ),
    },
    {
      key: "maxIntake",
      label: "Max Intake",
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span data-testid={`text-intake-${row.id}`}>{value}</span>
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (value, row) => (
        <Badge variant={value ? "default" : "secondary"} data-testid={`badge-status-${row.id}`}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Masters", href: "/masters" },
        { label: "Academic" },
        { label: "Class Master" }
      ]} />
      
      <PageHeader
        title="Class Master"
        description="Manage class levels, streams, and intake capacity"
        icon={BookOpen}
        action={{
          label: "Add Class",
          onClick: handleAdd,
          icon: Plus,
          testId: "button-add-class"
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-total-classes">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-classes">{totalClasses}</p>
                  <p className="text-xs text-muted-foreground">Total Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-classes">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Layers className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-active-classes">{activeClasses}</p>
                  <p className="text-xs text-muted-foreground">Active Classes</p>
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

          <Card data-testid="card-senior-streams">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-senior-streams">{seniorSecondaryClasses}</p>
                  <p className="text-xs text-muted-foreground">Sr. Secondary Streams</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              All Classes
            </CardTitle>
            <CardDescription>
              Configure class names, ordering, streams, and maximum intake capacity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TableCard
              table={{
                data: paginatedClasses,
                columns: columns,
                getRowKey: (row) => row.id,
                actionsColumn: {
                  label: "Actions",
                  headerClassName: "text-right",
                  cellClassName: "text-right",
                  render: (classItem) => (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(classItem)}
                        data-testid={`button-edit-${classItem.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(classItem)}
                        data-testid={`button-delete-${classItem.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ),
                },
                hoverable: true,
                emptyMessage: "No classes configured",
                pagination: {
                  currentPage: currentPage,
                  pageSize: pageSize,
                  totalItems: classes.length,
                  onPageChange: (page) => setCurrentPage(page),
                  onPageSizeChange: (size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  },
                  pageSizeOptions: [5, 10, 20, 50],
                },
              }}
            />
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? "Edit Class" : "Add New Class"}
              </DialogTitle>
              <DialogDescription>
                {editingClass
                  ? "Update the class details."
                  : "Create a new class with its configuration."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Class Name *</Label>
                  <Select
                    value={formData.name}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      name: value,
                      stream: ["11", "12"].includes(value) ? formData.stream : ""
                    })}
                  >
                    <SelectTrigger id="name" data-testid="select-class-name">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nursery">Nursery</SelectItem>
                      <SelectItem value="LKG">LKG</SelectItem>
                      <SelectItem value="UKG">UKG</SelectItem>
                      <SelectItem value="1">Class 1</SelectItem>
                      <SelectItem value="2">Class 2</SelectItem>
                      <SelectItem value="3">Class 3</SelectItem>
                      <SelectItem value="4">Class 4</SelectItem>
                      <SelectItem value="5">Class 5</SelectItem>
                      <SelectItem value="6">Class 6</SelectItem>
                      <SelectItem value="7">Class 7</SelectItem>
                      <SelectItem value="8">Class 8</SelectItem>
                      <SelectItem value="9">Class 9</SelectItem>
                      <SelectItem value="10">Class 10</SelectItem>
                      <SelectItem value="11">Class 11</SelectItem>
                      <SelectItem value="12">Class 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classOrder">Class Order *</Label>
                  <Input
                    id="classOrder"
                    type="number"
                    min="1"
                    placeholder="e.g., 1"
                    value={formData.classOrder}
                    onChange={(e) => setFormData({ ...formData, classOrder: e.target.value })}
                    data-testid="input-class-order"
                  />
                </div>
              </div>

              {(formData.name === "11" || formData.name === "12") && (
                <div className="space-y-2">
                  <Label htmlFor="stream">Stream *</Label>
                  <Select
                    value={formData.stream}
                    onValueChange={(value) => setFormData({ ...formData, stream: value })}
                  >
                    <SelectTrigger id="stream" data-testid="select-stream">
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Stream is required for Class 11 and 12
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="maxIntake">Maximum Intake *</Label>
                <Input
                  id="maxIntake"
                  type="number"
                  min="1"
                  placeholder="e.g., 120"
                  value={formData.maxIntake}
                  onChange={(e) => setFormData({ ...formData, maxIntake: e.target.value })}
                  data-testid="input-max-intake"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of students allowed in this class
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive classes won't appear in admission forms
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
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-class">
                Cancel
              </Button>
              <Button onClick={handleSave} data-testid="button-save-class">
                {editingClass ? "Update" : "Create"} Class
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Class?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{classToDelete && getClassDisplayName(classToDelete)}"?
                <span className="block mt-2 text-destructive font-medium">
                  This action cannot be undone. Any sections linked to this class will also need to be updated.
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
