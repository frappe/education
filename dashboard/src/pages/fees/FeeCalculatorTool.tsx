import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Checkbox,
} from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, RotateCcw } from "lucide-react";
import { calculateStudentFee, getSchemes } from "@/utils/feeCalculator";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function FeeCalculatorTool() {
  const [classNumber, setClassNumber] = useState("Class 10");
  const [scheme, setScheme] = useState("DAY_SCHOLAR");
  const [hasSibling, setHasSibling] = useState(false);
  const [meritPercentage, setMeritPercentage] = useState("");
  const [isStaffChild, setIsStaffChild] = useState(false);
  const [staffChildNumber, setStaffChildNumber] = useState("1");
  const [totalStaffChildren, setTotalStaffChildren] = useState("2");
  const [specialDiscount, setSpecialDiscount] = useState("");

  const schemes = getSchemes();
  const classes = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

  const result = calculateStudentFee({
    classNumber,
    schemeCode: scheme,
    hasSiblingEnrolled: hasSibling,
    meritPercentage: meritPercentage ? parseInt(meritPercentage) : undefined,
    staffChildNumber: isStaffChild ? parseInt(staffChildNumber) : undefined,
    totalStaffChildren: isStaffChild ? parseInt(totalStaffChildren) : undefined,
    specialDiscount: specialDiscount ? parseInt(specialDiscount) : 0,
  });

  const handleReset = () => {
    setClassNumber("Class 10");
    setScheme("DAY_SCHOLAR");
    setHasSibling(false);
    setMeritPercentage("");
    setIsStaffChild(false);
    setStaffChildNumber("1");
    setTotalStaffChildren("2");
    setSpecialDiscount("");
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Fee Management", href: "/fees" },
        { label: "Fee Calculator" }
      ]} />
      
      <PageHeader
        title="Fee Calculator"
        description="Calculate student fees based on scheme, class, and applicable discounts"
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Input Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Fee Calculation Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="class" className="text-sm mb-2 block">
                    Class
                  </Label>
                  <Select value={classNumber} onValueChange={setClassNumber}>
                    <SelectTrigger id="class" data-testid="select-calc-class">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scheme" className="text-sm mb-2 block">
                    Fee Scheme
                  </Label>
                  <Select value={scheme} onValueChange={setScheme}>
                    <SelectTrigger id="scheme" data-testid="select-calc-scheme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {schemes.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Discounts */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm">Applicable Discounts</h3>

              <div className="space-y-3">
                {/* Sibling */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sibling"
                    checked={hasSibling}
                    onCheckedChange={(checked) => setHasSibling(checked as boolean)}
                    data-testid="checkbox-sibling"
                  />
                  <Label htmlFor="sibling" className="text-sm cursor-pointer flex-1">
                    Sibling Enrolled (₹1500)
                  </Label>
                </div>

                {/* Merit */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-sm mb-2 block">Merit Percentage</Label>
                    <Input
                      type="number"
                      placeholder="Enter % (90+, 96+)"
                      value={meritPercentage}
                      onChange={(e) => setMeritPercentage(e.target.value)}
                      data-testid="input-merit-percentage"
                      className="max-w-[200px]"
                    />
                  </div>
                </div>

                {/* Staff Children */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="staffChild"
                      checked={isStaffChild}
                      onCheckedChange={(checked) => setIsStaffChild(checked as boolean)}
                      data-testid="checkbox-staff-child"
                    />
                    <Label htmlFor="staffChild" className="text-sm cursor-pointer">
                      Staff Child (Special Rules)
                    </Label>
                  </div>

                  {isStaffChild && (
                    <div className="ml-6 grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="childNum" className="text-xs mb-1 block">
                          Child Number
                        </Label>
                        <Select value={staffChildNumber} onValueChange={setStaffChildNumber}>
                          <SelectTrigger id="childNum" data-testid="select-child-number">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1st (Youngest)</SelectItem>
                            <SelectItem value="2">2nd (Middle/Elder)</SelectItem>
                            <SelectItem value="3">3rd (Eldest)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="totalChildren" className="text-xs mb-1 block">
                          Total Children
                        </Label>
                        <Select value={totalStaffChildren} onValueChange={setTotalStaffChildren}>
                          <SelectTrigger id="totalChildren" data-testid="select-total-children">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Children</SelectItem>
                            <SelectItem value="3">3+ Children</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Special Discount */}
                <div>
                  <Label htmlFor="special" className="text-sm mb-2 block">
                    Special Discount (₹)
                  </Label>
                  <Input
                    id="special"
                    type="number"
                    placeholder="Enter amount (optional)"
                    value={specialDiscount}
                    onChange={(e) => setSpecialDiscount(e.target.value)}
                    data-testid="input-special-discount"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleReset} variant="outline" className="w-full" data-testid="button-reset-calc">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* Result Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Calculated Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fee Breakdown Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Gross Fee Breakdown</h4>
              {Object.entries(result.feeBreakdown).map(([key, value]) => {
                if (value === 0) return null;
                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .trim()
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                return (
                  <div key={key} className="flex justify-between text-sm" data-testid={`breakdown-${key}`}>
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">₹{value.toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm font-semibold" data-testid="total-gross">
                <span>Total Gross</span>
                <span>₹{result.totalFee.toLocaleString("en-IN")}</span>
              </div>

              {result.discountBreakdown.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mt-4">Discounts</h4>
                  {result.discountBreakdown.map((discount, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm"
                      data-testid={`discount-${idx}`}
                    >
                      <span className="text-muted-foreground text-xs">{discount.type}</span>
                      <span className="font-medium text-green-600">
                        -₹{discount.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold text-green-600 border-t pt-2" data-testid="total-discounts">
                    <span>Total Discount</span>
                    <span>-₹{result.totalDiscounts.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
            </div>

            {/* Final Result */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">Net Fee</div>
                <div
                  className="text-3xl font-bold"
                  data-testid="net-fee-result"
                >
                  ₹{result.netFee.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
