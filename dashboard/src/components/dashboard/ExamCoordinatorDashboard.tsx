import { StatsCard } from "@/components/dashboard/StatsCard";
import { FileText, Calendar, CheckCircle, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import studentsData from "@/mockData/students.json";

export function ExamCoordinatorDashboard() {
  const totalStudents = studentsData.length;
  const upcomingExams = 5;
  const completedExams = 12;
  const resultsPublished = 10;

  const mockExams = [
    { id: 1, name: "Mid-Term Mathematics", date: "2025-01-15", class: "Class 10", status: "Upcoming" },
    { id: 2, name: "Unit Test Science", date: "2025-01-20", class: "Class 9", status: "Upcoming" },
    { id: 3, name: "Final English", date: "2025-01-25", class: "Class 8", status: "Scheduled" },
    { id: 4, name: "Mock Test Math", date: "2025-01-18", class: "Class 12", status: "Upcoming" },
    { id: 5, name: "History Assessment", date: "2025-01-22", class: "Class 11", status: "Scheduled" },
  ];

  const quickActions = [
    { label: "Schedule Exam", icon: Calendar, href: "/exams" },
    { label: "View Results", icon: CheckCircle, href: "/exams" },
    { label: "View Students", icon: Users, href: "/students" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
          Exam Coordinator Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage examinations, schedules, and results
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
          title="Upcoming Exams"
          value={upcomingExams}
          icon={Calendar}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Completed Exams"
          value={completedExams}
          icon={CheckCircle}
          trend={{ value: 3, isPositive: true }}
        />
        <StatsCard
          title="Results Published"
          value={resultsPublished}
          icon={FileText}
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common examination tasks</CardDescription>
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
            <CardTitle>Upcoming Examinations</CardTitle>
            <CardDescription>Scheduled exams this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-3 rounded-md hover-elevate active-elevate-2"
                  data-testid={`exam-item-${exam.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{exam.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {exam.class} • {new Date(exam.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={exam.status === "Upcoming" ? "default" : "secondary"}>
                    {exam.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Examination Statistics</CardTitle>
            <CardDescription>Overall exam metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="font-medium">Total Scheduled</p>
                  <p className="text-xs text-muted-foreground">This semester</p>
                </div>
                <span className="text-2xl font-bold">{completedExams + upcomingExams}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border border-chart-3">
                <div>
                  <p className="font-medium">Completed</p>
                  <p className="text-xs text-muted-foreground">Results available</p>
                </div>
                <span className="text-2xl font-bold text-chart-3">{resultsPublished}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border border-accent">
                <div>
                  <p className="font-medium">Pending Results</p>
                  <p className="text-xs text-muted-foreground">Awaiting evaluation</p>
                </div>
                <span className="text-2xl font-bold text-accent">{completedExams - resultsPublished}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
