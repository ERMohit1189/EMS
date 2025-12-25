# Date Format Support in Excel Import

## Supported Date Formats

The Excel import now supports multiple date formats automatically:

### 1. **Excel Serial Numbers** (Numeric)
- When Excel exports dates as numbers
- Examples: `44000`, `45321`
- Automatically converted to ISO format

### 2. **DD-MMM-YYYY** ⭐ **Most Common**
- Format: Day-Month(text)-Year
- Examples:
  - `15-Mar-2025`
  - `08-Nov-2022`
  - `29-Jan-2023`
  - `31-May-2024`
- **This is what your current data uses**

### 3. **YYYY-MM-DD** (ISO Format)
- Format: Year-Month-Day
- Examples:
  - `2025-03-15`
  - `2022-11-08`
  - `2023-01-29`
- Already in correct format, passed through as-is

### 4. **DD/MM/YYYY** (European)
- Format: Day/Month/Year
- Examples:
  - `15/03/2025`
  - `08/11/2022`
  - `29/01/2023`

### 5. **MM/DD/YYYY** (US)
- Format: Month/Day/Year
- Examples:
  - `03/15/2025`
  - `11/08/2022`
  - `01/29/2023`
- Auto-detection: if first number > 12, assumes DD/MM instead

### 6. **JavaScript Date Strings** (Fallback)
- Any string that JavaScript's `Date` constructor can parse
- Examples:
  - `March 15, 2025`
  - `15 March 2025`
  - `2025-03-15T00:00:00Z`

## Conversion Result

All dates are converted to **ISO 8601 format**: `YYYY-MM-DD`

| Input Format | Example | Output |
|---|---|---|
| Excel Serial | 45357 | 2024-03-15 |
| DD-MMM-YYYY | 15-Mar-2025 | 2025-03-15 |
| YYYY-MM-DD | 2025-03-15 | 2025-03-15 |
| DD/MM/YYYY | 15/03/2025 | 2025-03-15 |
| MM/DD/YYYY | 03/15/2025 | 2025-03-15 |

## Important Notes

### Null/Empty Values
- Empty cells are converted to `null` (not inserted)
- `null` cells are acceptable for all date fields
- Only required fields like `siteId`, `vendorId`, `planId` cannot be null

### Date Validation
- Dates are NOT validated for future/past
- Dates are NOT validated for logical sequence
- Invalid date strings return `null`

### Ambiguous Formats (DD/MM/YYYY vs MM/DD/YYYY)
For formats like `05/03/2025`:
- If first number > 12: Assumes `DD/MM/YYYY` → `2025-03-05`
- If first number ≤ 12: Assumes `MM/DD/YYYY` → `2025-05-03` (American)
- **Best practice**: Use unambiguous formats (DD-MMM-YYYY or YYYY-MM-DD)

## Code Location

File: `client/src/pages/vendor/ExcelImport.tsx`
Function: `excelDateToISO` (Lines 197-266)

## Changes Made (2025-12-13)

- Added support for DD-MMM-YYYY format ✅
- Added support for DD/MM/YYYY and MM/DD/YYYY formats ✅
- Improved date parsing robustness ✅
- Added proper month name mapping (Jan-Dec) ✅
- Added JavaScript Date parsing as fallback ✅

## Testing

To verify date parsing works correctly:

1. Check browser console during import
2. Look for `[ExcelImport] First site in batch:` message
3. Verify date fields like `srDateSiteA`, `moDateSiteA` are in YYYY-MM-DD format
4. Example: `"srDateSiteA": "2025-03-15"` ✅

## Future Improvements

- Add date range validation (e.g., prevent future dates)
- Add date sequence validation (e.g., start date before end date)
- Support for more regional date formats
- Add warning for dates that seem invalid (e.g., year > 2100)
