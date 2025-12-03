# Route and Provider Architecture

## Overview

The application is organized with a clean separation of concerns:
- **Routes**: Organized by feature (Public, Dashboard, Admissions, Fees)
- **Providers**: Hierarchical provider structure for state management
- **Middleware**: Route protection and access control

## Directory Structure

```
src/
├── routes/
│   ├── index.tsx              # Main router combining all routes
│   ├── PublicRoutes.tsx       # Public routes (login, etc.)
│   ├── DashboardRoutes.tsx    # General dashboard routes
│   ├── AdmissionRoutes.tsx    # Admission management routes
│   └── FeeRoutes.tsx          # Fee management routes
├── providers/
│   ├── index.tsx              # Combined providers export
│   ├── FrappeAppProvider.tsx  # Frappe SDK integration
│   ├── AuthProvider.tsx       # User authentication
│   └── WebsiteProvider.tsx    # App/website configuration
├── middleware/
│   └── RouteMiddleware.tsx    # Route protection logic
└── App.tsx                     # Main app with provider hierarchy
```

## Provider Hierarchy

```
App
└── QueryClientProvider (React Query)
    └── TooltipProvider (UI)
        └── AppProviders (Frappe Integration)
            ├── FrappeAppProvider (Frappe SDK)
            │   └── AuthProvider (Authentication)
            │       └── WebsiteProvider (App Config)
            └── AppProvider (Legacy context)
                └── AdmissionDataProvider (Admission context)
                    └── AppRoutes (All routes)
```

## Providers

### 1. FrappeAppProvider
- **Purpose**: Integrates Frappe React SDK
- **Provides**: Frappe API client, real-time capabilities
- **Configuration**: `.env` variables for Frappe URL and site

### 2. AuthProvider
- **Purpose**: Manages user authentication state
- **Provides**: `user`, `isAuthenticated`, `login()`, `logout()`
- **Uses**: Frappe's authentication API

### 3. WebsiteProvider
- **Purpose**: Fetches and provides app configuration
- **Provides**: App name, logo, school details
- **Source**: Frappe backend API

## Route Organization

### Public Routes (`PublicRoutes.tsx`)
Routes accessible without authentication:
- `/login` - Login page

### Dashboard Routes (`DashboardRoutes.tsx`)
General dashboard pages:
- `/dashboard` - Dashboard home
- `/students` - Student list
- `/students/:id` - Student profile
- `/teachers` - Teacher list
- `/teachers/:id` - Teacher profile
- `/attendance` - Attendance management
- `/exams` - Exam schedule
- `/settings` - Settings

### Admission Routes (`AdmissionRoutes.tsx`)
Admission management pages (requires `canManageAdmissions` permission):
- `/admissions/enquiries` - Enquiry list
- `/admissions/enquiries/new` - New enquiry form
- `/admissions/registrations` - Registration management
- `/admissions/applications` - Application list
- `/admissions/applications/new` - New application form
- `/admissions/approvals` - Approval workflow
- `/admissions/allocations` - Section/house allocation
- `/admissions/reports` - Admission reports

### Fee Routes (`FeeRoutes.tsx`)
Fee management pages (requires `canManageFees` permission):
- `/fees` - Fee dashboard
- `/fees/schemes` - Fee schemes
- `/fees/structure` - Fee structure
- `/fees/discounts` - Discount management
- `/fees/students` - Student fee management
- `/fees/calculator` - Fee calculator
- `/fees/collection` - Fee collection
- `/fees/receipts` - Receipt management
- `/fees/installments` - Installment management
- `/fees/bill-approval` - Bill approval workflow
- `/fees/reports` - Fee reports

## Middleware

### RouteMiddleware
Provides route-level access control:
- **Authentication check**: Redirects to `/login` if not authenticated
- **Permission check**: Verifies user has required permissions
- **Loading state**: Shows spinner while checking authentication

### PublicOnlyRoute
For routes that should redirect authenticated users:
- Used for login page
- Redirects to dashboard if already logged in

## Usage Examples

### Adding a New Protected Route

```tsx
// In appropriate route file (e.g., DashboardRoutes.tsx)
<Route path="/new-page">
  <ProtectedRoute requiredPermission="canViewPage">
    <DashboardLayout>
      <NewPage />
    </DashboardLayout>
  </ProtectedRoute>
</Route>
```

### Using Auth Context

```tsx
import { useAuth } from "@/providers/AuthProvider";

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.full_name}</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Using Website Context

```tsx
import { useWebsite } from "@/providers/WebsiteProvider";

function Header() {
  const { appInfo } = useWebsite();
  
  return (
    <div>
      <img src={appInfo?.app_logo} alt={appInfo?.school_name} />
      <h1>{appInfo?.school_name}</h1>
    </div>
  );
}
```

### Using Frappe SDK Hooks

```tsx
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";

function StudentList() {
  // Fetch data
  const { data, isLoading } = useFrappeGetCall("education.api.get_students");
  
  // Create/update data
  const { call: createStudent } = useFrappePostCall("education.api.create_student");
  
  const handleCreate = async () => {
    await createStudent({ student_name: "John Doe" });
  };
  
  return <div>{/* UI */}</div>;
}
```

## Environment Configuration

Create/update `.env` file:

```env
# Backend URL for server-side calls
FRAPPE_BACKEND_URL=http://localhost:8000

# Frappe React SDK Configuration (client-side)
VITE_FRAPPE_URL=http://localhost:8000
VITE_FRAPPE_SITE_NAME=education.localhost
VITE_SOCKET_PORT=9000
```

## Benefits of This Architecture

1. **Separation of Concerns**: Routes are organized by feature
2. **Reusability**: Providers can be used across components
3. **Type Safety**: TypeScript for all contexts and props
4. **Scalability**: Easy to add new routes and features
5. **Maintainability**: Clear structure for developers
6. **Integration**: Seamless Frappe backend integration
7. **Security**: Centralized authentication and permission checks

## Migration Notes

- Old routing code removed from `App.tsx`
- Routes organized into separate files
- Frappe React SDK integrated
- Authentication now uses Frappe backend
- All protected routes use consistent middleware
