import feeStructureData from "@/mockData/feeStructure.json";

export interface FeeBreakdown {
  tuitionFee: number;
  transportFee: number;
  libraryFee: number;
  sportsFee: number;
  hostelFee: number;
  messFee: number;
  cautionFee: number;
}

export interface DiscountItem {
  type: string;
  amount: number;
  percentage?: number;
}

export interface CalculatedFee {
  feeBreakdown: FeeBreakdown;
  totalFee: number;
  discountBreakdown: DiscountItem[];
  totalDiscounts: number;
  netFee: number;
}

interface SchemeConfig {
  waiverFees: (keyof FeeBreakdown)[];
  includesHostel: boolean;
  hostelType?: "AC" | "NON_AC";
}

const SCHEME_CONFIGS: Record<string, SchemeConfig> = {
  DAY_SCHOLAR: {
    waiverFees: [],
    includesHostel: false,
  },
  RTE: {
    waiverFees: ["tuitionFee"],
    includesHostel: false,
  },
  STAFF_CHILDREN: {
    waiverFees: [],
    includesHostel: false,
  },
  MDY: {
    waiverFees: ["tuitionFee"],
    includesHostel: false,
  },
  JUY: {
    waiverFees: ["tuitionFee"],
    includesHostel: false,
  },
  SHRESHTA: {
    waiverFees: ["tuitionFee"],
    includesHostel: false,
  },
  ATAL: {
    waiverFees: ["tuitionFee"],
    includesHostel: false,
  },
  HOSTEL_AC: {
    waiverFees: [],
    includesHostel: true,
    hostelType: "AC",
  },
  HOSTEL_NON_AC: {
    waiverFees: [],
    includesHostel: true,
    hostelType: "NON_AC",
  },
};

/**
 * Get base fee structure for a given class
 */
function getBaseFees(classNumber: string): FeeBreakdown {
  const classMap: Record<string, string> = {
    "1": "1st",
    "2": "2nd",
    "3": "3rd",
    "4": "4th",
    "5": "5th",
    "6": "6th",
    "7": "7th",
    "8": "8th",
    "9": "9th",
    "10": "10th",
    "11": "11th",
    "12": "12th",
    "Class 1": "1st",
    "Class 2": "2nd",
    "Class 3": "3rd",
    "Class 4": "4th",
    "Class 5": "5th",
    "Class 6": "6th",
    "Class 7": "7th",
    "Class 8": "8th",
    "Class 9": "9th",
    "Class 10": "10th",
    "Class 11": "11th",
    "Class 12": "12th",
  };

  const normalizedClass = classMap[classNumber] || classNumber;
  const feeData = (feeStructureData as any[]).find(
    (f) => f.class === normalizedClass
  );

  if (!feeData) {
    throw new Error(`Fee structure not found for class: ${classNumber}`);
  }

  return {
    tuitionFee: feeData.tuitionFee,
    transportFee: feeData.transportFee,
    libraryFee: feeData.libraryFee,
    sportsFee: feeData.sportsFee,
    hostelFee: feeData.hostelFee,
    messFee: feeData.messFee,
    cautionFee: feeData.cautionFee,
  };
}

/**
 * Apply scheme-specific waivers to fees
 */
function applySchemeWaivers(
  fees: FeeBreakdown,
  schemeCode: string
): FeeBreakdown {
  const config = SCHEME_CONFIGS[schemeCode];
  if (!config) {
    return fees;
  }

  const waivedFees = { ...fees };

  // Apply waivers for specific schemes (RTE, MDY, JUY, Shreshta, ATAL)
  config.waiverFees.forEach((feeKey) => {
    waivedFees[feeKey] = 0;
  });

  // For hostel schemes, remove non-hostel fees
  if (config.includesHostel) {
    waivedFees.tuitionFee = 0;
    waivedFees.transportFee = 0;
    waivedFees.libraryFee = 0;
    waivedFees.sportsFee = 0;
    waivedFees.messFee = 0;
  }

  return waivedFees;
}

/**
 * Calculate sibling discount
 * Sibling discount: ₹1500 per student
 */
function calculateSiblingDiscount(
  fees: FeeBreakdown,
  hasSiblingEnrolled: boolean
): DiscountItem | null {
  if (!hasSiblingEnrolled) {
    return null;
  }

  return {
    type: "Sibling Discount",
    amount: 1500,
  };
}

/**
 * Calculate merit discount
 * Merit discount: 50% for 90%+ marks, 75% for 96%+ marks
 */
function calculateMeritDiscount(
  fees: FeeBreakdown,
  meritPercentage?: number
): DiscountItem | null {
  if (!meritPercentage) {
    return null;
  }

  const tuitionAndTransport = fees.tuitionFee + fees.transportFee;

  if (meritPercentage >= 96) {
    return {
      type: "Merit Discount (96%+ marks)",
      amount: Math.round(tuitionAndTransport * 0.75),
      percentage: 75,
    };
  }

  if (meritPercentage >= 90) {
    return {
      type: "Merit Discount (90%+ marks)",
      amount: Math.round(tuitionAndTransport * 0.5),
      percentage: 50,
    };
  }

  return null;
}

/**
 * Calculate staff children discount
 * Rules:
 * - 2 children: Younger 100% off, Elder 50% off tuition
 * - 3+ children: Youngest 100% off, Middle 50% off tuition, Eldest full fee
 */
function calculateStaffChildrenDiscount(
  fees: FeeBreakdown,
  childNumber?: number,
  totalStaffChildren?: number
): DiscountItem | null {
  if (!childNumber || !totalStaffChildren) {
    return null;
  }

  // Only for staff children scheme
  if (totalStaffChildren === 2) {
    if (childNumber === 1) {
      // Younger child - 100% waiver on tuition
      return {
        type: "Staff Children Discount (Younger)",
        amount: fees.tuitionFee,
        percentage: 100,
      };
    } else if (childNumber === 2) {
      // Elder child - 50% on tuition
      return {
        type: "Staff Children Discount (Elder)",
        amount: Math.round(fees.tuitionFee * 0.5),
        percentage: 50,
      };
    }
  } else if (totalStaffChildren >= 3) {
    if (childNumber === 1) {
      // Youngest - 100% waiver
      return {
        type: "Staff Children Discount (Youngest)",
        amount: fees.tuitionFee,
        percentage: 100,
      };
    } else if (childNumber === 2) {
      // Middle child - 50% on tuition
      return {
        type: "Staff Children Discount (Middle)",
        amount: Math.round(fees.tuitionFee * 0.5),
        percentage: 50,
      };
    }
    // Eldest child - no discount (full fee)
  }

  return null;
}

/**
 * Main fee calculator function
 * Calculates fees based on scheme, class, and applicable discounts
 */
export function calculateStudentFee(options: {
  classNumber: string;
  schemeCode: string;
  hasSiblingEnrolled?: boolean;
  meritPercentage?: number;
  staffChildNumber?: number;
  totalStaffChildren?: number;
  specialDiscount?: number;
}): CalculatedFee {
  const {
    classNumber,
    schemeCode,
    hasSiblingEnrolled = false,
    meritPercentage,
    staffChildNumber,
    totalStaffChildren,
    specialDiscount = 0,
  } = options;

  // Get base fees for the class
  const baseFees = getBaseFees(classNumber);

  // Apply scheme-specific waivers
  const feeBreakdown = applySchemeWaivers(baseFees, schemeCode);

  // Calculate total gross fee
  const totalFee = Object.values(feeBreakdown).reduce((sum, fee) => sum + fee, 0);

  // Calculate applicable discounts
  const discountBreakdown: DiscountItem[] = [];

  // Sibling discount
  const siblingDiscount = calculateSiblingDiscount(feeBreakdown, hasSiblingEnrolled);
  if (siblingDiscount) {
    discountBreakdown.push(siblingDiscount);
  }

  // Merit discount
  const meritDiscount = calculateMeritDiscount(feeBreakdown, meritPercentage);
  if (meritDiscount) {
    discountBreakdown.push(meritDiscount);
  }

  // Staff children discount
  if (schemeCode === "STAFF_CHILDREN") {
    const staffDiscount = calculateStaffChildrenDiscount(
      feeBreakdown,
      staffChildNumber,
      totalStaffChildren
    );
    if (staffDiscount) {
      discountBreakdown.push(staffDiscount);
    }
  }

  // Special discount (if any)
  if (specialDiscount > 0) {
    discountBreakdown.push({
      type: "Special Discount",
      amount: specialDiscount,
    });
  }

  // Calculate total discounts
  const totalDiscounts = discountBreakdown.reduce(
    (sum, discount) => sum + discount.amount,
    0
  );

  // Calculate net fee
  const netFee = Math.max(totalFee - totalDiscounts, 0);

  return {
    feeBreakdown,
    totalFee,
    discountBreakdown,
    totalDiscounts,
    netFee,
  };
}

/**
 * Quick fee lookup utility
 * Returns just the net fee amount for quick calculations
 */
export function getNetFee(
  classNumber: string,
  schemeCode: string,
  options?: Omit<Parameters<typeof calculateStudentFee>[0], "classNumber" | "schemeCode">
): number {
  const result = calculateStudentFee({
    classNumber,
    schemeCode,
    ...options,
  });
  return result.netFee;
}

/**
 * Get all available schemes with their descriptions
 */
export function getSchemes(): Array<{
  code: string;
  label: string;
  description: string;
}> {
  return [
    {
      code: "DAY_SCHOLAR",
      label: "Day Scholar",
      description: "Regular day student with tuition, transport, and activities",
    },
    {
      code: "RTE",
      label: "RTE",
      description: "Right to Education - Tuition waived",
    },
    {
      code: "STAFF_CHILDREN",
      label: "Staff Children",
      description: "Children of school staff with special discount rules",
    },
    {
      code: "MDY",
      label: "MDY",
      description: "Minority Development Yojana - Tuition waived",
    },
    {
      code: "JUY",
      label: "JUY",
      description: "Jan Unnayan Yojana - Tuition waived",
    },
    {
      code: "SHRESHTA",
      label: "Shreshta",
      description: "Shreshta Scholarship - Tuition waived",
    },
    {
      code: "ATAL",
      label: "ATAL",
      description: "ATAL Initiative - Tuition waived",
    },
    {
      code: "HOSTEL_AC",
      label: "Hostel AC",
      description: "AC hostel accommodation with meals",
    },
    {
      code: "HOSTEL_NON_AC",
      label: "Hostel Non-AC",
      description: "Non-AC hostel accommodation with meals",
    },
  ];
}
