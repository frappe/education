import { StatsCard } from "@/components/dashboard/StatsCard";
import { IndianRupee, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import feesData from "@/mockData/fees.json";

export function AccountantDashboard() {
  const totalFees = feesData.reduce((sum, fee) => sum + fee.amount, 0);
  const collectedFees = feesData.reduce((sum, fee) => sum + fee.paid, 0);
  const pendingFees = totalFees - collectedFees;
  const paidCount = feesData.filter(f => f.status === "Paid").length;
  const pendingCount = feesData.filter(f => f.status === "Pending").length;
  const overdueCount = feesData.filter(f => f.status === "Overdue").length;

  const recentPayments = feesData.slice(0, 5);

  const quickActions = [
    { label: "Record Payment", icon: IndianRupee, href: "/fees" },
    { label: "View Reports", icon: TrendingUp, href: "/admissions/reports" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
          Accountant Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage fees, payments, and financial records
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Fees"
          value={`₹${(totalFees / 1000).toFixed(0)}k`}
          icon={IndianRupee}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Collected"
          value={`₹${(collectedFees / 1000).toFixed(0)}k`}
          icon={CheckCircle}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Pending"
          value={`₹${(pendingFees / 1000).toFixed(0)}k`}
          icon={AlertCircle}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title="Collection Rate"
          value={`${((collectedFees / totalFees) * 100).toFixed(0)}%`}
          icon={TrendingUp}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common financial tasks</CardDescription>
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
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest fee transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center justify-between p-3 rounded-md hover-elevate active-elevate-2"
                  data-testid={`payment-item-${fee.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {fee.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{fee.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{fee.paid.toLocaleString()} / ₹{fee.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={fee.status === "Paid" ? "default" : fee.status === "Overdue" ? "destructive" : "secondary"}>
                    {fee.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status Summary</CardTitle>
            <CardDescription>Fee collection breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md border border-chart-3">
                <div>
                  <p className="font-medium">Paid</p>
                  <p className="text-xs text-muted-foreground">{paidCount} students</p>
                </div>
                <span className="text-2xl font-bold text-chart-3">{paidCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="font-medium">Pending</p>
                  <p className="text-xs text-muted-foreground">{pendingCount} students</p>
                </div>
                <span className="text-2xl font-bold">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border border-destructive">
                <div>
                  <p className="font-medium">Overdue</p>
                  <p className="text-xs text-muted-foreground">{overdueCount} students</p>
                </div>
                <span className="text-2xl font-bold text-destructive">{overdueCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
