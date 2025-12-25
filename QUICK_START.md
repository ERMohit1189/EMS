# Quick Start Guide - Local Development with Cloud Database

**Application:** Enterprise Operations Management System (EOMS)
**Design and Developed by:** Quantum AI Innovation

## 🚀 Get Started in 2 Minutes

### Prerequisites
- Node.js installed
- npm available in terminal

### Step 1: Start Backend (Terminal 1)

```bash
cd D:\VendorRegistrationForm
npm run dev
```

**Expected Output:**
```
serving on port 8888
[INFO] Express server started
```

### Step 2: Start Frontend (Terminal 2)

```bash
cd D:\VendorRegistrationForm
npm run dev
```

Or if separate client folder:
```bash
cd D:\VendorRegistrationForm\client
npm run dev
```

**Expected Output:**
```
Local:   http://localhost:5173/
```

### Step 3: Open Application

Go to: **http://localhost:5173**

That's it! 🎉

---

## 📊 View Your Database

After logging in, visit: **http://localhost:5173/database-status**

You'll see:
- ✅ Database connection status
- 📈 Total records: 47+
- 📋 All 16 tables with row counts

---

## 🔧 Architecture

```
Frontend (React)           Backend (Express)         Database (Neon)
http://localhost:5173  →  http://localhost:8888  →  Cloud PostgreSQL
       ↓                         ↓
    Vite Dev                API Routes            Connected to:
    Server                                        neon.tech
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `.env` | Backend config (database URL, ports) |
| `.env.local` | Frontend config (API base URL) |
| `client/src/config/api.config.ts` | API connection settings |
| `server/routes.ts` | Backend endpoints (added database-status) |
| `client/src/pages/DatabaseStatus.tsx` | Database monitoring UI |

---

## 🌐 Access Points

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Frontend application |
| http://localhost:8888 | Backend API |
| http://localhost:8888/api/database-status | Database status API |
| http://localhost:5173/database-status | Database status UI |

---

## 📊 Database Info

**Host:** Neon Cloud (AWS us-east-2)
**URL:** ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech
**Database:** neondb
**Tables:** 16
**Records:** 47+

---

## ⚡ Ports Used

- **5173** - Vite frontend dev server
- **8888** - Express backend server
- **5432** - PostgreSQL (cloud, not local)

---

## ✅ What Works Now

✅ Frontend runs locally (http://localhost:5173)
✅ Backend runs locally (http://localhost:8888)
✅ Both connect to Neon cloud database
✅ Database status dashboard available
✅ All 16 tables synced and accessible
✅ 47+ records restored and ready

---

## 🔍 Troubleshooting

### Backend won't start
- Check port 8888 is free
- Verify `.env` DATABASE_URL is correct

### Frontend won't load
- Check port 5173 is free
- Backend must be running first

### No database connection
- Check internet connection
- Verify DATABASE_URL in `.env`

---

## 📚 More Info

For detailed setup, see: **LOCAL_DEVELOPMENT_GUIDE.md**

---

**Ready?** Start with Step 1 above! 🚀
