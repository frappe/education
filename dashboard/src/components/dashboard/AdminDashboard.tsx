import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, GraduationCap, IndianRupee, TrendingUp, UserPlus, FileCheck, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import studentsData from "@/mockData/students.json";
import teachersData from "@/mockData/teachers.json";
import feesData from "@/mockData/fees.json";

export function AdminDashboard() {
  const totalStudents = studentsData.length;
  const totalTeachers = teachersData.length;
  
  const totalFees = feesData.reduce((sum, fee) => sum + fee.amount, 0);
  const collectedFees = feesData.reduce((sum, fee) => sum + fee.paid, 0);
  
  const avgAttendance = Math.round(
    studentsData.reduce((sum, student) => sum + student.attendance, 0) / studentsData.length
  );

  const recentStudents = studentsData.slice(0, 5);

  const quickActions = [
    { label: "New Admission", icon: UserPlus, href: "/admissions/enquiries" },
    { label: "Mark Attendance", icon: ClipboardCheck, href: "/attendance" },
    { label: "View Reports", icon: FileCheck, href: "/admissions/reports" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Complete overview of school operations and management
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
          title="Total Teachers"
          value={totalTeachers}
          icon={GraduationCap}
          trend={{ value: 3, isPositive: true }}
        />
        <StatsCard
          title="Fees Collected"
          value={`₹${(collectedFees / 1000).toFixed(0)}k`}
          icon={IndianRupee}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Avg Attendance"
          value={`${avgAttendance}%`}
          icon={TrendingUp}
          trend={{ value: 2, isPositive: true }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
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
                <Link to={action.href}>
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
            <CardTitle>Recent Students</CardTitle>
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
            <CardTitle>Fee Collection Status</CardTitle>
            <CardDescription>Monthly financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Fees</span>
                  <span className="font-semibold">₹{totalFees.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Collected</span>
                  <span className="font-semibold text-chart-3">
                    ₹{collectedFees.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-accent">
                    ₹{(totalFees - collectedFees).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-chart-3 h-2 rounded-full"
                  style={{
                    width: `${(collectedFees / totalFees) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {((collectedFees / totalFees) * 100).toFixed(1)}% collection rate
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
