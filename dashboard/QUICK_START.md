# Quick Reference Guide

## Starting the Application

### Option 1: Using the start script (Recommended)
```bash
cd /home/anushree/frappe-bench-education/apps/education/dashboard
./start.sh
```

### Option 2: Manual start

**Terminal 1 - Start Frappe:**
```bash
cd /home/anushree/frappe-bench-education
bench start
```

**Terminal 2 - Start Frontend:**
```bash
cd /home/anushree/frappe-bench-education/apps/education/dashboard
npm run dev
```

## Access Points

- **Frontend Dashboard**: http://localhost:5173
- **Frappe Backend**: http://localhost:8000
- **Frappe Desk**: http://localhost:8000/app

## Default Ports

- Frappe Backend: `8000`
- Frontend Dev Server: `5173`
- Express API Server: `5000` (embedded in dev server)

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Type checking
npm run check

# Install dependencies
npm install
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm start
```

## Login

Use your Frappe credentials:
- Username: Your Frappe user (e.g., Administrator)
- Password: Your Frappe password

## API Endpoints

All API calls are proxied through Vite to Frappe:

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Enquiries (Student Applicant)
- `GET /api/enquiries` - List all enquiries
- `POST /api/enquiries` - Create enquiry
- `PATCH /api/enquiries/:id` - Update enquiry

### Applications (Program Enrollment)
- `GET /api/applications` - List all applications
- `GET /api/applications/:id` - Get single application
- `POST /api/applications` - Create application
- `PATCH /api/applications/:id` - Update application

### Students
- `GET /api/students/search?id=STU001` - Search student by ID

## Environment Variables

Edit `.env` file to configure:

```env
FRAPPE_BACKEND_URL=http://localhost:8000
NODE_ENV=development
PORT=5173
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>
```

### Frappe Not Responding
```bash
# Check Frappe status
cd /home/anushree/frappe-bench-education
bench status

# Restart Frappe
bench restart
```

### Clear Cache
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### View Logs

**Frontend logs:**
- Check browser console (F12)
- Terminal where `npm run dev` is running

**Frappe logs:**
```bash
cd /home/anushree/frappe-bench-education
bench --site education.localhost logs
```

## Project Structure

```
dashboard/
├── src/                # React frontend code
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom hooks
│   └── lib/           # Utilities
├── server/            # Express backend
│   ├── index.ts       # Server entry point
│   ├── routes.ts      # API routes
│   └── db.ts          # Frappe API client
├── shared/            # Shared types
│   └── schema.ts      # Zod schemas & types
├── public/            # Static assets
├── .env               # Environment config
├── package.json       # Dependencies
├── vite.config.ts     # Vite configuration
└── tsconfig.json      # TypeScript config
```

## Development Workflow

1. Start Frappe backend
2. Start frontend dev server
3. Make changes to code
4. Browser auto-refreshes (HMR)
5. Test functionality
6. Commit changes

## Important Notes

- Always start Frappe before the frontend
- The frontend proxies API calls to Frappe
- Changes to server code require restart
- Changes to React code auto-reload
- TypeScript is compiled on-the-fly

## Getting Help

- Check browser console for errors
- Check terminal output for server errors
- Review Frappe logs for backend issues
- See MIGRATION_SUMMARY.md for detailed changes
- See README_SETUP.md for setup instructions
