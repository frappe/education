import { Routes, Route, Navigate } from 'react-router-dom';
// import { useAuth } from '../providers/AuthProvider';
// import type { Role } from '../types/auth';

// Import existing page components
import DashboardHome from '@/pages/dashboard/DashboardHome';
import StudentList from '@/pages/students/StudentList';
import StudentProfile from '@/pages/students/StudentProfile';
import TeacherList from '@/pages/teachers/TeacherList';
import TeacherProfile from '@/pages/teachers/TeacherProfile';
import AttendancePage from '@/pages/attendance/AttendancePage';
import ExamSchedule from '@/pages/exams/ExamSchedule';
import SettingsPage from '@/pages/settings/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Import admission routes (from existing files)
import EnquiryManagement from '@/pages/admissions/EnquiryManagement';
import NewEnquiry from '@/pages/admissions/NewEnquiry';
import AdmissionApplications from '@/pages/admissions/AdmissionApplications';
import NewApplication from '@/pages/admissions/NewApplication';
import RegistrationManagement from '@/pages/admissions/RegistrationManagement';
import ApprovalWorkflow from '@/pages/admissions/ApprovalWorkflow';
import AllocationManagement from '@/pages/admissions/AllocationManagement';
import AdmissionReports from '@/pages/admissions/AdmissionReports';

// Import fee routes (from existing files)
import FeeDashboard from '@/pages/fees/FeeDashboard';
import FeeCollection from '@/pages/fees/FeeCollection';
import ReceiptView from '@/pages/fees/ReceiptView';
import InstallmentManagement from '@/pages/fees/InstallmentManagement';
import BillApprovalWorkflow from '@/pages/fees/BillApprovalWorkflow';
import StudentFeeManagement from '@/pages/fees/StudentFeeManagement';
import FeeCalculatorTool from '@/pages/fees/FeeCalculatorTool';
import FeeSchemes from '@/pages/fees/FeeSchemes';
import FeeSchemeDetails from '@/pages/fees/FeeSchemeDetails';
import FeeStructure from '@/pages/fees/FeeStructure';
import DiscountManagement from '@/pages/fees/DiscountManagement';
import FeeReports from '@/pages/fees/FeeReports';

// Import masters routes
import MasterConfiguration from '@/pages/masters/MasterConfiguration';
import AcademicYearMaster from '@/pages/masters/academic/AcademicYearMaster';
import ClassMaster from '@/pages/masters/academic/ClassMaster';
import SectionMaster from '@/pages/masters/academic/SectionMaster';
import MasterFeeSchemes from '@/pages/masters/fee/FeeSchemes';
import MasterFeeStructure from '@/pages/masters/fee/FeeStructure';
import MasterDiscountManagement from '@/pages/masters/fee/DiscountManagement';

export function DashboardRouter() {
  // const { user } = useAuth();
  
  // const hasRole = (role: Role): boolean => {
  //   return user?.roles?.includes(role) || false;
  // };

  // Allow all routes when no user (for development) or check roles
  // const isAdmin = !user || hasRole('System Manager') || hasRole('Administrator');
  // const isAcademics = !user || hasRole('Academics User');

  return (
    <Routes>
      {/* Root redirect to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Dashboard home */}
      <Route path="dashboard" element={<DashboardHome />} />
      
      {/* Student Management */}
      <Route path="students" element={<StudentList />} />
      <Route path="students/:id" element={<StudentProfile />} />
      
      {/* Teacher Management */}
      <Route path="teachers" element={<TeacherList />} />
      <Route path="teachers/:id" element={<TeacherProfile />} />
      
      {/* Attendance */}
      <Route path="attendance" element={<AttendancePage />} />
      
      {/* Exams */}
      <Route path="exams" element={<ExamSchedule />} />
      
      {/* Admissions - Admin and Academics */}
      {/* {(isAdmin || isAcademics) && ( */}
        <>
          <Route path="admissions/enquiries" element={<EnquiryManagement />} />
          <Route path="admissions/enquiries/new" element={<NewEnquiry />} />
          <Route path="admissions/applications" element={<AdmissionApplications />} />
          <Route path="admissions/applications/new" element={<NewApplication />} />
          <Route path="admissions/registrations" element={<RegistrationManagement />} />
          <Route path="admissions/approvals" element={<ApprovalWorkflow />} />
          <Route path="admissions/allocations" element={<AllocationManagement />} />
          <Route path="admissions/reports" element={<AdmissionReports />} />
        </>
      {/* )} */}
      
      {/* Fees - Admin only */}
      {/* {isAdmin && ( */}
        <>
          <Route path="fees" element={<FeeDashboard />} />
          <Route path="fees/collection" element={<FeeCollection />} />
          <Route path="fees/receipts" element={<ReceiptView />} />
          <Route path="fees/receipts/:receiptNo" element={<ReceiptView />} />
          <Route path="fees/installments" element={<InstallmentManagement />} />
          <Route path="fees/bill-approval" element={<BillApprovalWorkflow />} />
          <Route path="fees/students" element={<StudentFeeManagement />} />
          <Route path="fees/calculator" element={<FeeCalculatorTool />} />
          <Route path="fees/schemes" element={<FeeSchemes />} />
          <Route path="fees/schemes/:schemeCode" element={<FeeSchemeDetails />} />
          <Route path="fees/structure" element={<FeeStructure />} />
          <Route path="fees/discounts" element={<DiscountManagement />} />
          <Route path="fees/reports" element={<FeeReports />} />
        </>
      {/* )}  */}
      
      {/* Masters - Admin only */}
      {/* {isAdmin && ( */}
        <>
          <Route path="masters" element={<MasterConfiguration />} />
          <Route path="masters/academic/academic-year" element={<AcademicYearMaster />} />
          <Route path="masters/academic/classes" element={<ClassMaster />} />
          <Route path="masters/academic/sections" element={<SectionMaster />} />
          <Route path="masters/fee/schemes" element={<MasterFeeSchemes />} />
          <Route path="masters/fee/structure" element={<MasterFeeStructure />} />
          <Route path="masters/fee/discounts" element={<MasterDiscountManagement />} />
        </>
      {/* )} */}
      
      {/* Settings - Admin only */}
      {/* {isAdmin && ( */}
        <Route path="settings" element={<SettingsPage />} />
      {/* )} */}
      
      {/* 404 - Catch all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
                                                                                                                              