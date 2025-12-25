# Step-by-Step: Check API Times in DevTools (With Screenshots Guide)

## 🎯 Goal
Find out exactly how long each API takes to respond so we can identify performance bottlenecks.

---

## 📋 STEP 1: Open Browser DevTools

### Windows/Linux Users:
```
Press: F12
  or
Press: Ctrl + Shift + I
  or
Right-click on page → Click "Inspect"
```

### Mac Users:
```
Press: Cmd + Option + I
  or
Right-click on page → Click "Inspect"
```

**Result:** A panel opens at the bottom or side of your browser

---

## 📋 STEP 2: Click on "Network" Tab

Look for these tabs at the top of DevTools:
```
┌─────────────────────────────────────────────────────────────┐
│ Elements  Console  Sources  Network  Performance  ... │
│                                ↑↑↑                          │
│                          Click here!                        │
└─────────────────────────────────────────────────────────────┘
```

**Result:** The Network tab opens and is now active

---

## 📋 STEP 3: Clear Any Previous Requests

Look for these buttons in the top-left of the Network panel:

```
┌──────────────────────────────────────────────────────┐
│  ⊙    ⟳    ⊘    Filter    Preserve log  │
│  ↑    ↑    ↑                                        │
│  │    │    └─ Disable cache (recommended)          │
│  │    └─ Reload button                             │
│  └─ Clear button (click this first!)               │
└──────────────────────────────────────────────────────┘
```

**ACTION:** Click the **⊙ (circle)** button to clear requests

**Result:** The list of previous requests disappears

---

## 📋 STEP 4: Reload the Page

Do ONE of these:
- Press **F5** (reload)
- Press **Ctrl + R** (reload)
- Click the **⟳** (reload) button in DevTools
- Or just refresh the page normally

**Important:** Make sure the Network tab is open BEFORE reloading!

---

## 📋 STEP 5: Wait for Page to Load Completely

Watch the Network panel as requests appear:

```
As the page loads, you'll see requests appear like this:

Name                              Status  Time
document (page)                   200     45 ms
style.css                         200     123 ms
main.js                           200     234 ms
/api/session                      200     156 ms  ← API CALL
/api/sites/for-po-generation      200     ... (loading)
```

**Wait** until:
- The page is fully loaded
- No more requests are appearing
- Usually 2-5 seconds total

---

## 📋 STEP 6: Find the API Calls

Scroll down in the Network panel and look for requests that start with `/api/`:

```
Name                                    Status  Type  Time
────────────────────────────────────────────────────────────
(other requests like CSS, JS)
────────────────────────────────────────────────────────────
/api/session                            200     xhr   156 ms
/api/sites/for-po-generation            200     xhr   478 ms
/api/app-settings                       200     xhr    84 ms
/api/purchase-orders                    200     xhr   612 ms
/api/vendors                            200     xhr  1542 ms
```

**Write down the times you see!**

---

## 📊 STEP 7: View Detailed Timing for Each API

To see the detailed breakdown of WHERE the time is spent:

1. **Click on one API request** (e.g., `/api/sites/for-po-generation`)

```
Click here:
Name                          Status  Type  Time
/api/sites/for-po-generation  200     xhr   478 ms ← CLICK
```

2. **A panel opens on the right side:**

```
┌────────────────────────────────────────────┐
│ /api/sites/for-po-generation               │
├────────────────────────────────────────────┤
│ Headers  Cookies  Request  Response Timing │
│                                         ↑  │
│                               Click this!  │
└────────────────────────────────────────────┘
```

3. **Click on the "Timing" tab** to see the breakdown

---

## 📊 STEP 8: Read the Timing Breakdown

After clicking "Timing", you'll see something like:

```
┌─────────────────────────────────────────────────────┐
│ Timing Information                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Queueing:              12 ms                       │
│ Stalled:               8 ms                        │
│ DNS lookup:            0 ms                        │
│ Initial connection:    0 ms                        │
│ SSL/TLS:               0 ms                        │
│ Request sent:          2 ms                        │
│ Waiting (TTFB):       445 ms    ⭐ MOST IMPORTANT │
│ Content Download:     11 ms                        │
│ ────────────────────────                          │
│ TOTAL TIME:          478 ms                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Most Important: "Waiting (TTFB)"
This shows **how long the server took** to process and respond:
- **445 ms** = Server took 445 milliseconds
- If this is very high (> 1 second), the server is slow
- If this is low (< 500ms), the server is fast ✅

---

## 🎯 STEP 9: Repeat for All APIs

Do STEPS 7-8 for each API:
- [ ] `/api/session`
- [ ] `/api/sites/for-po-generation`
- [ ] `/api/app-settings`
- [ ] `/api/purchase-orders`
- [ ] `/api/vendors`

**Write down the "Time" column values:**

```
API                              Time    Waiting (TTFB)
─────────────────────────────────────────────────────
/api/session                     156 ms  150 ms
/api/sites/for-po-generation     478 ms  445 ms
/api/app-settings                 84 ms   80 ms
/api/purchase-orders             612 ms  600 ms
/api/vendors                    1542 ms 1400 ms
─────────────────────────────────────────────────────
TOTAL:                          2872 ms
TIME TO INTERACTIVE (blocking): ~1300 ms
```

---

## 📈 STEP 10: Calculate Total Load Time

Look at the very bottom of the Network panel:

```
┌─────────────────────────────────────────────┐
│  Requests: 25   Transferred: 1.2 MB         │
│  Resources: 1.5 MB   Finish: 2847 ms   ← THIS │
│  DOMContentLoaded: 634 ms                   │
│  Load: 2847 ms                              │
└─────────────────────────────────────────────┘
```

**"Finish: 2847 ms"** = Total time for page to fully load

Or look at the bottom-right of the waterfall:
```
Timeline (seconds):
0 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3
The rightmost request shows when page finishes
```

---

## 🎨 STEP 11 (Optional): View Waterfall Chart

The Network panel shows a visual timeline:

```
Name                              │ Timeline (visual)
──────────────────────────────────┼─────────────────────────
/api/session                      │█ (156 ms)
/api/sites/for-po-generation      │████████ (478 ms)
/api/app-settings                 │█ (84 ms)
/api/purchase-orders              │██████████ (612 ms)
/api/vendors                      │████████████████ (1542 ms)
                                  │
                                  0 ─ 500 ─ 1000 ─ 1500ms
```

**Longer bars = slower APIs**

---

## 📝 SUMMARY: What to Record

After completing the steps above, you should have:

```
═════════════════════════════════════════════════════════
                  TEST RESULTS
═════════════════════════════════════════════════════════

Test Date: ____________
Browser: Chrome / Firefox / Safari (circle one)
Network: WiFi / 4G / Cable (circle one)

API RESPONSE TIMES:
┌─────────────────────────────────────────┬────────┐
│ API Endpoint                            │ Time   │
├─────────────────────────────────────────┼────────┤
│ /api/session                            │ ___ ms │
│ /api/sites/for-po-generation            │ ___ ms │
│ /api/app-settings                       │ ___ ms │
│ /api/purchase-orders                    │ ___ ms │
│ /api/vendors                            │ ___ ms │
├─────────────────────────────────────────┼────────┤
│ TOTAL TIME TO INTERACTIVE               │ ___ ms │
│ PAGE FULLY LOADED (Finish)              │ ___ ms │
└─────────────────────────────────────────┴────────┘

ANALYSIS:
✅ / ⚠️  / ❌  Are the times good or bad?
  (Check against targets below)

═════════════════════════════════════════════════════════
```

---

## ✅ Performance Targets (What's "Good")

Compare your times with these targets:

```
🟢 EXCELLENT (< 500ms):
  └─ /api/app-settings ✅

🟡 GOOD (500-1000ms):
  └─ /api/sites/for-po-generation
  └─ /api/purchase-orders

🔴 ACCEPTABLE (1000-2000ms):
  └─ /api/vendors (if loading in background)

🟢 OVERALL TARGETS:
  ├─ Time to Interactive: < 1.5 seconds ✅
  └─ Total Load Time: < 2.5 seconds ✅
```

---

## 🎯 Comparison: Before vs After Optimization

### BEFORE (What You Might See Currently):
```
/api/sites/for-po-generation:   2000+ ms ❌ SLOW
/api/purchase-orders:            1500+ ms ❌ SLOW
/api/vendors:                     1500+ ms ❌ BLOCKS PAGE
────────────────────────────────────────────────────
TIME TO INTERACTIVE:             5+ seconds ❌ TOO SLOW
```

### AFTER (What You Should See After Fixes):
```
/api/sites/for-po-generation:     450 ms ✅ FAST
/api/purchase-orders:             600 ms ✅ FAST
/api/vendors:                   1500 ms ⏳ (background)
────────────────────────────────────────────────────
TIME TO INTERACTIVE:             1-2 seconds ✅ GOOD
```

---

## 💡 Pro Tips

### Tip 1: Test Multiple Times
Different network conditions give different results:
- Test on WiFi
- Test on mobile data
- Test with "Slow 3G" throttling (see step below)

### Tip 2: Disable Cache
For accurate testing, disable browser cache:
```
In Network tab, click the ⊘ button before reloading
```

### Tip 3: Simulate Slow Network
To see how it performs on slow connections:

1. Find the throttling dropdown (usually says "No throttling")
2. Select "Slow 3G" or "Fast 3G"
3. Reload the page
4. Check times

```
Throttling Dropdown:
No throttling ▼
├─ No throttling
├─ Fast 3G
├─ Slow 3G    ← Select this to test on slow networks
└─ Offline
```

### Tip 4: Filter to See Only APIs
In the filter box, type `/api/` to show only API calls:

```
Filter: /api/  ← Type this
```

This hides CSS, JavaScript, images, etc.

---

## ❓ FAQ

### Q: Why is my API time so high?
**A:** Check the "Waiting (TTFB)" column - if that's high, the server is slow.

### Q: The page loads but feels slow anyway?
**A:** Check the "Performance" tab in DevTools to see if JavaScript rendering is slow.

### Q: Should all APIs load at the same time?
**A:** No! Some should load in parallel (together), some should load in sequence.

### Q: What if I see red numbers?
**A:** Red = slow (> 1000ms). This is the API that needs optimization.

### Q: Why does it load differently each time?
**A:** Network conditions vary. Test multiple times and average the results.

---

## 📋 Final Checklist

Before reporting results, make sure you:

- [ ] Opened DevTools (F12)
- [ ] Clicked Network tab
- [ ] Cleared previous requests (⊙ button)
- [ ] Reloaded the page
- [ ] Waited for page to fully load
- [ ] Found all /api/ requests
- [ ] Recorded the Time for each API
- [ ] Checked the detailed Timing for at least one API
- [ ] Calculated total load time
- [ ] Compared with performance targets
- [ ] Filled out the test results template

---

## 🚀 Next Steps

1. Run this test now
2. Write down your results
3. Apply database indexes (see `add_po_indexes.sql`)
4. Run the test again
5. Compare the before/after results
6. Report the improvements!

---

## 📞 Example Report

When you're done testing, report something like this:

```
BEFORE OPTIMIZATION:
- Time to Interactive: 5.2 seconds ❌
- /api/sites: 2100 ms
- /api/purchase-orders: 1800 ms
- /api/vendors: 1500 ms (blocking page)

AFTER OPTIMIZATION:
- Time to Interactive: 1.1 seconds ✅
- /api/sites: 478 ms
- /api/purchase-orders: 612 ms
- /api/vendors: 1542 ms (background)

IMPROVEMENT: 80% faster! 🎉
```

This makes it easy to see if the optimizations are working!
