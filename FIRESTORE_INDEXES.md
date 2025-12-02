# Firestore Indexes Setup Guide

## Required Indexes for Sahra App

Your app requires composite indexes for certain queries. Follow these steps to create them.

### Bookings Index (Required for "My Bookings" page)

**Why needed:** The Bookings page queries bookings by user ID and sorts by creation date.

**Quick Setup (Recommended):**

When you see the error message "The query requires an index", Firebase provides an auto-generated link in the error. 

1. **Look for the error in your browser console** (F12 → Console tab)
2. **Find the Firebase error message** - it will contain a clickable link
3. **Click the link** - it looks like: `https://console.firebase.google.com/v1/r/project/YOUR-PROJECT/firestore/indexes?create_composite=...`
4. You'll be taken to Firebase Console
5. Click **"Create Index"** button
6. Wait 1-2 minutes for the index to build
7. Refresh your Sahra app - the Bookings page should now work! ✅

**Manual Setup (Alternative):**

If the link doesn't work, create the index manually:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., `sahara-7e0ba`)
3. Navigate to: **Firestore Database** → **Indexes** tab
4. Click **"Create Index"**
5. Configure the index:
   - **Collection ID:** `bookings`
   - **Fields to index:**
     - Field: `userId` | Order: Ascending
     - Field: `createdAt` | Order: Descending
   - **Query scope:** Collection
6. Click **"Create"**
7. Wait for the index to build (status will change from "Building" to "Enabled")

### Index Build Time
- Usually takes 1-2 minutes for small datasets
- For large datasets, may take up to 5-10 minutes
- You'll see a green checkmark when ready
- The status shows "Building..." → "Enabled" ✅

### Troubleshooting

**Q: The link doesn't work**
A: Use the manual setup method above

**Q: Index is taking too long**
A: This is normal for the first index. Subsequent indexes are faster. Be patient!

**Q: I need the Bookings page to work NOW**
A: See the temporary workaround below

**Q: I created the index but still getting errors**
A: Wait a few more minutes. Sometimes it takes time to propagate. Try clearing your browser cache and refreshing.

---

## Temporary Workaround (Optional)

If you need immediate functionality while the index builds, we can remove the sorting temporarily:

**File:** `/workspace/shadcn-ui/src/lib/firestore.ts`

Find the `getBookingsByUser` function and comment out the orderBy:

```typescript
export const getBookingsByUser = async (userId: string): Promise<Booking[]> => {
  console.log('=== GET BOOKINGS BY USER ===');
  console.log('User ID:', userId);
  
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('userId', '==', userId)
      // orderBy('createdAt', 'desc')  // ⚠️ Temporarily commented out - uncomment after index is created!
    );
    
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Booking[];
    
    console.log(`✅ Found ${bookings.length} bookings`);
    return bookings;
  } catch (error) {
    console.error('❌ Failed to fetch bookings:', error);
    throw error;
  }
};
```

This will show bookings in any order (not sorted by date), but won't require an index.

**⚠️ Remember to uncomment the orderBy line after the index is created!**

---

## All Required Indexes

Here's a complete list of indexes your app needs:

### 1. Bookings by User (bookings collection)
- **Fields:** `userId` (Ascending) + `createdAt` (Descending)
- **Purpose:** Load user's bookings sorted by date
- **Status:** ⚠️ Needs to be created (see instructions above)

### 2. Camps by Creation (camps collection)
- **Fields:** `createdAt` (Descending)
- **Purpose:** Load all camps sorted by newest first
- **Status:** ✅ Should work automatically (single field index)

### 3. Camps by Host (camps collection)
- **Fields:** `hostId` (Ascending) + `createdAt` (Descending)
- **Purpose:** Load host's camps sorted by date
- **Status:** ✅ May be needed if you get an error on "My Listings" page

---

## How to Check Index Status

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to: **Firestore Database** → **Indexes** tab
4. You'll see all indexes with their status:
   - 🟢 **Enabled** - Ready to use
   - 🟡 **Building** - In progress (wait)
   - 🔴 **Error** - Something went wrong (recreate it)

---

## Understanding Firestore Indexes

**What are indexes?**
Indexes are like a table of contents for your database. They help Firestore find data quickly.

**When do you need them?**
- Querying with multiple fields (composite queries)
- Combining `where()` with `orderBy()`
- Complex filtering and sorting

**Do I need to create them manually?**
- Firebase will tell you when you need an index
- It provides a direct link to create it
- Just click and wait!

**Are they permanent?**
- Yes! Once created, indexes work forever
- You only need to create them once per query type
- They automatically update as you add/remove data

---

## Next Steps

1. ✅ Check your browser console for the Firebase error with the index link
2. ✅ Click the link to create the index
3. ✅ Wait 1-2 minutes for it to build
4. ✅ Refresh your Sahra app
5. ✅ Go to "My Bookings" page - it should now load successfully!

If you encounter any other index errors in the future, Firebase will provide similar auto-generated links to create them. Just click and wait!

---

## Common Index Errors

### Error: "The query requires an index"
**Solution:** Click the link in the error message or create the index manually

### Error: "Index already exists"
**Solution:** The index is already created, just wait for it to finish building

### Error: "Insufficient permissions"
**Solution:** Make sure you're logged into Firebase Console with the correct account

---

## Need Help?

If you're stuck:
1. Check the Firebase Console → Indexes tab to see the status
2. Wait a few minutes - index building takes time
3. Try the temporary workaround above
4. Clear your browser cache and refresh
5. Check that your Firestore rules allow read access to the bookings collection

The index creation is a one-time setup. Once done, your Bookings page will work perfectly! 🎉