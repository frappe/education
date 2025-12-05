import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, TrendingUp, AlertTriangle, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import studentFeesData from "@/mockData/studentFees.json";
import feePaymentsData from "@/mockData/feePayments.json";
import { format } from "date-fns";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StatsCard } from "@/components/common/StatsCard";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function FeeDashboard() {
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs();
  
  const totalCollected = studentFeesData.reduce((sum, student) => sum + student.paidAmount, 0);
  const totalPending = studentFeesData.reduce((sum, student) => sum + student.dueAmount, 0);
  
  const todayPayments = feePaymentsData.filter(payment => 
    payment.paymentDate === new Date().toISOString().split('T')[0]
  );
  const todayCollection = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  const defaulters = studentFeesData.filter(student => student.status === "Overdue");
  
  const recentPayments = feePaymentsData
    .slice()
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <Breadcrumb items={breadcrumbs} />
      
      <PageHeader
        title="Fee Management Dashboard"
        description="Academic Year 2024-25"
        customActions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto" 
              onClick={() => navigate("/fees/collection")}
              data-testid="button-collect-fee"
            >
              <IndianRupee className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Collect Fee</span>
              <span className="sm:hidden">Collect</span>
            </Button>
            <Button 
              className="w-full sm:w-auto" 
              onClick={() => navigate("/fees/reports")}
              data-testid="button-generate-report"
            >
              Generate Report
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Collection (2024-25)"
          value={`₹${totalCollected.toLocaleString('en-IN')}`}
          description="+12% from last month"
          icon={IndianRupee}
          iconColor="text-green-600"
          testId="text-stat-value-0"
        />
        
        <StatsCard
          title="Pending Dues"
          value={`₹${totalPending.toLocaleString('en-IN')}`}
          description={`${studentFeesData.filter(s => s.status === "Pending").length} students`}
          icon={TrendingUp}
          iconColor="text-orange-600"
          testId="text-stat-value-1"
        />
        
        <StatsCard
          title="Today's Collection"
          value={`₹${todayCollection.toLocaleString('en-IN')}`}
          description={`${todayPayments.length} payments`}
          icon={Receipt}
          iconColor="text-blue-600"
          testId="text-stat-value-2"
        />
        
        <StatsCard
          title="Overdue Fees"
          value={`₹${defaulters.reduce((sum, s) => sum + s.dueAmount, 0).toLocaleString('en-IN')}`}
          description={`${defaulters.length} students`}
          icon={AlertTriangle}
          iconColor="text-red-600"
          testId="text-stat-value-3"
        />
      </div>

      {defaulters.length > 0 && (
        <Card className="border-destructive/50" data-testid="card-defaulters">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Defaulter Alerts ({defaulters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {defaulters.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-destructive/5 rounded-md"
                  data-testid={`defaulter-${student.studentId}`}
                >
                  <div>
                    <p className="font-medium">{student.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.class} {student.section} | {student.admissionNo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive" data-testid={`text-due-${student.studentId}`}>
                      ₹{student.dueAmount.toLocaleString('en-IN')}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Button size="sm" variant="outline" className="text-xs" data-testid={`button-send-sms-${student.studentId}`}>
                        <span className="hidden sm:inline">Send SMS</span>
                        <span className="sm:hidden">SMS</span>
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs" data-testid={`button-call-parent-${student.studentId}`}>
                        <span className="hidden sm:inline">Call Parent</span>
                        <span className="sm:hidden">Call</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-recent-transactions">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Student</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Class</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Mode</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b hover-elevate" data-testid={`row-payment-${payment.id}`}>
                    <td className="p-2 text-sm">{format(new Date(payment.paymentDate), 'dd MMM yyyy')}</td>
                    <td className="p-2 text-sm font-medium">{payment.studentName}</td>
                    <td className="p-2 text-sm">{payment.class}</td>
                    <td className="p-2 text-sm font-semibold text-green-600" data-testid={`text-amount-${payment.id}`}>
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" data-testid={`badge-mode-${payment.id}`}>{payment.paymentMode}</Badge>
                    </td>
                    <td className="p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/fees/receipts/${encodeURIComponent(payment.receiptNo)}`)}
                        data-testid={`button-view-receipt-${payment.id}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
