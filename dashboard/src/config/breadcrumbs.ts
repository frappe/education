export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const breadcrumbConfig: Record<string, BreadcrumbItem[]> = {
  // Masters - Academic
  '/masters/academic/academic-year': [
    { label: 'Masters', href: '/masters' },
    { label: 'Academic' },
    { label: 'Academic Year' },
  ],
  '/masters/academic/class-master': [
    { label: 'Masters', href: '/masters' },
    { label: 'Academic' },
    { label: 'Class Master' },
  ],
  '/masters/academic/section-master': [
    { label: 'Masters', href: '/masters' },
    { label: 'Academic' },
    { label: 'Section Master' },
  ],

  // Masters - Fee
  '/masters/fee/fee-structure': [
    { label: 'Masters', href: '/masters' },
    { label: 'Fee' },
    { label: 'Fee Structure' },
  ],
  '/masters/fee/fee-schemes': [
    { label: 'Masters', href: '/masters' },
    { label: 'Fee' },
    { label: 'Fee Schemes' },
  ],
  '/masters/fee/discount-management': [
    { label: 'Masters', href: '/masters' },
    { label: 'Fee' },
    { label: 'Discount Management' },
  ],

  // Admissions
  '/admissions/enquiries': [
    { label: 'Admissions', href: '/admissions' },
    { label: 'Enquiries' },
  ],
  '/admissions/registrations': [
    { label: 'Admissions', href: '/admissions' },
    { label: 'Registrations' },
  ],
  '/admissions/applications': [
    { label: 'Admissions', href: '/admissions' },
    { label: 'Applications' },
  ],
  '/admissions/allocation': [
    { label: 'Admissions', href: '/admissions' },
    { label: 'Allocation' },
  ],
  '/admissions/approval': [
    { label: 'Admissions', href: '/admissions' },
    { label: 'Approval Workflow' },
  ],

  // Fee Management
  '/fees': [
    { label: 'Fee Management' },
    { label: 'Dashboard' },
  ],
  '/fees/collection': [
    { label: 'Fee Management', href: '/fees' },
    { label: 'Collect Payment' },
  ],
  '/fees/receipts': [
    { label: 'Fee Management', href: '/fees' },
    { label: 'View Receipts' },
  ],
  '/fees/installments': [
    { label: 'Fee Management', href: '/fees' },
    { label: 'Installments' },
  ],
  '/fees/bill-approval': [
    { label: 'Fee Management', href: '/fees' },
    { label: 'Bill Approval' },
  ],
  '/fees/student-fees': [
    { label: 'Fee Management', href: '/fees' },
    { label: 'Student Fees' },
  ],
  '/fees/calculator': [
    { label: 'Fee Management', href: '/fees' },
    { label: 'Fee Calculator' },
  ],
  '/fees/reports': [
    { label: 'Fee Management', href: '/fees' },
    { label: 'Reports' },
  ],

  // Students
  '/students': [
    { label: 'Students' },
  ],
  '/students/:id': [
    { label: 'Students', href: '/students' },
    { label: '{studentName}' },
  ],

  // Teachers
  '/teachers': [
    { label: 'Teachers' },
  ],
  '/teachers/:id': [
    { label: 'Teachers', href: '/teachers' },
    { label: '{teacherName}' },
  ],

  // Exams
  '/exams/schedule': [
    { label: 'Exams' },
    { label: 'Schedule' },
  ],

  // Reports
  '/reports/caution-fee-ledger': [
    { label: 'Reports' },
    { label: 'Caution Fee Ledger' },
  ],
  '/reports/student-fee': [
    { label: 'Reports' },
    { label: 'Student Fee Report' },
  ],
  '/reports/scheme-wise': [
    { label: 'Reports' },
    { label: 'Scheme Wise Report' },
  ],
  '/reports/outstanding': [
    { label: 'Reports' },
    { label: 'Outstanding Report' },
  ],
  '/reports/receipt-register': [
    { label: 'Reports' },
    { label: 'Receipt Register' },
  ],
  '/reports/discount': [
    { label: 'Reports' },
    { label: 'Discount Report' },
  ],

  // Settings
  '/settings': [
    { label: 'Settings' },
  ],
};

export function getBreadcrumbs(
  pathname: string,
  dynamicData?: Record<string, string>
): BreadcrumbItem[] {
  // Try exact match first
  let items = breadcrumbConfig[pathname];

  // If no exact match, try pattern matching for dynamic routes
  if (!items) {
    const patternKey = Object.keys(breadcrumbConfig).find(key => {
      const pattern = key.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(pathname);
    });

    if (patternKey) {
      items = breadcrumbConfig[patternKey];
    }
  }

  // If still no match, return default home breadcrumb
  if (!items) {
    return [{ label: 'Home', href: '/' }];
  }

  // Replace dynamic placeholders with actual data
  if (dynamicData) {
    items = items.map(item => ({
      ...item,
      label: item.label.replace(/\{(\w+)\}/g, (_, key) => dynamicData[key] || item.label),
    }));
  }

  return items;
}
