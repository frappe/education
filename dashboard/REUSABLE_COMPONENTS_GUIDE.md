# Reusable Components Guide

## PageHeader Component

A standardized, reusable header component for all pages in the application.

### Location
`src/components/common/PageHeader.tsx`

### Features
- ✅ Consistent typography (text-2xl, font-serif, font-semibold)
- ✅ Optional icon display
- ✅ Optional description text
- ✅ Single action button support
- ✅ Custom actions support (for multiple buttons)
- ✅ Fully typed with TypeScript
- ✅ Test ID support for all elements

### Usage Examples

#### 1. Simple Title Only
```tsx
<PageHeader title="Dashboard" />
```

#### 2. Title with Description
```tsx
<PageHeader 
  title="Fee Schemes" 
  description="Manage all fee schemes and their configurations"
/>
```

#### 3. With Icon
```tsx
import { BookOpen } from "lucide-react";

<PageHeader 
  title="Class Master"
  description="Manage class levels, streams, and intake capacity"
  icon={BookOpen}
/>
```

#### 4. With Action Button
```tsx
import { Award, Plus } from "lucide-react";

<PageHeader 
  title="Fee Schemes"
  description="Manage all fee schemes and their configurations"
  action={{
    label: "Add New Scheme",
    onClick: handleAddScheme,
    icon: Award,
    testId: "button-add-scheme"
  }}
/>
```

#### 5. Complete Example (Icon + Description + Action)
```tsx
import { BookOpen, Plus } from "lucide-react";

<PageHeader 
  title="Class Master"
  description="Manage class levels, streams, and intake capacity"
  icon={BookOpen}
  action={{
    label: "Add Class",
    onClick: handleAdd,
    icon: Plus,
    variant: "default",  // optional
    testId: "button-add-class"
  }}
/>
```

#### 6. With Multiple Custom Actions
```tsx
<PageHeader 
  title="Students"
  description="View and manage student records"
  customActions={
    <div className="flex gap-2">
      <Button onClick={handleExport} variant="outline">
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
      <Button onClick={handleImport}>
        <Upload className="w-4 h-4 mr-2" />
        Import
      </Button>
    </div>
  }
/>
```

### Props API

```typescript
interface PageHeaderProps {
  /**
   * The main title of the page
   */
  title: string;
  
  /**
   * Optional subtitle/description
   */
  description?: string;
  
  /**
   * Optional icon to display before the title
   */
  icon?: LucideIcon;
  
  /**
   * Optional action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
    testId?: string;
  };
  
  /**
   * Custom actions (for multiple buttons or complex actions)
   */
  customActions?: ReactNode;
  
  /**
   * Custom class name for the container
   */
  className?: string;
}
```

## Migration Guide

### Before (Old Pattern)
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold flex items-center gap-2">
      <BookOpen className="w-6 h-6" />
      Class Master
    </h1>
    <p className="text-muted-foreground">
      Manage class levels, streams, and intake capacity
    </p>
  </div>
  <Button onClick={handleAdd} data-testid="button-add-class">
    <Plus className="w-4 h-4 mr-2" />
    Add Class
  </Button>
</div>
```

### After (New Pattern)
```tsx
import { PageHeader } from "@/components/common/PageHeader";
import { BookOpen, Plus } from "lucide-react";

<PageHeader 
  title="Class Master"
  description="Manage class levels, streams, and intake capacity"
  icon={BookOpen}
  action={{
    label: "Add Class",
    onClick: handleAdd,
    icon: Plus,
    testId: "button-add-class"
  }}
/>
```

## Pages Already Updated

✅ `/pages/masters/fee/FeeSchemes.tsx`  
✅ `/pages/masters/academic/ClassMaster.tsx`  
✅ `/pages/masters/academic/SectionMaster.tsx`

## Pages Recommended to Update

### High Priority (Consistent Pattern)
- `/pages/masters/fee/FeeStructure.tsx`
- `/pages/masters/fee/DiscountManagement.tsx`
- `/pages/masters/academic/AcademicYearMaster.tsx`
- `/pages/masters/MasterConfiguration.tsx`

### Medium Priority (Reports)
- `/pages/reports/SchemeWiseReport.tsx`
- `/pages/reports/OutstandingReport.tsx`
- `/pages/reports/ReceiptRegister.tsx`
- `/pages/reports/DiscountReport.tsx`

### Low Priority (Admissions)
- `/pages/admissions/EnquiryManagement.tsx`
- `/pages/admissions/RegistrationManagement.tsx`
- `/pages/admissions/AdmissionApplications.tsx`
- `/pages/admissions/AdmissionReports.tsx`

## Benefits

1. **Consistency**: Same typography, spacing, and layout across all pages
2. **Maintainability**: Change once, update everywhere
3. **Type Safety**: Full TypeScript support with IntelliSense
4. **Testing**: Standardized test IDs (`text-page-title`, `button-page-action`)
5. **Flexibility**: Supports icons, actions, and custom layouts
6. **Documentation**: Built-in JSDoc comments
7. **Accessibility**: Proper heading hierarchy (h1)
8. **Responsive**: Works on all screen sizes

## Design Tokens Used

- **Title Font**: `text-3xl font-bold`
- **Description Font**: `text-muted-foreground`
- **Icon Size**: `w-6 h-6` (title), `w-4 h-4 mr-2` (button)
- **Spacing**: `gap-2` (icon-title), `mt-1` (description)
- **Layout**: `flex items-center justify-between`

## Next Steps

1. **Update Remaining Pages**: Start with high-priority pages
2. **Create More Reusable Components**:
   - StatCard (for dashboard metrics)
   - DataTable (for tables with search/filter)
   - FormDialog (for add/edit forms)
   - FilterBar (for search and filters)
   - ActionMenu (for dropdown actions)

3. **Standardize Patterns**:
   - Page layouts
   - Form validation
   - Loading states
   - Error handling
   - Success notifications

## Questions?

Check the component source code at:
`src/components/common/PageHeader.tsx`

All props are documented with JSDoc comments for IntelliSense support!
