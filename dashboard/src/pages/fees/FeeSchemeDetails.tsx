import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Search,
  GraduationCap,
  Home,
  Bus,
  AlertCircle,
  Filter
} from "lucide-react";
import feeSchemesData from "@/mockData/feeSchemeTypes.json";
import studentFeesData from "@/mockData/studentFees.json";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

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

interface StudentFee {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  admissionNo: string;
  schemeCode: string;
  netFee: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
}

export default function FeeSchemeDetails() {
  const params = useParams();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const schemeCode = params?.schemeCode || '';
  const scheme = (feeSchemesData as FeeScheme[]).find((s) => s.code === schemeCode);

  // Calculate global statistics (always from all students) and filter students for table
  const { globalStats, filteredStudents, availableClasses } = useMemo(() => {
    const allStudents = studentFeesData.filter((s: StudentFee) => s.schemeCode === schemeCode);
    
    // Get available classes
    const classes = Array.from(new Set(allStudents.map((s: StudentFee) => s.class))).sort();
    
    // Calculate GLOBAL statistics from ALL students in this scheme (unaffected by filters)
    const globalTotalStudents = allStudents.length;
    const globalTotalRevenue = allStudents.reduce((sum, s) => sum + s.netFee, 0);
    const globalCollectedAmount = allStudents.reduce((sum, s) => sum + s.paidAmount, 0);
    const globalPendingAmount = allStudents.reduce((sum, s) => sum + s.dueAmount, 0);
    
    const globalPaidStudents = allStudents.filter(s => s.status === 'Paid').length;
    const globalPendingStudents = allStudents.filter(s => s.status === 'Pending').length;
    const globalOverdueStudents = allStudents.filter(s => s.status === 'Overdue').length;
    
    const globalClassCounts: Record<string, number> = {};
    allStudents.forEach(s => {
      globalClassCounts[s.class] = (globalClassCounts[s.class] || 0) + 1;
    });
    
    // Apply filters for TABLE VIEW only
    let filtered = allStudents;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s: StudentFee) =>
        s.studentName.toLowerCase().includes(query) ||
        s.admissionNo.toLowerCase().includes(query)
      );
    }
    
    // Class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter((s: StudentFee) => s.class === selectedClass);
    }
    
    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((s: StudentFee) => s.status === selectedStatus);
    }
    
    return {
      globalStats: {
        totalStudents: globalTotalStudents,
        totalRevenue: globalTotalRevenue,
        collectedAmount: globalCollectedAmount,
        pendingAmount: globalPendingAmount,
        paidStudents: globalPaidStudents,
        pendingStudents: globalPendingStudents,
        overdueStudents: globalOverdueStudents,
        classCounts: globalClassCounts,
      },
      filteredStudents: filtered,
      availableClasses: classes,
    };
  }, [schemeCode, searchQuery, selectedClass, selectedStatus]);

  if (!scheme) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Fee Scheme Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The requested fee scheme could not be found.
          </p>
          <Button onClick={() => navigate('/fees/schemes')} data-testid="button-back-to-schemes">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fee Schemes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header with Breadcrumb */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/fees/schemes')}
          data-testid="button-back-to-schemes"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Fee Schemes
        </Button>
        
        <Breadcrumb items={[
          { label: "Fees", href: "/fees" },
          { label: "Schemes", href: "/fees/schemes" },
          { label: scheme.name }
        ]} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title={scheme.name}
            description={scheme.description}
            customActions={
              <Badge
                variant={scheme.isActive ? "default" : "secondary"}
                className="w-fit"
                data-testid="badge-scheme-status"
              >
                {scheme.isActive ? 'Active' : 'Inactive'}
              </Badge>
            }
          />
        </div>
      </div>

      {/* Scheme Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheme Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">School Fee</div>
                <div className={`text-sm font-medium ${scheme.schoolFeeWaived ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                  {scheme.schoolFeeWaived ? 'Waived' : 'Payable'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Hostel Fee</div>
                <div className={`text-sm font-medium ${scheme.hostelFeeWaived ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                  {scheme.hostelFeeWaived ? 'Waived' : 'Payable'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bus className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Bus Fee</div>
                <div className={`text-sm font-medium ${scheme.busFeeWaived ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                  {scheme.busFeeWaived ? 'Waived' : 'Payable'}
                </div>
              </div>
            </div>
          </div>
          {scheme.specialRules && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-xs font-medium text-muted-foreground mb-1">Special Rules</div>
              <div className="text-sm">{scheme.specialRules}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-students">
              {globalStats.totalStudents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ₹{globalStats.totalRevenue.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-collected-amount">
              ₹{globalStats.collectedAmount.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-pending-amount">
              ₹{globalStats.pendingAmount.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Distribution */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Payment Status Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-muted-foreground">Paid</span>
                </div>
                <span className="text-lg font-semibold" data-testid="text-paid-students">
                  {globalStats.paidStudents}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <span className="text-lg font-semibold" data-testid="text-pending-students">
                  {globalStats.pendingStudents}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-muted-foreground">Overdue</span>
                </div>
                <span className="text-lg font-semibold" data-testid="text-overdue-students">
                  {globalStats.overdueStudents}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Class-wise Distribution */}
      {Object.keys(globalStats.classCounts).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Class-wise Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(globalStats.classCounts).sort(([a], [b]) => a.localeCompare(b)).map(([className, count]) => (
              <Card key={className}>
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{count}</div>
                    <div className="text-xs text-muted-foreground">{className}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Student Table */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Students on this Scheme
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name or admission no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-students"
              />
            </div>
            
            {/* Class Filter */}
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-class">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {availableClasses.map((className: string) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Student Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr className="text-left text-xs">
                    <th className="p-3 font-medium">Student Name</th>
                    <th className="p-3 font-medium">Admission No</th>
                    <th className="p-3 font-medium">Class</th>
                    <th className="p-3 font-medium">Section</th>
                    <th className="p-3 font-medium text-right">Net Fee</th>
                    <th className="p-3 font-medium text-right">Paid</th>
                    <th className="p-3 font-medium text-right">Due</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student: StudentFee) => (
                      <tr 
                        key={student.id} 
                        className="border-t hover-elevate"
                        data-testid={`row-student-${student.studentId}`}
                      >
                        <td className="p-3 font-medium">{student.studentName}</td>
                        <td className="p-3 text-muted-foreground">{student.admissionNo}</td>
                        <td className="p-3 text-muted-foreground">{student.class}</td>
                        <td className="p-3 text-muted-foreground">{student.section}</td>
                        <td className="p-3 text-right">₹{student.netFee.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-green-600 dark:text-green-400">
                          ₹{student.paidAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right text-orange-600 dark:text-orange-400">
                          ₹{student.dueAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              student.status === 'Paid'
                                ? 'default'
                                : student.status === 'Overdue'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                            data-testid={`badge-status-${student.studentId}`}
                          >
                            {student.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <div className="text-sm">
                          {searchQuery || selectedClass !== 'all' || selectedStatus !== 'all'
                            ? 'No students found matching your filters'
                            : 'No students assigned to this scheme yet'}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredStudents.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground text-right">
            Showing {filteredStudents.length} of {studentFeesData.filter((s: StudentFee) => s.schemeCode === schemeCode).length} students
          </div>
        )}
      </div>
    </div>
  );
}
