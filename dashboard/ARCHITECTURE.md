# Education Dashboard Architecture

## Overview

This application follows a modern React architecture with Frappe backend integration, inspired by enterprise-level patterns for authentication, authorization, and route management.

## Technology Stack

- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.20
- **Routing**: React Router DOM
- **Backend Integration**: frappe-react-sdk
- **State Management**: React Context API + React Query
- **UI Components**: Radix UI + Tailwind CSS
- **Server**: Express (development mode)

## Architecture Layers

### 1. Provider Hierarchy

```
QueryClientProvider (React Query)
  └── TooltipProvider (UI)
      └── AppProviders (Custom wrapper)
          ├── FrappeAppProvider (Frappe SDK)
          │   └── AuthProvider (Authentication)
          │       └── WebsiteProvider (App Configuration)
          └── AppProvider (Legacy context)
              └── AdmissionDataProvider (Feature context)
```

#### Provider Responsibilities

**FrappeAppProvider** (`src/providers/FrappeAppProvider.tsx`)
- Initializes Frappe React SDK
- Configures connection to Frappe backend
- Provides WebSocket support for real-time updates
- Environment variables: `VITE_FRAPPE_URL`, `VITE_FRAPPE_SITE_NAME`, `VITE_SOCKET_PORT`

**AuthProvider** (`src/providers/AuthProvider.tsx`)
- Manages user authentication state
- Uses `useFrappeAuth` hook from frappe-react-sdk
- Fetches additional user details via `useFrappeGetCall`
- Provides:
  - `user`: Current user object with roles
  - `isLoading`: Loading state
  - `isAuthenticated`: Boolean authentication status
  - `login(username, password)`: Login method
  - `logout()`: Logout method

**WebsiteProvider** (`src/providers/WebsiteProvider.tsx`)
- Fetches application configuration from Frappe
- Provides school/institution details
- Manages app branding (logo, name, version)
- API endpoint: `education.education.api.get_school_abbr_logo`

### 2. Route Architecture

#### Route Types

**Public Routes** (`src/routes/PublicRoute.tsx`)
- Accessible without authentication
- Redirects to dashboard if user is already logged in
- Examples: Login, Register, Forgot Password

**Protected Routes** (`src/routes/ProtectedRoute.tsx`)
- Requires authentication
- Shows loading spinner during auth check
- Redirects to login if not authenticated
- Supports role-based access control via `allowedRoles` prop

#### Route Structure

```
/ → Redirect to /dashboard
│
├── /login (Public)
├── /register (Public)
├── /forgot-password (Public)
│
└── /dashboard/* (Protected)
    ├── / → Dashboard Home
    ├── /students (Admin, Academics)
    ├── /students/:id (Admin, Academics)
    ├── /enquiries (Admin, Academics)
    ├── /enquiries/new (Admin, Academics)
    ├── /applications (Admin, Academics)
    ├── /applications/new (Admin, Academics)
    ├── /fees (Admin only)
    ├── /fees/payment (Admin only)
    └── /settings (Admin only)
```

#### Router Components

**AppRoutes** (`src/routes/AppRoutes.tsx`)
- Main router using `BrowserRouter`
- Defines public and protected route structure
- Wraps dashboard routes in `DashboardLayout`
- Handles 404 pages

**DashboardRouter** (`src/routes/DashboardRouter.tsx`)
- Nested router for dashboard section
- Implements role-based route rendering
- Dynamically shows/hides routes based on user roles
- Uses React Router's nested routing

### 3. Type System

#### Authentication Types (`src/types/auth.ts`)

```typescript
interface User {
  name: string;
  email: string;
  full_name: string;
  user_image?: string;
  roles?: string[];
}

type Role = 
  | 'System Manager' 
  | 'Administrator' 
  | 'Student' 
  | 'Guardian' 
  | 'Instructor' 
  | 'Academics User';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

#### Website Types (`src/types/website.ts`)

```typescript
interface AppInfo {
  app_name: string;
  app_title: string;
  app_version: string;
  app_description?: string;
  app_logo?: string;
  school_name?: string;
}

interface WebsiteContextType {
  appInfo: AppInfo | null;
  isLoading: boolean;
  refetch: () => void;
}
```

### 4. Role-Based Access Control (RBAC)

#### Role Hierarchy

1. **System Manager / Administrator**
   - Full access to all features
   - Can manage settings, fees, students, admissions
   
2. **Academics User**
   - Access to student management
   - Access to admission processes
   - No access to fees or settings

3. **Instructor**
   - Limited access (define based on requirements)

4. **Student / Guardian**
   - Personal dashboard access
   - View own records

#### Implementation Pattern

```typescript
// In DashboardRouter
const hasRole = (role: Role): boolean => {
  return user?.roles?.includes(role) || false;
};

const isAdmin = hasRole('System Manager') || hasRole('Administrator');
const isAcademics = hasRole('Academics User');

// Conditional route rendering
{(isAdmin || isAcademics) && (
  <Route path="students" element={<StudentList />} />
)}

{isAdmin && (
  <Route path="settings" element={<Settings />} />
)}
```

## API Integration

### Frappe React SDK Hooks

**useFrappeAuth**
```typescript
const { currentUser, isLoading, login, logout } = useFrappeAuth();
```

**useFrappeGetCall**
```typescript
const { data, error, isLoading, mutate } = useFrappeGetCall<ResponseType>(
  'method.name',
  params,
  swrKey,
  options
);
```

**useFrappePostCall**
```typescript
const { call, loading, error } = useFrappePostCall<ResponseType>(
  'method.name'
);
```

**useFrappeGetDocList**
```typescript
const { data, error, isLoading } = useFrappeGetDocList<DocType>(
  'DocType',
  {
    fields: ['name', 'field1'],
    filters: [['field', '=', 'value']],
    limit: 20
  }
);
```

### Backend API Methods

Create these methods in your Frappe app:

**education/education/api.py**
```python
import frappe
from frappe import _

@frappe.whitelist()
def get_user_info():
    """Get current user information with roles"""
    user = frappe.session.user
    user_doc = frappe.get_doc("User", user)
    
    return {
        "name": user_doc.name,
        "email": user_doc.email,
        "full_name": user_doc.full_name,
        "user_image": user_doc.user_image,
        "roles": [role.role for role in user_doc.roles]
    }

@frappe.whitelist()
def get_school_abbr_logo():
    """Get school branding information"""
    # Implement based on your Education Settings doctype
    return {
        "app_name": "Education",
        "app_logo": "/files/school_logo.png",
        "school_name": frappe.db.get_single_value("Education Settings", "school_name")
    }
```

## Development Workflow

### Starting the Development Server

```bash
cd /home/anushree/frappe-bench-education/apps/education/dashboard
npm run dev
```

This starts:
- Express server on port 5000
- Vite dev server (proxied through Express)
- Hot module replacement enabled
- Frappe backend proxy configured

### Environment Variables

Create `.env` file:
```env
# Frappe Backend
FRAPPE_BACKEND_URL=http://localhost:8000
VITE_FRAPPE_URL=http://localhost:8000
VITE_FRAPPE_SITE_NAME=education.localhost
VITE_SOCKET_PORT=9000

# Server Configuration
NODE_ENV=development
PORT=5173
```

### Building for Production

```bash
npm run build
```

Outputs to `dist/` directory, ready for deployment.

## Security Considerations

1. **Authentication**: All protected routes check authentication status
2. **Authorization**: Role-based access control at route level
3. **API Security**: All API calls use Frappe session authentication
4. **CSRF Protection**: Handled by Frappe backend
5. **Input Validation**: Implement Zod schemas for form validation

## Testing Strategy

1. **Unit Tests**: Test individual components and hooks
2. **Integration Tests**: Test provider interactions
3. **Route Tests**: Test protected/public route behavior
4. **E2E Tests**: Test complete user flows

## Future Enhancements

1. **Real-time Updates**: Utilize WebSocket support from frappe-react-sdk
2. **Offline Support**: Implement service worker for offline capabilities
3. **Error Boundaries**: Add comprehensive error handling
4. **Analytics**: Track user interactions and feature usage
5. **Internationalization**: Add multi-language support
6. **Accessibility**: Ensure WCAG compliance

## Troubleshooting

### Common Issues

**"Cannot find module '@tanstack/react-query'"**
```bash
npm install @tanstack/react-query
```

**"401 Unauthorized" on API calls**
- Check Frappe backend is running
- Verify user is logged in
- Check session cookies

**Route not rendering**
- Check role-based access control logic
- Verify user has required roles
- Check browser console for errors

**Provider context undefined**
- Ensure component is wrapped in required providers
- Check provider hierarchy in App.tsx

## Contributing

1. Follow TypeScript best practices
2. Use provided types and interfaces
3. Maintain provider hierarchy
4. Document new routes and components
5. Add role checks for protected features

## Resources

- [Frappe React SDK Documentation](https://github.com/frappe/frappe-react-sdk)
- [React Router Documentation](https://reactrouter.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Frappe Framework Documentation](https://frappeframework.com/)
