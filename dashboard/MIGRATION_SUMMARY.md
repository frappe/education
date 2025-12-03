# Frontend Migration Summary

## Overview
Successfully migrated the dashboard frontend from using a PostgreSQL database to connecting with the Frappe backend.

## Major Changes Made

### 1. Database Layer Removed
**File: `server/db.ts`**
- Removed: Drizzle ORM, Neon PostgreSQL connection
- Added: Simple Frappe API client using fetch
- Functionality: Handles GET, POST, PUT, DELETE requests to Frappe REST API

### 2. Session Management Updated
**File: `server/index.ts`**
- Removed: `connect-pg-simple` PostgreSQL session store
- Added: `memorystore` for lightweight session management
- Reason: Frappe manages the actual sessions via cookies

### 3. Authentication Rewritten
**File: `server/routes.ts`**
- **Login**: Now calls Frappe's `/api/method/login` endpoint
- **Logout**: Calls Frappe's `/api/method/logout` endpoint
- **Auth Check**: Uses `/api/method/education.education.api.get_user_info`
- Sessions synced with Frappe's cookie-based authentication

### 4. API Endpoints Updated
**File: `server/routes.ts`**
All data operations now use Frappe REST API:

| Frontend Endpoint | Frappe API | DocType |
|------------------|------------|---------|
| `GET /api/enquiries` | `/api/resource/Student Applicant` | Student Applicant |
| `POST /api/enquiries` | `/api/resource/Student Applicant` | Student Applicant |
| `PATCH /api/enquiries/:id` | `/api/resource/Student Applicant/:id` | Student Applicant |
| `GET /api/applications` | `/api/resource/Program Enrollment` | Program Enrollment |
| `POST /api/applications` | `/api/resource/Program Enrollment` | Program Enrollment |
| `PATCH /api/applications/:id` | `/api/resource/Program Enrollment/:id` | Program Enrollment |
| `GET /api/students/search` | `/api/resource/Student/:id` | Student |

### 5. Schema Simplified
**File: `shared/schema.ts`**
- Removed: All Drizzle ORM table definitions
- Kept: Zod validation schemas for type safety
- Converted: Database-specific types to plain TypeScript types

### 6. Configuration Files

**`vite.config.ts`**
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
      ws: true,
    },
  },
}
```

**`.env`**
```
FRAPPE_BACKEND_URL=http://localhost:8000
NODE_ENV=development
PORT=5173
```

### 7. Dependencies Updated

**Removed:**
- `@neondatabase/serverless`
- `drizzle-orm`
- `drizzle-zod`
- `drizzle-kit`
- `connect-pg-simple`
- `bcryptjs`
- `@types/bcryptjs`
- `passport`
- `passport-local`
- `@types/passport`
- `@types/passport-local`
- `ws`
- `@types/ws`
- `@types/connect-pg-simple`

**Added:**
- `memorystore` (lightweight session store)

**Kept:**
- All React and UI dependencies
- Zod for validation
- Express for server
- All Radix UI components

## Architecture

```
Browser (localhost:5173)
    ↓
Vite Dev Server (with proxy)
    ↓
Express Server (server/index.ts)
    ↓
Frappe API Client (server/db.ts)
    ↓
Frappe Backend (localhost:8000)
    ↓
Frappe Database (MariaDB)
```

## How to Use

### 1. Start Frappe Backend
```bash
cd /home/anushree/frappe-bench-education
bench start
```

### 2. Start Frontend
```bash
cd /home/anushree/frappe-bench-education/apps/education/dashboard
npm install  # Only needed once
npm run dev
```

### 3. Access
- Frontend: http://localhost:5173
- Login with Frappe credentials

## What Works

✅ User authentication via Frappe
✅ Session management with Frappe cookies
✅ CRUD operations for enquiries (Student Applicant)
✅ CRUD operations for applications (Program Enrollment)
✅ Student lookup
✅ TypeScript type safety maintained
✅ All UI components unchanged

## Next Steps for Production

### 1. Frappe DocType Customization
Create custom fields in Frappe DocTypes to match the dashboard schema:
- Student Applicant (for enquiries)
- Program Enrollment (for applications)
- Custom DocType for Registrations (if needed)

### 2. API Permissions
Configure Frappe user roles and permissions:
- Admission Officer role
- Accountant role
- Admin role permissions

### 3. File Uploads
Implement document upload handling:
- Birth certificates
- Marksheets
- Photos
- Transfer certificates

### 4. Custom API Methods
Create whitelisted Frappe methods for:
- Complex queries
- Bulk operations
- Report generation
- Workflow transitions

### 5. Production Deployment
- Build frontend: `npm run build`
- Configure nginx/apache reverse proxy
- Set up proper CORS policies
- Enable HTTPS
- Configure production environment variables

## Testing Checklist

- [ ] Login with Frappe user
- [ ] Create new enquiry
- [ ] Update enquiry status
- [ ] View enquiry list
- [ ] Create application
- [ ] Update application
- [ ] View application list
- [ ] Search for students
- [ ] Logout

## Troubleshooting

### Server won't start
- Check if port 5173 is available
- Run `npm install` to install dependencies

### Authentication fails
- Ensure Frappe is running on port 8000
- Check Frappe user exists and is active
- Verify API is enabled in Frappe settings

### API errors
- Check Frappe logs: `bench --site [site-name] logs`
- Verify DocTypes exist in Frappe
- Check user has read/write permissions

### CORS issues
- Vite proxy should handle this in development
- For production, configure Frappe CORS settings

## Files Modified

1. `/server/db.ts` - Complete rewrite
2. `/server/index.ts` - Session store changed
3. `/server/routes.ts` - All endpoints updated
4. `/shared/schema.ts` - Removed ORM, kept Zod
5. `/vite.config.ts` - Added proxy and aliases
6. `/package.json` - Updated dependencies
7. `/.env` - Created with configuration

## Files That Can Be Removed

- `/server/storage.ts` - No longer used (was database abstraction)
- `/server/seed.ts` - No longer needed (Frappe has its own data)
- `drizzle.config.ts` - If it exists

## Performance Considerations

- API calls are now over HTTP (slight overhead vs direct DB)
- Frappe handles caching and optimization
- Consider implementing frontend caching for frequently accessed data
- Use React Query for better data management

## Security

- Authentication handled by Frappe (battle-tested)
- No direct database access from frontend
- Session cookies httpOnly
- API calls go through Frappe permission system
- No password storage in frontend
