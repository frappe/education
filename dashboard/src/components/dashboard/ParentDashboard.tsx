import { StatsCard } from "@/components/dashboard/StatsCard";
import { TrendingUp, Calendar, IndianRupee, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import studentsData from "@/mockData/students.json";
import feesData from "@/mockData/fees.json";

export function ParentDashboard() {
  const myChild = studentsData[0];
  const attendance = myChild.attendance;
  const upcomingExams = 2;
  
  const childFee = feesData.find(fee => fee.studentId === myChild.id) || feesData[0];
  const feesPaid = childFee.paid;
  const feesTotal = childFee.amount;

  const recentActivities = [
    { id: 1, type: "Attendance", description: "Present in all classes", date: "2025-01-10" },
    { id: 2, type: "Exam", description: "Mathematics Unit Test - 85%", date: "2025-01-08" },
    { id: 3, type: "Fee", description: "Term 1 fees paid", date: "2025-01-05" },
    { id: 4, type: "Attendance", description: "Present in all classes", date: "2025-01-09" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
          Parent Dashboard
        </h1>
        <p className="text-muted-foreground">
          View your child's academic progress and activities
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
              {myChild.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{myChild.name}</h3>
              <p className="text-sm text-muted-foreground">
                {myChild.class} • Roll No: {myChild.rollNo}
              </p>
              <p className="text-sm text-muted-foreground">
                Parent: {myChild.fatherName}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Attendance"
          value={`${attendance}%`}
          icon={TrendingUp}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Upcoming Exams"
          value={upcomingExams}
          icon={Calendar}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Fees Paid"
          value={`₹${(feesPaid / 1000).toFixed(0)}k`}
          icon={IndianRupee}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Overall Performance"
          value="Good"
          icon={CheckCircle}
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest updates about your child</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-md hover-elevate active-elevate-2"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{activity.type}</p>
                      <Badge variant="secondary" className="text-xs">
                        {new Date(activity.date).toLocaleDateString()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Summary</CardTitle>
            <CardDescription>Payment status overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Fees</span>
                  <span className="font-semibold">₹{feesTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-chart-3">
                    ₹{feesPaid.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-accent">
                    ₹{(feesTotal - feesPaid).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-chart-3 h-2 rounded-full"
                  style={{
                    width: `${(feesPaid / feesTotal) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {((feesPaid / feesTotal) * 100).toFixed(1)}% paid
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
