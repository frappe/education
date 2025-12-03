import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, FileCheck, UserPlus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import studentsData from "@/mockData/students.json";

export function AdmissionOfficerDashboard() {
  const totalStudents = studentsData.length;
  const recentStudents = studentsData.slice(0, 5);
  
  const mockEnquiries = 24;
  const mockApplications = 18;
  const mockPendingApprovals = 6;

  const quickActions = [
    { label: "New Enquiry", icon: UserPlus, href: "/admissions/enquiries" },
    { label: "View Applications", icon: FileCheck, href: "/admissions/applications" },
    { label: "Registrations", icon: Users, href: "/admissions/registrations" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
          Admission Officer Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage student admissions and registrations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="New Enquiries"
          value={mockEnquiries}
          icon={UserPlus}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Applications"
          value={mockApplications}
          icon={FileCheck}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Pending Approvals"
          value={mockPendingApprovals}
          icon={TrendingUp}
          trend={{ value: 2, isPositive: false }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common admission tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                asChild
                data-testid={`button-${action.label.toLowerCase().replace(" ", "-")}`}
              >
                <Link href={action.href}>
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Admissions</CardTitle>
            <CardDescription>Latest student registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-md hover-elevate active-elevate-2"
                  data-testid={`student-item-${student.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.class} • Roll No: {student.rollNo}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admission Pipeline</CardTitle>
            <CardDescription>Current admission status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="font-medium">Enquiries</p>
                  <p className="text-xs text-muted-foreground">Active enquiries</p>
                </div>
                <span className="text-2xl font-bold">{mockEnquiries}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="font-medium">Applications</p>
                  <p className="text-xs text-muted-foreground">Under review</p>
                </div>
                <span className="text-2xl font-bold">{mockApplications}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border border-accent">
                <div>
                  <p className="font-medium">Pending Approval</p>
                  <p className="text-xs text-muted-foreground">Requires action</p>
                </div>
                <span className="text-2xl font-bold text-accent">{mockPendingApprovals}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
