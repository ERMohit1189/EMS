# Local Development Setup with Cloud Database

This guide explains how to run your frontend from your local server while using the Neon cloud database.

## Architecture Overview

```
Your Local Computer
├── Frontend (React/Vite) → http://localhost:5173
├── Backend (Node.js/Express) → http://localhost:8888
└── Makes API calls to: http://localhost:8888

        ↓

Cloud Server (Neon PostgreSQL)
├── Database Host: ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech
├── Database: neondb
└── Region: AWS us-east-2
```

## Prerequisites

Make sure you have installed:
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL client tools (optional, for direct database access)

## Configuration Files

### 1. Backend Configuration (`.env`)

Located at: `D:\VendorRegistrationForm\.env`

```bash
# Database connection to Neon Cloud
DATABASE_URL=postgresql://neondb_owner:npg_YFXE1gOniq0D@ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require

# Development environment
NODE_ENV=development

# Session security
SESSION_SECRET=dev-session-secret-super-secure-change-in-production-12345

# Allow requests from local frontend
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8888,http://127.0.0.1:5173,http://127.0.0.1:8888

# Backend port
PORT=8888
```

### 2. Frontend Configuration (`.env.local`)

Located at: `D:\VendorRegistrationForm\.env.local`

```bash
# Frontend connects to local backend
VITE_API_URL=http://localhost:8888
```

### 3. API Configuration (`client/src/config/api.config.ts`)

Located at: `D:\VendorRegistrationForm\client\src\config\api.config.ts`

```typescript
export const API_CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:8888",
};
```

## Running the Application

### Step 1: Start the Backend Server

```bash
cd D:\VendorRegistrationForm
npm run dev
```

This will:
- Start the Express server on **http://localhost:8888**
- Connect to Neon cloud database
- Serve the API endpoints
- **Keep running in the background**

### Step 2: Start the Frontend Development Server (Optional)

In a new terminal:

```bash
cd D:\VendorRegistrationForm
npm run dev:client
```

Or if that command doesn't exist:

```bash
cd D:\VendorRegistrationForm/client
npm run dev
```

This will:
- Start Vite development server on **http://localhost:5173**
- Hot reload on file changes
- Proxy API calls to backend (http://localhost:8888)

### Step 3: Access Your Application

**Option 1: Using Frontend Dev Server (Recommended for Development)**
- Open: **http://localhost:5173**
- Fast hot reloading for frontend changes

**Option 2: Using Backend Only**
- Open: **http://localhost:8888**
- Backend serves compiled frontend
- Use for testing production build

## Monitoring Your Database

### View Database Status in Web UI

1. Start the application (see "Running the Application" above)
2. Log in to your account
3. Navigate to: **http://localhost:5173/database-status**
   (or **http://localhost:8888/database-status** if using backend)

This page shows:
- ✅ Connection status to Neon cloud
- 📊 Total number of tables (16)
- 📈 Total records in database (47+)
- 📋 Detailed row count for each table

### Access Database Directly (Optional)

If you have PostgreSQL tools installed:

```bash
# Using psql command line
psql "postgresql://neondb_owner:npg_YFXE1gOniq0D@ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# List tables
\dt

# Check row counts
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

## API Endpoints

### Database Status Endpoint

**Endpoint:** `GET /api/database-status`

**Response:**
```json
{
  "tables": [
    { "name": "departments", "rowCount": 5 },
    { "name": "employees", "rowCount": 4 },
    { "name": "vendors", "rowCount": 3 },
    ...
  ],
  "totalRows": 47,
  "connectionStatus": "Connected",
  "lastUpdated": "2024-12-04T10:30:00.000Z"
}
```

**Usage:**
```bash
curl http://localhost:8888/api/database-status
```

## Common Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend Dev Server | 5173 | http://localhost:5173 |
| Backend Server | 8888 | http://localhost:8888 |
| Database | 5432 | ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech |

## Database Tables

Your Neon cloud database contains 16 tables:

1. **app_settings** - Application configuration
2. **attendances** - Employee attendance records
3. **daily_allowances** - Daily allowance entries
4. **departments** - Department master
5. **designations** - Job designations
6. **employees** - Employee information
7. **export_headers** - Export configurations
8. **invoices** - Invoice records
9. **payment_masters** - Payment information
10. **purchase_orders** - PO records
11. **salary_structures** - Salary configurations
12. **sites** - Site/location information
13. **team_members** - Team composition
14. **teams** - Team master
15. **vendors** - Vendor information
16. **zones** - Geographic zones

Total records: **47+** (varies based on data)

## Troubleshooting

### Port Already in Use

If port 8888 is already in use:

```bash
# Find process using port 8888
netstat -ano | findstr :8888

# Kill the process (replace PID)
taskkill /PID 12345 /F

# Or change PORT in .env to another port like 9000
PORT=9000
```

### Cannot Connect to Database

Check:
1. Internet connection is working
2. `.env` has correct `DATABASE_URL`
3. Neon account is active
4. Database URL is not expired (renew if needed)

### Frontend Cannot Connect to Backend

Check:
1. Backend is running on port 8888
2. `ALLOWED_ORIGINS` in `.env` includes your frontend URL
3. Browser console for CORS errors
4. Check backend is serving on `http://localhost:8888`

### Database Status Page Shows "Connection Error"

This means:
1. Backend server is not running → Start it: `npm run dev`
2. Backend cannot reach Neon cloud → Check internet connection
3. Database credentials are invalid → Update `.env` with correct credentials

## Development Workflow

### 1. Making Frontend Changes

```bash
# Frontend changes auto-reload in dev server
# Edit files in client/src/*
# Changes appear in browser instantly
```

### 2. Making Backend Changes

```bash
# Backend changes require server restart
# Edit files in server/*
# Stop server (Ctrl+C) and run: npm run dev
```

### 3. Database Schema Changes

If you need to modify database schema:

```bash
# Database migrations should be done via your ORM/schema manager
# For Drizzle ORM (likely what's used):
npm run db:push
```

## Performance Tips

1. **Use the Database Status page** to monitor row counts
2. **Keep browser dev tools open** to see API response times
3. **Clear browser cache** if you see stale data
4. **Check backend logs** for any database errors
5. **Monitor Neon dashboard** for query performance

## Monitoring Database from CLI

### Check Row Counts

```bash
psql "postgresql://neondb_owner:npg_YFXE1gOniq0D@ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require" -c "
SELECT 'departments' as table_name, COUNT(*) as count FROM departments
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'vendors', COUNT(*) FROM vendors
-- ... repeat for all tables
"
```

### Backup Your Database

```bash
pg_dump "postgresql://neondb_owner:npg_YFXE1gOniq0D@ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require" > backup.sql
```

### Restore from Backup

```bash
psql "postgresql://neondb_owner:npg_YFXE1gOniq0D@ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require" < database_backup.sql
```

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Neon cloud connection | `postgresql://...` |
| `NODE_ENV` | Environment | `development` or `production` |
| `PORT` | Backend server port | `8888` |
| `SESSION_SECRET` | Session encryption key | (long random string) |
| `ALLOWED_ORIGINS` | CORS whitelist | `http://localhost:5173,...` |
| `VITE_API_URL` | Frontend API endpoint | `http://localhost:8888` |

## Next Steps

1. ✅ Run backend: `npm run dev`
2. ✅ Run frontend: `npm run dev` (in client folder)
3. ✅ Visit: http://localhost:5173
4. ✅ Check database: http://localhost:5173/database-status
5. ✅ Log in and test your application

---

**Last Updated:** December 4, 2024
**Status:** Production Ready
**Backend:** Express (Node.js)
**Frontend:** React + Vite
**Database:** Neon PostgreSQL (Cloud)
