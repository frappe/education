import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReceiptComponent } from "@/components/fees/ReceiptComponent";
import { Search, Printer, Download, X } from "lucide-react";
import studentFeesData from "@/mockData/studentFees.json";
import feePaymentsData from "@/mockData/feePayments.json";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

interface StudentFee {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  admissionNo: string;
  feeBreakdown: {
    tuitionFee: number;
    transportFee: number;
    libraryFee: number;
    sportsFee: number;
    hostelFee: number;
    messFee: number;
    cautionFee: number;
  };
  totalFee: number;
  discountBreakdown: Array<{ type: string; amount: number }>;
  discounts: number;
  netFee: number;
  paidAmount: number;
  dueAmount: number;
}

interface Payment {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  class: string;
  admissionNo: string;
  paymentDate: string;
  paymentMode: string;
  transactionId?: string;
  amount: number;
  feeType: string;
  receiptHeader: string;
  remarks?: string;
  collectedBy: string;
  academicYear: string;
}

export default function ReceiptView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedReceipt, setSelectedReceipt] = useState<(Payment & StudentFee) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const payments = feePaymentsData as Payment[];
  const students = studentFeesData as StudentFee[];
  
  // Extract receiptNo from URL params
  const urlReceiptNo = location.pathname.split('/').pop();
  
  useEffect(() => {
    if (urlReceiptNo && urlReceiptNo !== 'receipts') {
      const payment = payments.find((p) => p.receiptNo === decodeURIComponent(urlReceiptNo));
      if (payment) {
        const studentData = students.find((s) => s.studentId === payment.studentId);
        if (studentData) {
          setSelectedReceipt({ ...payment, ...studentData } as Payment & StudentFee);
          setSearchQuery(payment.receiptNo);
        }
      }
    }
  }, [urlReceiptNo, payments, students]);

  // Search receipts
  const filteredReceipts = payments.filter(
    (payment) =>
      payment.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectReceipt = (payment: Payment) => {
    const studentData = students.find((s) => s.studentId === payment.studentId);
    if (studentData) {
      setSelectedReceipt({ ...payment, ...studentData } as Payment & StudentFee);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real app, this would generate a PDF
    alert("Receipt download functionality would be implemented with a PDF library");
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Fees", href: "/fees" },
        { label: "Receipts" }
      ]} />
      
      <PageHeader
        title="Receipt View"
        description="Search and view payment receipts"
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Receipt Search */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Search Receipt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search" className="text-sm mb-2 block">
                Search by Receipt No, Student Name, or Admission No
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-receipt-search"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => handleSelectReceipt(payment)}
                    className="w-full text-left p-3 border rounded-md hover:bg-muted transition-colors"
                    data-testid={`button-select-receipt-${payment.id}`}
                  >
                    <div className="font-mono text-sm font-semibold text-primary">
                      {payment.receiptNo}
                    </div>
                    <div className="text-sm">{payment.studentName}</div>
                    <div className="text-xs text-muted-foreground">
                      {payment.admissionNo}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs">₹{payment.amount.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  {searchQuery ? "No receipts found" : "Enter search criteria"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receipt Display */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
            <CardTitle className="text-lg">Receipt</CardTitle>
            {selectedReceipt && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  data-testid="button-print-receipt"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  data-testid="button-download-receipt"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedReceipt(null)}
                  data-testid="button-close-receipt"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedReceipt ? (
              <ReceiptComponent
                receiptNo={selectedReceipt.receiptNo}
                studentName={selectedReceipt.studentName}
                studentId={selectedReceipt.studentId}
                admissionNo={selectedReceipt.admissionNo}
                class={selectedReceipt.class}
                section={selectedReceipt.section}
                paymentDate={selectedReceipt.paymentDate}
                paymentMode={selectedReceipt.paymentMode}
                transactionId={selectedReceipt.transactionId}
                amount={selectedReceipt.amount}
                feeType={selectedReceipt.feeType as "School Fee" | "Hostel Fee" | "Both"}
                feeBreakdown={selectedReceipt.feeBreakdown}
                totalFee={selectedReceipt.totalFee}
                discounts={selectedReceipt.discounts}
                discountBreakdown={selectedReceipt.discountBreakdown}
                netFee={selectedReceipt.netFee}
                paidAmount={selectedReceipt.paidAmount}
                dueAmount={selectedReceipt.dueAmount}
                collectedBy={selectedReceipt.collectedBy}
                remarks={selectedReceipt.remarks}
                academicYear={selectedReceipt.academicYear}
              />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Select a receipt to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
