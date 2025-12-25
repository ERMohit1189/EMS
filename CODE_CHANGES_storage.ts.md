# Storage Layer Changes - server/storage.ts

## Changes Required

### 1. ADD TO IMPORTS (around line 3-22)

Add `vendorPasswordOtps` to the import statement:

```typescript
import {
  vendors,
  sites,
  employees,
  departments,
  designations,
  salaryStructures,
  purchaseOrders,
  purchaseOrderLines,
  invoices,
  vendorPasswordOtps,  // ADD THIS LINE
  paymentMasters,
  vendorRates,
  zones,
  exportHeaders,
  attendances,
  dailyAllowances,
  leaveRequests,
  teams,
  teamMembers,
  appSettings,
  // ... rest of imports
}
```

### 2. REPLACE createVendorPasswordOTP FUNCTION (around line 1918)

**REMOVE THIS:**
```typescript
async createVendorPasswordOTP(vendorId: string | null, email: string, otpHash: string, expiresAt: Date) {
  try {
    const [inserted] = await db.insert(sql`vendor_password_otps`).values({ vendor_id: vendorId, email, otp_hash: otpHash, expires_at: expiresAt, used: false }).returning();
    return inserted;
  } catch (err: any) {
    console.error('[Storage] createVendorPasswordOTP error', { error: err.message });
    throw err;
  }
}
```

**ADD THIS:**
```typescript
async createVendorPasswordOTP(vendorId: string | null, email: string, otpHash: string, expiresAt: Date) {
  try {
    if (!email || typeof email !== 'string') {
      throw new Error('Valid email is required');
    }

    const result = await db.insert(vendorPasswordOtps).values({
      vendorId,
      email,
      otpHash,
      expiresAt,
      used: false,
      attempts: 0,
    }).returning();

    if (!result || result.length === 0) {
      console.error('[Storage] createVendorPasswordOTP: No record returned after insert', { email, vendorId });
      throw new Error('Failed to create OTP record in database');
    }

    const inserted = result[0];
    if (!inserted || !inserted.id) {
      console.error('[Storage] createVendorPasswordOTP: Inserted record has no ID', { inserted });
      throw new Error('OTP record created but missing ID');
    }

    console.log('[Storage] OTP record created successfully:', { id: inserted.id, email, vendorId });
    return inserted;
  } catch (err: any) {
    console.error('[Storage] createVendorPasswordOTP error', {
      error: err.message,
      email,
      vendorId,
      stack: err.stack
    });
    throw err;
  }
}
```

### 3. REPLACE findValidOTPByEmail FUNCTION (around line 1928)

**REMOVE THIS:**
```typescript
async findValidOTPByEmail(email: string) {
  const rows = await db.select().from(sql`vendor_password_otps`).where(sql`email = ${email} AND used = false AND expires_at > now()`).orderBy(sql`created_at DESC`).limit(1);
  return rows[0] || null;
}
```

**ADD THIS:**
```typescript
async findValidOTPByEmail(email: string) {
  const rows = await db
    .select()
    .from(vendorPasswordOtps)
    .where(and(
      eq(vendorPasswordOtps.email, email),
      eq(vendorPasswordOtps.used, false),
      gt(vendorPasswordOtps.expiresAt, new Date())
    ))
    .orderBy(desc(vendorPasswordOtps.createdAt))
    .limit(1);
  return rows[0] || null;
}
```

### 4. REPLACE markOtpUsed FUNCTION (around line 1933)

**REMOVE THIS:**
```typescript
async markOtpUsed(id: string) {
  return await db.update(sql`vendor_password_otps`).set({ used: true }).where(sql`id = ${id}`);
}
```

**ADD THIS:**
```typescript
async markOtpUsed(id: string) {
  return await db
    .update(vendorPasswordOtps)
    .set({ used: true })
    .where(eq(vendorPasswordOtps.id, id));
}
```

## Notes

- All three functions now use the proper `vendorPasswordOtps` table from schema
- Drizzle ORM will generate correct SQL automatically
- Much better type safety and validation
- Proper error handling with detailed logs
