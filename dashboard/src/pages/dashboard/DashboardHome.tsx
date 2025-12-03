import { useApp } from "@/context/AppContext";
import { ROLES } from "@/types/roles";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { AdmissionOfficerDashboard } from "@/components/dashboard/AdmissionOfficerDashboard";
import { AccountantDashboard } from "@/components/dashboard/AccountantDashboard";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { ExamCoordinatorDashboard } from "@/components/dashboard/ExamCoordinatorDashboard";
import { HostelWardenDashboard } from "@/components/dashboard/HostelWardenDashboard";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";

export default function DashboardHome() {
  const { user } = useApp();

  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case ROLES.ADMIN:
        return <AdminDashboard />;
      case ROLES.ADMISSION_OFFICER:
        return <AdmissionOfficerDashboard />;
      case ROLES.ACCOUNTANT:
        return <AccountantDashboard />;
      case ROLES.TEACHER:
        return <TeacherDashboard />;
      case ROLES.EXAM_COORDINATOR:
        return <ExamCoordinatorDashboard />;
      case ROLES.HOSTEL_WARDEN:
        return <HostelWardenDashboard />;
      case ROLES.PARENT:
        return <ParentDashboard />;
      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                Your role does not have a specialized dashboard view.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* {renderDashboard()} */}
      <AdminDashboard />
    </>
  );
}
