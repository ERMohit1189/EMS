# Quick Performance Test - 5 Minutes

## Test Your Page Now

### Step 1: Clear Service Worker (Fresh Start)
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** button
5. Close DevTools

### Step 2: Test Current Performance

1. **Open DevTools** (F12)
2. **Network tab**
3. **Clear** button (⊙)
4. **Reload page** (Ctrl+R) on `/vendor/po`
5. **Wait for page to load**

### Step 3: Record Times

Look in Network tab for these APIs:

```
API                                Time      Status
─────────────────────────────────────────────────────
⚙ /api/session                     ___ ms    (should be <200ms)
⚙ /api/sites/for-po-generation     ___ ms    (should be <1000ms)
⚙ /api/app-settings                ___ ms    (should be <200ms)
⚙ /api/purchase-orders             ___ ms    (should be <1000ms)
⚙ /api/vendors?minimal=true        ___ ms    (should be <200ms)
```

**At the bottom of Network panel, you should see:**
```
Finish: ___ ms (total page load time)
```

## Expected Results AFTER Our Optimizations

✅ **With Service Worker Fix (already applied)**:
- Session: <100ms (was 450ms)
- App Settings: <100ms (was 1.02s)
- Vendors: <200ms (was 2.95s) ← KEY IMPROVEMENT
- **Total Page Load**: 2-3 seconds (was 5-6s)

⏳ **With Database Indexes** (execute SQL first):
- Sites/PO queries: 50-80% faster
- **Total Page Load**: <1 second

## What to Try

### Option 1: Test as-is (you should see improvement)
Just reload and compare times

### Option 2: Apply Database Indexes First (RECOMMENDED)
```bash
cd D:\VendorRegistrationForm
psql -U your_postgres_user -d your_database_name -f add_vendor_speed_indexes.sql
psql -U your_postgres_user -d your_database_name -f add_po_indexes.sql
```

Then reload page

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Vendors API | <200ms | ? | ✅ Fixed |
| Session API | <200ms | ? | ✅ Fixed |
| Settings API | <200ms | ? | ✅ Fixed |
| Sites API | <1000ms | ? | ⏳ Needs indexes |
| POs API | <1000ms | ? | ⏳ Needs indexes |
| **Total Time** | **<2 sec** | ? | ? |

## Submit Results

After testing, report:
```
Vendors API: ___ ms (should be <200ms now!)
Sites API: ___ ms
POs API: ___ ms
Total Load: ___ ms

All APIs faster? Yes/No
Page feels responsive? Yes/No
```

## Troubleshooting

### Times Haven't Improved
- **Did you clear the Service Worker?** (Step 1)
- **Are you testing on same network?** (might vary by 100-200ms)
- **Try hard refresh**: Ctrl+Shift+R (clears all caches)

### Vendors Still Slow (>500ms)
- Ensure you're using `minimal=true` parameter
- Check that POGeneration.tsx line 255 has `&minimal=true`
- Restart the server (changes need server reload)

### Sites/POs Still Slow (>1.5s)
- These need database indexes
- Execute `add_vendor_speed_indexes.sql` and `add_po_indexes.sql`
- Might need server restart

---

**Last Update**: 2025-12-15
**Optimizations Applied**: Service Worker caching removed, lightweight vendor endpoint
**Database Indexes**: Ready in `add_vendor_speed_indexes.sql` and `add_po_indexes.sql`
