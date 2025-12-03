import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface FeeBreakdown {
  tuitionFee: number;
  transportFee: number;
  libraryFee: number;
  sportsFee: number;
  hostelFee: number;
  messFee: number;
  cautionFee: number;
}

interface ReceiptProps {
  receiptNo: string;
  studentName: string;
  studentId: string;
  admissionNo: string;
  class: string;
  section: string;
  paymentDate: string;
  paymentMode: string;
  transactionId?: string;
  amount: number;
  feeType: "School Fee" | "Hostel Fee" | "Both";
  feeBreakdown: FeeBreakdown;
  totalFee: number;
  discounts: number;
  discountBreakdown: Array<{ type: string; amount: number }>;
  netFee: number;
  paidAmount: number;
  dueAmount: number;
  collectedBy: string;
  remarks?: string;
  academicYear: string;
}

export function ReceiptComponent({ 
  receiptNo,
  studentName,
  studentId,
  admissionNo,
  class: studentClass,
  section,
  paymentDate,
  paymentMode,
  transactionId,
  amount,
  feeType,
  feeBreakdown,
  totalFee,
  discounts,
  discountBreakdown,
  netFee,
  paidAmount,
  dueAmount,
  collectedBy,
  remarks,
  academicYear,
}: ReceiptProps) {
  // Determine receipt header based on fee type
  const getReceiptHeader = () => {
    if (feeBreakdown.hostelFee > 0 && feeBreakdown.tuitionFee === 0) {
      return "Shri Sai Nath Educational Academy";
    }
    return "Sanskar Public School";
  };

  const receiptHeader = getReceiptHeader();
  const isHostelFee = receiptHeader === "Shri Sai Nath Educational Academy";

  return (
    <div className="max-w-2xl mx-auto print:max-w-full">
      <Card className="border-2">
        <CardContent className="p-0">
          {/* Receipt Header */}
          <div className="bg-primary/10 border-b-2 p-6 text-center space-y-1">
            <div className="text-sm text-muted-foreground font-medium">Receipt</div>
            <h1 className="text-2xl font-serif font-bold text-foreground" data-testid="receipt-header-name">
              {receiptHeader}
            </h1>
            <p className="text-xs text-muted-foreground">
              Academic Year {academicYear}
            </p>
          </div>

          {/* Receipt Number and Date */}
          <div className="border-b p-6 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Receipt No</div>
              <div className="font-mono font-semibold" data-testid="receipt-number">
                {receiptNo}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Date</div>
              <div className="font-semibold" data-testid="receipt-date">
                {format(new Date(paymentDate), "dd MMM yyyy")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Time</div>
              <div className="font-semibold" data-testid="receipt-time">
                {format(new Date(), "hh:mm a")}
              </div>
            </div>
          </div>

          {/* Student Details */}
          <div className="border-b p-6 space-y-3">
            <h3 className="font-semibold text-sm mb-4">Student Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <div className="font-semibold" data-testid="receipt-student-name">
                  {studentName}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Admission No:</span>
                <div className="font-semibold" data-testid="receipt-admission-no">
                  {admissionNo}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Class:</span>
                <div className="font-semibold" data-testid="receipt-class">
                  {studentClass} - {section}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Student ID:</span>
                <div className="font-semibold font-mono text-xs" data-testid="receipt-student-id">
                  {studentId}
                </div>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="border-b p-6 space-y-3">
            <h3 className="font-semibold text-sm mb-4">Fee Breakdown (Pre-Discount)</h3>
            <div className="space-y-2">
              {Object.entries(feeBreakdown).map(([key, value]) => {
                if (value === 0) return null;
                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .trim()
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                return (
                  <div
                    key={key}
                    className="flex justify-between text-sm"
                    data-testid={`breakdown-item-${key}`}
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">
                      ₹{value.toLocaleString("en-IN")}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold" data-testid="breakdown-total">
                <span>Total Gross Fee</span>
                <span>₹{totalFee.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Discounts Applied */}
          {discounts > 0 && (
            <div className="border-b p-6 space-y-3">
              <h3 className="font-semibold text-sm mb-4">Discounts Applied</h3>
              <div className="space-y-2">
                {discountBreakdown.map((discount, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm"
                    data-testid={`discount-item-${idx}`}
                  >
                    <span className="text-muted-foreground">{discount.type}</span>
                    <span className="font-semibold text-green-600">
                      -₹{discount.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-green-600" data-testid="discount-total">
                  <span>Total Discount</span>
                  <span>-₹{discounts.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="border-b p-6 space-y-3">
            <h3 className="font-semibold text-sm mb-4">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Payment Mode:</span>
                <div className="font-semibold" data-testid="receipt-payment-mode">
                  <Badge variant="outline">{paymentMode}</Badge>
                </div>
              </div>
              {transactionId && (
                <div>
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <div className="font-mono text-xs font-semibold" data-testid="receipt-transaction-id">
                    {transactionId}
                  </div>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Collected By:</span>
                <div className="font-semibold" data-testid="receipt-collected-by">
                  {collectedBy}
                </div>
              </div>
            </div>
            {remarks && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-muted-foreground text-xs">Remarks:</span>
                <div className="text-sm font-medium" data-testid="receipt-remarks">
                  {remarks}
                </div>
              </div>
            )}
          </div>

          {/* Amount Summary */}
          <div className="bg-primary/5 p-6 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <div className="text-muted-foreground text-xs font-medium mb-1">
                  Total Fee (Before Discount)
                </div>
                <div className="text-lg font-semibold" data-testid="summary-total-fee">
                  ₹{totalFee.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs font-medium mb-1">
                  Total Discount
                </div>
                <div className="text-lg font-semibold text-green-600" data-testid="summary-discount">
                  -₹{discounts.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="border-t-2 border-primary/20 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Net Fee</span>
                <span className="font-semibold">₹{netFee.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span className="text-muted-foreground">Amount Paid (This Receipt)</span>
                <span className="font-bold text-lg" data-testid="summary-amount-paid">
                  ₹{amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Balance Due */}
          <div className="border-t-2 p-6 text-center">
            <div className="text-xs text-muted-foreground mb-1">Balance Due</div>
            <div
              className={`text-3xl font-bold ${
                dueAmount > 0 ? "text-red-600" : "text-green-600"
              }`}
              data-testid="summary-balance-due"
            >
              ₹{dueAmount.toLocaleString("en-IN")}
            </div>
            {dueAmount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Outstanding balance to be paid
              </p>
            )}
            {dueAmount === 0 && (
              <p className="text-xs text-green-600 mt-2 font-medium">
                ✓ Fee fully paid
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              This is an electronically generated receipt and does not require signature
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {receiptHeader}. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 10mm;
          }
          .print\\:max-w-full {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
