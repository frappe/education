import { StatsCard } from "@/components/dashboard/StatsCard";
import { Home, Users, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import studentsData from "@/mockData/students.json";

export function HostelWardenDashboard() {
  const hostelStudents = studentsData.slice(0, 15);
  const totalBeds = 50;
  const occupiedBeds = hostelStudents.length;
  const availableBeds = totalBeds - occupiedBeds;
  const maintenanceIssues = 3;

  const recentActivities = [
    { id: 1, name: "Room Inspection", block: "Block A", status: "Completed" as const, date: "2025-01-10" },
    { id: 2, name: "Maintenance Request", block: "Block B", status: "Pending" as const, date: "2025-01-09" },
    { id: 3, name: "New Admission", block: "Block C", status: "Completed" as const, date: "2025-01-08" },
    { id: 4, name: "Room Inspection", block: "Block D", status: "Scheduled" as const, date: "2025-01-11" },
  ];

  const quickActions = [
    { label: "View Students", icon: Users, href: "/students" },
    { label: "Hostel Reports", icon: Home, href: "/admissions/reports" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
          Hostel Warden Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage hostel operations and student accommodations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Hostel Students"
          value={hostelStudents.length}
          icon={Users}
          trend={{ value: 3, isPositive: true }}
        />
        <StatsCard
          title="Occupied Beds"
          value={occupiedBeds}
          icon={Home}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Available Beds"
          value={availableBeds}
          icon={CheckCircle}
          trend={{ value: 5, isPositive: false }}
        />
        <StatsCard
          title="Maintenance Issues"
          value={maintenanceIssues}
          icon={AlertCircle}
          trend={{ value: 1, isPositive: false }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common hostel management tasks</CardDescription>
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
            <CardTitle>Hostel Students</CardTitle>
            <CardDescription>Students currently in hostel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hostelStudents.slice(0, 5).map((student) => (
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
                        {student.class} • Room {100 + student.id}
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
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest hostel operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-md hover-elevate active-elevate-2"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{activity.name}</p>
                      <Badge variant={
                        activity.status === "Completed" ? "default" : 
                        activity.status === "Pending" ? "secondary" : 
                        "outline"
                      }>
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.block} • {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
