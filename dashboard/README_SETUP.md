# Dashboard Setup with Frappe Backend

This dashboard frontend now connects to the Frappe backend instead of using PostgreSQL.

## Prerequisites

1. Frappe bench must be running on port 8000
2. Node.js and npm installed

## Setup Steps

### 1. Start Frappe Backend

In the frappe-bench directory, start the Frappe server:

```bash
cd /home/anushree/frappe-bench-education
bench start
```

This will start the Frappe server on port 8000.

### 2. Install Frontend Dependencies

```bash
cd /home/anushree/frappe-bench-education/apps/education/dashboard
npm install
```

### 3. Configure Environment

The `.env` file has been created with default values:

```
FRAPPE_BACKEND_URL=http://localhost:8000
NODE_ENV=development
PORT=5173
```

Modify if your Frappe server runs on a different port.

### 4. Start the Frontend Development Server

```bash
npm run dev
```

This will start the React development server on port 5173.

### 5. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:5173
```

## How It Works

### API Proxy

The Vite development server is configured to proxy all `/api` requests to the Frappe backend (port 8000). This is configured in `vite.config.ts`.

### Authentication

- Login is handled through Frappe's authentication API
- Session cookies are managed by Frappe
- The frontend stores minimal session data

### Data Flow

1. **Login**: Frontend → `/api/method/login` → Frappe Backend
2. **Enquiries**: Frontend → `/api/resource/Student Applicant` → Frappe Backend
3. **Applications**: Frontend → `/api/resource/Program Enrollment` → Frappe Backend

### Key Files Modified

1. **server/db.ts** - Removed PostgreSQL, added Frappe API client
2. **server/index.ts** - Switched from PostgreSQL session store to memory store
3. **server/routes.ts** - Updated all routes to use Frappe REST API
4. **vite.config.ts** - Added proxy configuration for API calls
5. **package.json** - Removed database dependencies
6. **shared/schema.ts** - Removed Drizzle ORM, kept Zod schemas

## Frappe DocTypes Used

The dashboard maps to these Frappe DocTypes:

- **Enquiries** → `Student Applicant`
- **Registrations** → Custom doctype (needs to be created)
- **Applications** → `Program Enrollment`
- **Students** → `Student`

## Creating Required DocTypes in Frappe

You may need to create custom fields in Frappe to match the dashboard's data model. The schema in `shared/schema.ts` defines all required fields.

## Troubleshooting

### "Unauthorized" errors
- Make sure Frappe server is running on port 8000
- Check if you can access `http://localhost:8000` in your browser
- Verify user has proper permissions in Frappe

### API errors
- Check browser console for detailed error messages
- Verify Frappe REST API is enabled in Frappe settings
- Check if the DocTypes exist in Frappe

### CORS errors
- Vite proxy should handle CORS
- If issues persist, check Frappe's CORS settings

## Development vs Production

### Development
- Uses Vite dev server with proxy
- Hot module replacement enabled
- API calls proxied to localhost:8000

### Production Build
```bash
npm run build
npm start
```

In production, you'll need to configure proper reverse proxy (nginx/apache) to route API calls to Frappe.

## Next Steps

1. Create custom Frappe DocTypes to match the dashboard schema
2. Add API whitelisted methods in Frappe for complex operations
3. Configure proper user roles and permissions in Frappe
4. Set up file upload handling for documents
5. Implement proper error handling and validation
