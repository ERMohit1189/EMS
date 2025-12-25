# Frontend Changes - client/src/pages/vendor/InvoiceGeneration.tsx

## Summary of Changes

This file has been modified to support:
1. **Generating single invoice per PO** (default behavior)
2. **Generating single consolidated invoice for multiple POs** (new feature)

All changes have been successfully applied to the file.

---

## 1. Added State (Line 65)

```typescript
const [groupByVendor, setGroupByVendor] = useState<boolean>(false);
```

This state tracks whether to group invoices by vendor or create one per PO.

---

## 2. Updated generateInvoices() Function (Lines 479-661)

### Old Logic
- Always created one invoice per selected PO
- Simple iteration through POs

### New Logic
**Option A: Default (groupByVendor = false)**
- Creates one invoice per PO
- Same behavior as before

**Option B: Grouped (groupByVendor = true)**
- Groups all selected POs by vendor
- Creates one consolidated invoice per vendor
- Combines amounts, GST, descriptions
- Shows all PO numbers in single invoice

### Key Changes in Function

#### Step 1: Group POs by Vendor
```typescript
if (groupByVendor) {
  const byVendor: Record<string, typeof posData> = {};
  posData.forEach(po => {
    const vendorId = String(po.vendorId);
    if (!byVendor[vendorId]) {
      byVendor[vendorId] = [];
    }
    byVendor[vendorId].push(po);
  });
  // ... rest of grouped logic
}
```

#### Step 2: Calculate Combined Totals
```typescript
let totalAmount = 0;
let totalGst = 0;
vendorPOs.forEach(po => {
  const gstAmount = (parseFloat(po.cgstAmount || 0) || 0) +
                   (parseFloat(po.sgstAmount || 0) || 0) +
                   (parseFloat(po.igstAmount || 0) || 0);
  totalAmount += parseFloat(po.totalAmount.toString());
  totalGst += gstAmount;
});
const finalTotal = totalAmount + totalGst;
```

#### Step 3: Create Invoice with Multiple POs
```typescript
const response = await fetch(`${getApiBaseUrl()}/api/invoices`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: 'include',
  body: JSON.stringify({
    invoiceNumber: record.invoiceNumber,
    vendorId: firstPO.vendorId,
    poId: poIds[0],           // First PO for backward compatibility
    poIds: poIds,             // All PO IDs for consolidated invoice
    invoiceDate: record.invoiceDate,
    dueDate: record.invoiceDueDate,
    amount: totalAmount.toString(),
    gst: totalGst.toString(),
    totalAmount: finalTotal.toString(),
    status: "Draft",
  }),
});
```

---

## 3. Added UI Toggle (Lines 735-751)

**Location**: In the CardContent, after vendor filter section

**Styling**: Blue highlighted box with checkbox

```typescript
{/* Invoice Grouping Option */}
<div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
  <input
    type="checkbox"
    id="groupByVendor"
    checked={groupByVendor}
    onChange={(e) => setGroupByVendor(e.target.checked)}
    className="w-4 h-4 rounded cursor-pointer"
  />
  <label htmlFor="groupByVendor" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
    Generate Single Invoice for Each Vendor (Group Multiple POs)
  </label>
  <span className="text-xs text-slate-500">
    {groupByVendor ? 'Enabled' : 'Disabled'}
  </span>
</div>
```

### User Experience
- ✅ Clear label explaining what the toggle does
- ✅ Visual indicator (blue box) to make it stand out
- ✅ Status indicator (Enabled/Disabled)
- ✅ Easy to toggle on/off

---

## 4. Updated PDF Generation (Lines 324-354)

### Old Code
```typescript
doc.text("PURCHASE ORDER", col2X, rightYPos);
rightYPos += 5;
doc.setFontSize(9);
doc.setTextColor(...darkGray);
doc.text(`PO #: ${String(invoice.poNumber)}`, col2X, rightYPos);
rightYPos += 4;
doc.text(`PO Date: ${String(invoice.poDate)}`, col2X, rightYPos);
```

### New Code
```typescript
doc.text("PURCHASE ORDER(S)", col2X, rightYPos);
rightYPos += 5;

doc.setFontSize(9);
doc.setTextColor(...darkGray);

// Handle multiple POs (when grouped by vendor)
const poNumbers = String(invoice.poNumber).includes(", ")
  ? String(invoice.poNumber).split(", ")
  : [String(invoice.poNumber)];

if (poNumbers.length > 1) {
  doc.text(`PO #(s): (${poNumbers.length} POs)`, col2X, rightYPos);
  rightYPos += 4;
  // Show truncated list of POs
  const displayPOs = poNumbers.slice(0, 3).join(", ") +
                     (poNumbers.length > 3 ? `... +${poNumbers.length - 3} more` : "");
  const poLines = doc.splitTextToSize(displayPOs, pageWidth / 2 - margin - 5);
  doc.text(poLines, col2X, rightYPos);
  rightYPos += poLines.length * 4;
} else {
  doc.text(`PO #: ${String(invoice.poNumber)}`, col2X, rightYPos);
  rightYPos += 4;
}

doc.text(`PO Date: ${String(invoice.poDate)}`, col2X, rightYPos);
```

### PDF Improvements
- ✅ Shows "PURCHASE ORDER(S)" when multiple
- ✅ Displays count of POs: "(3 POs)"
- ✅ Shows first 3 POs explicitly
- ✅ Shows "... +2 more" if more than 3
- ✅ Text wrapping for long lists
- ✅ Maintains formatting and layout

---

## 5. How It Works - User Perspective

### Default Mode (No Grouping)
```
User selects: PO-001, PO-002, PO-003 (same vendor or different)
Toggle: OFF
Result: 3 invoices created
├─ INV-001 (PO-001)
├─ INV-002 (PO-002)
└─ INV-003 (PO-003)
```

### Grouped Mode
```
User selects: PO-001, PO-002 (Vendor A), PO-003 (Vendor B)
Toggle: ON (Group Multiple POs)
Result: 2 invoices created
├─ INV-001 (Vendor A, PO-001 + PO-002)
│  - Amount: Sum of both POs
│  - GST: Combined from both POs
│  - PO Numbers: "PO-001, PO-002"
│
└─ INV-002 (Vendor B, PO-003)
   - Amount: Single PO amount
   - GST: Single PO GST
   - PO Numbers: "PO-003"
```

---

## 6. Invoice Record Structure

### Single PO Invoice
```typescript
{
  poNumber: "PO-001",
  amount: "10000.00",
  gst: "1800.00",
  totalAmount: "11800.00",
  quantity: 1,
  unitPrice: "10000.00"
}
```

### Multiple PO Invoice (Grouped)
```typescript
{
  poNumber: "PO-001, PO-002, PO-003",  // All PO numbers
  amount: "30000.00",                   // Combined amount
  gst: "5400.00",                       // Combined GST
  totalAmount: "35400.00",              // Combined total
  quantity: 3,                          // Sum of quantities
  unitPrice: "0",                       // Not applicable
  siteName: "Site1, Site2, Site3",      // Combined sites
  description: "desc1; desc2; desc3"   // Combined descriptions
}
```

---

## 7. Testing Checklist

### Test Single Invoice (Default Mode)
- [ ] Select 1 PO, toggle OFF, generate → 1 invoice
- [ ] Select 3 POs, toggle OFF, generate → 3 invoices
- [ ] Download PDF → PO number shows correctly
- [ ] Print PDF → Prints correctly

### Test Grouped Invoices (New Mode)
- [ ] Select 2 POs (same vendor), toggle ON → 1 invoice
- [ ] Select 4 POs (2 vendors), toggle ON → 2 invoices
- [ ] Download PDF → Shows all PO numbers
- [ ] Print PDF → Shows all PO numbers with count
- [ ] PDF > 3 POs → Shows "... +N more"

### Test Edge Cases
- [ ] Toggle while POs selected → Works
- [ ] Change selection while toggle ON → Works
- [ ] Mix of single and multiple PO selections → Works
- [ ] Empty selection with toggle ON → Shows error

---

## 8. Performance Notes

- No new API endpoints needed
- Existing `/api/invoices` supports multiple poIds
- All grouping done on frontend
- No performance impact

---

## 9. Database Support

The backend automatically supports multiple POs:
- ✅ `poIds` column stores array of PO IDs
- ✅ `poId` stores first PO for backward compatibility
- ✅ All existing queries still work
- ✅ No database schema changes needed (already done)

---

## Files Modified
- ✅ `client/src/pages/vendor/InvoiceGeneration.tsx`

All changes are complete and ready to use!
