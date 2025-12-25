# Schema Changes - shared/schema.ts

## Changes Required

### 1. ADD vendorPasswordOtps TABLE DEFINITION (after invoices table, around line 382)

**LOCATION**: After the invoices table closing brace (line 381) and before the Payment Master comment

**ADD THIS CODE:**

```typescript
// Vendor Password OTP Table - For OTP-based password reset
export const vendorPasswordOtps = pgTable("vendor_password_otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  email: varchar("email").notNull(),
  otpHash: varchar("otp_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxEmail: index("idx_vendor_otp_email").on(table.email),
  idxVendorId: index("idx_vendor_otp_vendor_id").on(table.vendorId),
  idxExpiresAt: index("idx_vendor_otp_expires_at").on(table.expiresAt),
}));
```

### 2. UPDATE invoices TABLE (around line 354)

Add the `poIds` column after the `poId` column (line 360-362):

**BEFORE:**
```typescript
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  poId: varchar("po_id")
    .notNull()
    .references(() => purchaseOrders.id),
  invoiceDate: date("invoice_date").notNull(),
  // ... rest of fields
```

**AFTER:**
```typescript
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id),
  poId: varchar("po_id")
    .notNull()
    .references(() => purchaseOrders.id),
  poIds: varchar("po_ids").array().default(sql`ARRAY[]::varchar[]`), // Support for multiple POs in single invoice
  invoiceDate: date("invoice_date").notNull(),
  // ... rest of fields
```

## Summary

- ✅ Added vendorPasswordOtps table definition (supports OTP password reset)
- ✅ Added poIds column to invoices table (supports multiple POs per invoice)
- ✅ Proper indexes for performance
- ✅ Type-safe column definitions
- ✅ Default values and constraints

## TypeScript Types

After adding these definitions, TypeScript will automatically generate types:

```typescript
type VendorPasswordOtp = typeof vendorPasswordOtps.$inferSelect;
type InsertVendorPasswordOtp = typeof vendorPasswordOtps.$inferInsert;
```

These can be used in your API responses and request bodies for type safety.
