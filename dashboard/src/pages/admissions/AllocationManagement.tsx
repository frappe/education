import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Home, Users, ChevronDown, ChevronUp, GraduationCap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Admission } from "@shared/schema";
import { useApp } from "@/context/AppContext";
import { useAdmissionData } from "@/context/AdmissionDataContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function AllocationManagement() {
  const { hasPermission } = useApp();
  const { admissions, updateAdmission } = useAdmissionData();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [houseFilter, setHouseFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Admission | null>(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [tempSection, setTempSection] = useState<string>("");
  const [tempHouse, setTempHouse] = useState<string>("");
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const admittedStudents = admissions.filter((adm) => adm.finalStatus === "Admitted");

  // Group students by class
  const studentsByClass = admittedStudents.reduce((acc, student) => {
    const className = student.classAdmissionFor || "Unspecified";
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(student);
    return acc;
  }, {} as Record<string, Admission[]>);

  // Sort classes (numerical sort for better ordering)
  const sortedClasses = Object.keys(studentsByClass).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 999;
    const numB = parseInt(b.replace(/\D/g, '')) || 999;
    return numA - numB;
  });

  // Calculate distributions per class
  const getClassDistributions = (students: Admission[]) => {
    const sections = {
      A: students.filter((s) => s.section === "A").length,
      B: students.filter((s) => s.section === "B").length,
      C: students.filter((s) => s.section === "C").length,
      D: students.filter((s) => s.section === "D").length,
      NotAssigned: students.filter((s) => s.section === "Not Assigned").length,
    };

    const houses = {
      Aastha: students.filter((s) => s.house === "Aastha").length,
      Abhilasha: students.filter((s) => s.house === "Abhilasha").length,
      Asmita: students.filter((s) => s.house === "Asmita").length,
      Aradhana: students.filter((s) => s.house === "Aradhana").length,
      NotAssigned: students.filter((s) => s.house === "Not Assigned").length,
    };

    return { sections, houses };
  };

  const toggleClass = (className: string) => {
    setExpandedClasses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(className)) {
        newSet.delete(className);
      } else {
        newSet.add(className);
      }
      return newSet;
    });
  };

  const filteredStudents = admittedStudents.filter((student) => {
    const matchesSearch =
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.applicationNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSection =
      sectionFilter === "all" ||
      student.section === sectionFilter ||
      (sectionFilter === "not-assigned" && student.section === "Not Assigned");

    const matchesHouse =
      houseFilter === "all" ||
      student.house === houseFilter ||
      (houseFilter === "not-assigned" && student.house === "Not Assigned");

    return matchesSearch && matchesSection && matchesHouse;
  });

  const canManage = hasPermission("canManageAdmissions");

  const handleAllocate = (student: Admission) => {
    setSelectedStudent(student);
    setTempSection(student.section);
    setTempHouse(student.house);
    setIsAllocationDialogOpen(true);
  };

  const handleSaveAllocation = () => {
    if (!selectedStudent) return;
    
    try {
      updateAdmission(selectedStudent.id, {
        section: tempSection as Admission['section'],
        house: tempHouse as Admission['house'],
      });
      toast({
        title: "Success",
        description: "Section and house allocation updated successfully",
      });
      setIsAllocationDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update allocation",
        variant: "destructive",
      });
    }
  };

  const pendingAllocation = admittedStudents.filter(
    student => student.section === "Not Assigned" || student.house === "Not Assigned"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Admissions", href: "/admissions/enquiries" },
        { label: "Allocations" }
      ]} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Section & House Allocation
          </h1>
          <p className="text-muted-foreground">
            Manage section and house assignments for admitted students
          </p>
        </div>
        <div className="flex gap-2">
          {pendingAllocation > 0 && (
            <Badge variant="default" className="text-base px-3 py-1">
              {pendingAllocation} Pending Allocation
            </Badge>
          )}
          {canManage && (
            <Link href="/admissions/approvals">
              <Button variant="outline" data-testid="button-approve-application">
                <CheckCircle className="h-4 w-4" />
                Approve Application
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Class-wise Distribution</h2>
        {sortedClasses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No admitted students found
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedClasses.map((className) => {
            const classStudents = studentsByClass[className];
            const { sections, houses } = getClassDistributions(classStudents);
            const isExpanded = expandedClasses.has(className);
            const totalStudents = classStudents.length;

            return (
              <Collapsible
                key={className}
                open={isExpanded}
                onOpenChange={() => toggleClass(className)}
              >
                <Card data-testid={`card-class-${className}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{className}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {totalStudents} {totalStudents === 1 ? 'student' : 'students'}
                          </p>
                        </div>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-toggle-${className}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Section Distribution</span>
                          </div>
                          <div className="space-y-2 pl-6">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Section A</span>
                              <Badge variant="secondary" data-testid={`badge-${className}-section-A`}>
                                {sections.A}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Section B</span>
                              <Badge variant="secondary" data-testid={`badge-${className}-section-B`}>
                                {sections.B}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Section C</span>
                              <Badge variant="secondary" data-testid={`badge-${className}-section-C`}>
                                {sections.C}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Section D</span>
                              <Badge variant="secondary" data-testid={`badge-${className}-section-D`}>
                                {sections.D}
                              </Badge>
                            </div>
                            {sections.NotAssigned > 0 && (
                              <div className="flex justify-between items-center text-orange-600">
                                <span className="text-sm">Not Assigned</span>
                                <Badge data-testid={`badge-${className}-section-NotAssigned`}>
                                  {sections.NotAssigned}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span>House Distribution</span>
                          </div>
                          <div className="space-y-2 pl-6">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Aastha</span>
                              <Badge variant="secondary" data-testid={`badge-${className}-house-Aastha`}>
                                {houses.Aastha}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Abhilasha</span>
                              <Badge variant="secondary" data-testid={`badge-${className}-house-Abhilasha`}>
                                {houses.Abhilasha}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Asmita</span>
                              <Badge variant="secondary" data-testid={`badge-${className}-house-Asmita`}>
                                {houses.Asmita}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Aradhana</span>
                              <Badge variant="secondary" data-testid={`badge-${className}-house-Aradhana`}>
                                {houses.Aradhana}
                              </Badge>
                            </div>
                            {houses.NotAssigned > 0 && (
                              <div className="flex justify-between items-center text-orange-600">
                                <span className="text-sm">Not Assigned</span>
                                <Badge data-testid={`badge-${className}-house-NotAssigned`}>
                                  {houses.NotAssigned}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Admitted Students</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-students"
                />
              </div>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-section-filter">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                  <SelectItem value="D">Section D</SelectItem>
                  <SelectItem value="not-assigned">Not Assigned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={houseFilter} onValueChange={setHouseFilter}>
                <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-house-filter">
                  <SelectValue placeholder="House" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Houses</SelectItem>
                  <SelectItem value="Aastha">Aastha</SelectItem>
                  <SelectItem value="Abhilasha">Abhilasha</SelectItem>
                  <SelectItem value="Asmita">Asmita</SelectItem>
                  <SelectItem value="Aradhana">Aradhana</SelectItem>
                  <SelectItem value="not-assigned">Not Assigned</SelectItem>
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
                  <TableHead>App. No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Father's Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>House</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 8 : 7} className="text-center text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                    <TableCell className="font-mono text-sm">
                      {student.applicationNo}
                    </TableCell>
                    <TableCell className="font-medium">{student.studentName}</TableCell>
                    <TableCell>{student.classAdmissionFor}</TableCell>
                    <TableCell>{student.fatherName}</TableCell>
                    <TableCell>{student.fatherMobile}</TableCell>
                    <TableCell>
                      {student.section !== "Not Assigned" ? (
                        <Badge variant="default">{student.section}</Badge>
                      ) : (
                        <Badge variant="secondary">Not Assigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.house !== "Not Assigned" ? (
                        <Badge variant="default">{student.house}</Badge>
                      ) : (
                        <Badge variant="secondary">Not Assigned</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAllocate(student)}
                          data-testid={`button-allocate-${student.id}`}
                        >
                          Allocate
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAllocationDialogOpen} onOpenChange={setIsAllocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Section & House Allocation</DialogTitle>
            <DialogDescription>
              Assign section and house for {selectedStudent?.studentName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select value={tempSection} onValueChange={setTempSection}>
                <SelectTrigger data-testid="select-allocation-section">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                  <SelectItem value="D">Section D</SelectItem>
                  <SelectItem value="Not Assigned">Not Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">House</label>
              <Select value={tempHouse} onValueChange={setTempHouse}>
                <SelectTrigger data-testid="select-allocation-house">
                  <SelectValue placeholder="Select house" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aastha">Aastha</SelectItem>
                  <SelectItem value="Abhilasha">Abhilasha</SelectItem>
                  <SelectItem value="Asmita">Asmita</SelectItem>
                  <SelectItem value="Aradhana">Aradhana</SelectItem>
                  <SelectItem value="Not Assigned">Not Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAllocationDialogOpen(false)}
              data-testid="button-cancel-allocation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAllocation}
              data-testid="button-save-allocation"
            >
              Save Allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
