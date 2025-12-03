import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, ClipboardCheck, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import studentsData from "@/mockData/students.json";

export function TeacherDashboard() {
  const myStudents = studentsData.slice(0, 10);
  const avgAttendance = Math.round(
    myStudents.reduce((sum, student) => sum + student.attendance, 0) / myStudents.length
  );

  const upcomingExams = 3;
  const assignmentsPending = 8;

  const quickActions = [
    { label: "Mark Attendance", icon: ClipboardCheck, href: "/attendance" },
    { label: "View Exams", icon: FileText, href: "/exams" },
    { label: "View Students", icon: Users, href: "/students" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
          Teacher Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your classes, attendance, and exams
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="My Students"
          value={myStudents.length}
          icon={Users}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Avg Attendance"
          value={`${avgAttendance}%`}
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Upcoming Exams"
          value={upcomingExams}
          icon={FileText}
          trend={{ value: 1, isPositive: true }}
        />
        <StatsCard
          title="Pending Reviews"
          value={assignmentsPending}
          icon={ClipboardCheck}
          trend={{ value: 3, isPositive: false }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common teaching tasks</CardDescription>
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
            <CardTitle>My Class Students</CardTitle>
            <CardDescription>Students under your guidance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myStudents.slice(0, 5).map((student) => (
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
                        {student.class} • Attendance: {student.attendance}%
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
            <CardTitle>Class Performance</CardTitle>
            <CardDescription>Overall class metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average Attendance</span>
                  <span className="font-semibold">{avgAttendance}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-chart-3 h-2 rounded-full"
                    style={{ width: `${avgAttendance}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-md border">
                  <span className="text-sm font-medium">Present Today</span>
                  <span className="text-lg font-bold">{Math.round(myStudents.length * 0.92)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md border">
                  <span className="text-sm font-medium">Absent Today</span>
                  <span className="text-lg font-bold">{Math.round(myStudents.length * 0.08)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
