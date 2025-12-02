# Error Codes Documentation
**Last Updated**: November 15, 2025

This document lists all error codes used in the application for debugging and troubleshooting.

---

## Firestore Errors (ERR_FIRESTORE_XXX)

### ERR_FIRESTORE_001
**Location**: `src/lib/firestore.ts` - `searchCamps()` function  
**Description**: Firestore is not initialized  
**Cause**: Firebase configuration is missing or incorrect  
**Solution**: Check Firebase environment variables in `.env`

### ERR_FIRESTORE_002
**Location**: `src/lib/firestore.ts` - `searchCamps()` function  
**Description**: Failed to create Firestore query  
**Cause**: Invalid query parameters or Firestore connection issue  
**Solution**: Check filter parameters and Firestore connection

### ERR_FIRESTORE_003
**Location**: `src/lib/firestore.ts` - `searchCamps()` function  
**Description**: Failed to execute Firestore query  
**Cause**: Network error, permission denied, or invalid query  
**Solution**: Check Firestore security rules and network connection

### ERR_FIRESTORE_004
**Location**: `src/lib/firestore.ts` - `searchCamps()` function  
**Description**: Failed to convert document data  
**Cause**: Document data structure mismatch or missing fields  
**Solution**: Check document structure in Firestore matches Camp interface

### ERR_FIRESTORE_005
**Location**: `src/lib/firestore.ts` - `getCamps()` function  
**Description**: Failed to fetch all camps  
**Cause**: Firestore connection error or permission denied  
**Solution**: Check Firestore security rules allow reading camps collection

---

## Index Page Errors (ERR_INDEX_XXX)

### ERR_INDEX_001
**Location**: `src/pages/Index.tsx` - `loadCamps()` function  
**Description**: Failed to initialize camp loading  
**Cause**: Error before calling Firestore functions  
**Solution**: Check initial state and filter configuration

### ERR_INDEX_002
**Location**: `src/pages/Index.tsx` - `loadCamps()` function  
**Description**: Failed to fetch camps from Firestore  
**Cause**: Firestore query failed or returned error  
**Solution**: Check Firestore connection and query parameters

### ERR_INDEX_003
**Location**: `src/pages/Index.tsx` - `loadCamps()` function  
**Description**: Failed to normalize camp data  
**Cause**: Data compatibility layer error  
**Solution**: Check camp data structure matches expected format

### ERR_INDEX_004
**Location**: `src/pages/Index.tsx` - `loadCamps()` function  
**Description**: No camps found after filtering  
**Cause**: No camps match the filter criteria or database is empty  
**Solution**: Check if camps exist in Firestore and filters are not too restrictive

---

## Data Compatibility Errors (ERR_COMPAT_XXX)

### ERR_COMPAT_001
**Location**: `src/lib/dataCompatibility.ts` - `normalizeCampToLegacy()` function  
**Description**: Failed to normalize camp data  
**Cause**: Camp data is missing required fields or has invalid structure  
**Solution**: Check camp document structure in Firestore

### ERR_COMPAT_002
**Location**: `src/lib/dataCompatibility.ts` - `normalizeCampToLegacy()` function  
**Description**: Failed to convert timestamp field  
**Cause**: Invalid timestamp format or missing timestamp  
**Solution**: Check createdAt field in camp document

### ERR_COMPAT_003
**Location**: `src/lib/dataCompatibility.ts` - `convertCampToLegacyFormat()` function  
**Description**: Failed to convert camp to legacy format  
**Cause**: Camp object is missing required fields  
**Solution**: Ensure camp has all required fields from Camp interface

### ERR_COMPAT_004
**Location**: `src/lib/dataCompatibility.ts` - `normalizeBookingToLegacy()` function  
**Description**: Failed to normalize booking data  
**Cause**: Booking data structure mismatch  
**Solution**: Check booking document structure in Firestore

---

## Error Log Format

All errors are logged in the following format:

```
[ERROR_CODE] Error Message
Context: { relevant data }
Stack: error.stack
```

### Example:
```
[ERR_FIRESTORE_003] Failed to execute Firestore query
Context: {
  filters: { locations: ['Riffa'], priceRange: [0, 1000] },
  queryType: 'searchCamps'
}
Stack: Error: permission-denied...
```

---

## Debugging Checklist

When encountering errors on the search page:

1. **Check Browser Console**
   - Look for error codes (ERR_XXX_XXX)
   - Note the complete error message
   - Check the context data logged

2. **Verify Firestore Connection**
   - Check Firebase configuration in `.env`
   - Verify Firestore security rules
   - Test connection with `testFirestoreConnection()`

3. **Check Data Structure**
   - Verify camps exist in Firestore
   - Check camp documents have all required fields
   - Ensure field names match Camp interface

4. **Review Filters**
   - Check if filters are too restrictive
   - Verify filter values are valid
   - Test with no filters applied

5. **Check Network**
   - Open Network tab in DevTools
   - Look for failed Firestore requests
   - Check for CORS or permission errors

---

## Common Issues and Solutions

### Issue: "Failed to load camps"
**Possible Causes**:
- ERR_FIRESTORE_001: Firebase not initialized
- ERR_FIRESTORE_003: Permission denied
- ERR_INDEX_004: No camps in database

**Solutions**:
1. Check `.env` file has correct Firebase credentials
2. Verify Firestore security rules allow reading camps
3. Add sample camps to Firestore

### Issue: "No camps found"
**Possible Causes**:
- ERR_INDEX_004: Filters too restrictive
- Database is empty

**Solutions**:
1. Clear all filters and try again
2. Check Firestore console to verify camps exist
3. Verify camp status is 'active'

### Issue: Runtime errors on page load
**Possible Causes**:
- ERR_COMPAT_001: Data structure mismatch
- ERR_COMPAT_002: Invalid timestamp

**Solutions**:
1. Check camp documents in Firestore
2. Verify all required fields exist
3. Check timestamp fields are valid

---

## Adding New Error Codes

When adding new error codes:

1. Use the format: `ERR_[MODULE]_[NUMBER]`
2. Document in this file immediately
3. Include in console.error() calls
4. Add context data for debugging
5. Update the debugging checklist if needed

---

## Contact

If you encounter an error not listed here, please:
1. Note the complete error message
2. Check browser console for error codes
3. Document the steps to reproduce
4. Report to the development team