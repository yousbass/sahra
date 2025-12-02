# Firestore Security Rules - Deployment Guide

## 🔴 URGENT: The Problem

The Reserve page shows **"Failed to load booking availability: Missing or insufficient permissions"** because Firestore security rules are blocking authenticated users from reading bookings.

**Error:** `Failed to fetch bookings: Missing or insufficient permissions.`

**NEW ISSUE:** Admin panel shows **"Failed to update booking status"** when trying to confirm bookings because admins don't have permission to update bookings created by other users.

---

## ✅ The Solution

Deploy the updated security rules from `firestore.rules` to your Firebase project. These rules now include **admin permissions** that allow admins to manage all content.

---

## 📋 How to Deploy (Step-by-Step)

### **Step 1: Open Firebase Console**
- Go to https://console.firebase.google.com
- Select your project (the one connected to this app)

### **Step 2: Navigate to Firestore Rules**
- Click **"Firestore Database"** in the left sidebar
- Click the **"Rules"** tab at the top

### **Step 3: Copy the Rules**
- Open the `firestore.rules` file in this project
- Copy **ALL** the content (from `rules_version = '2';` to the end)

### **Step 4: Paste and Publish**
- In the Firebase Console Rules editor, **delete all existing rules**
- **Paste** the new rules from `firestore.rules`
- Click the **"Publish"** button (top-right corner)
- Wait for "Rules published successfully" message

### **Step 5: Verify the Fix**
- Navigate to any camp's Reserve page in your app
- The error should be **gone**
- Booked dates should display correctly in the calendar
- Go to Admin Panel → Bookings
- Try updating a booking status - should work without errors

---

## 🔒 What These Rules Do

### **Bookings Collection**
```
allow read: if request.auth != null;
allow update: if request.auth.uid == resource.data.userId || isAdmin;
```
- **Any authenticated user** can read all bookings (needed for Reserve page)
- **Users** can update/delete their own bookings
- **Admins** can update/delete ANY booking (needed for admin panel)

### **Camps Collection**
```
allow read: if true;
allow update: if request.auth.uid == resource.data.hostId || isAdmin;
```
- **Everyone** can read camps (including unauthenticated users)
- **Camp hosts** can update/delete their own camps
- **Admins** can update/delete ANY camp

### **Users Collection**
```
allow write: if request.auth.uid == userId || isAdmin;
```
- Authenticated users can read all user profiles
- **Users** can only write to their own profile
- **Admins** can update ANY user profile

### **Reviews Collection**
```
allow read: if true;
allow update: if request.auth.uid == resource.data.userId || isAdmin;
```
- Everyone can read reviews
- **Users** can create/update/delete their own reviews
- **Admins** can update/delete ANY review

### **Transactions Collection**
```
allow read: if request.auth.uid == resource.data.userId || isAdmin;
```
- **Users** can only read their own transactions
- **Admins** can read ALL transactions
- Only authenticated users can create transactions

---

## 👑 Admin Permissions

The updated rules check if a user has `isAdmin: true` in their user document. This allows admins to:

✅ Update any booking status (confirm, cancel, etc.)
✅ Delete any booking
✅ Update or delete any camp
✅ Update any user profile
✅ Delete any review
✅ View all transactions

**How it works:**
```javascript
get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true
```

This checks the `users/{userId}` document for an `isAdmin` field. If it's `true`, the user has admin privileges.

---

## 🛡️ Security Note

**Bookings Read Access:**
- Any authenticated user can read all bookings
- This is necessary for the Reserve page to show booked dates
- Standard pattern for booking/reservation systems

**Admin Access:**
- Only users with `isAdmin: true` in their user document have admin privileges
- Admins can manage all content across all collections
- Make sure to set `isAdmin: true` only for trusted administrators

**User Privacy:**
- Regular users can only modify their own content
- Admins have full access (necessary for moderation and support)
- Transactions are private (users can only see their own)

---

## 🧪 Testing After Deployment

### **1. Test Reserve Page:**
- Navigate to any camp
- Click "Reserve" or "Book Now"
- The calendar should load without errors
- Booked dates should be marked in red

### **2. Test Booking Creation:**
- Select check-in and check-out dates
- Fill in guest details
- Click "Create Reservation"
- Booking should be created successfully

### **3. Test Admin Panel - Bookings:**
- Go to `/admin/bookings`
- All bookings should be visible
- Click "Confirm" on a pending booking
- Status should update successfully (no error)
- Try "Cancel" - should also work

### **4. Test Admin Panel - Camps:**
- Go to `/admin/camps`
- Try editing any camp
- Changes should save successfully

### **5. Test Admin Panel - Users:**
- Go to `/admin/users`
- Try updating a user's role or status
- Changes should save successfully

### **6. Check Browser Console:**
- Open Developer Tools (F12)
- Go to Console tab
- Should see: `✅ Raw bookings from Firestore: [...]`
- Should NOT see: `❌ FIRESTORE PERMISSION DENIED!`
- Should NOT see: `Failed to update booking status`

---

## ❓ Troubleshooting

### **"Failed to update booking status" still appears:**

1. **Verify rules were published:**
   - Go to Firebase Console → Firestore → Rules
   - Check that the rules include the admin permission check
   - Look for: `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true`

2. **Verify your user has isAdmin set:**
   - Go to Firebase Console → Firestore → Data
   - Find your user document in the `users` collection
   - Check if `isAdmin: true` exists
   - If not, add it manually:
     - Click on your user document
     - Click "Add field"
     - Field name: `isAdmin`
     - Field type: `boolean`
     - Value: `true`
     - Click "Add"

3. **Hard refresh the browser:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Sign out and sign back in
   - Try updating a booking status again

4. **Check browser console for exact error:**
   - Open Developer Tools (F12)
   - Try updating a booking status
   - Look for detailed error messages
   - Share the error if it persists

### **Error still appears after publishing rules:**
1. **Hard refresh the browser:** Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache:** Settings → Privacy → Clear browsing data
3. **Wait 1-2 minutes:** Firebase rules can take a moment to propagate
4. **Check Firebase Console:** Verify the rules were actually published

### **"Publish" button is disabled:**
1. Make sure you're signed in to Firebase Console
2. Check that you have **Editor** or **Owner** permissions on the project
3. Try refreshing the Firebase Console page

### **Rules won't save:**
1. Check for syntax errors in the rules editor
2. Make sure you copied the entire `firestore.rules` file
3. Verify the `rules_version = '2';` line is at the top

---

## 🔧 Manual Admin Setup

If you need to manually set a user as admin:

1. **Go to Firebase Console:** https://console.firebase.google.com
2. **Navigate to:** Firestore Database → Data
3. **Find your user:** Click on the `users` collection
4. **Click on your user document** (the one with your user ID)
5. **Add the isAdmin field:**
   - Click "Add field" button
   - Field name: `isAdmin`
   - Field type: `boolean`
   - Value: `true`
   - Click "Add"
6. **Refresh your app** and sign out/in again

---

## 📞 Need Help?

If you're still experiencing issues after deploying these rules:

1. **Check the browser console** for the exact error message
2. **Verify Firebase project connection** in your app's Firebase config
3. **Confirm user is authenticated** before accessing admin features
4. **Verify isAdmin field exists** in your user document
5. **Share the error logs** from the browser console for further assistance

---

## ✅ Success Checklist

- [ ] Opened Firebase Console
- [ ] Navigated to Firestore Database → Rules
- [ ] Copied content from `firestore.rules`
- [ ] Pasted into Firebase Console
- [ ] Clicked "Publish"
- [ ] Saw "Rules published successfully" message
- [ ] Verified my user has `isAdmin: true` in Firestore
- [ ] Hard refreshed the browser
- [ ] Signed out and signed back in
- [ ] Tested Reserve page - no errors
- [ ] Tested Admin Panel - can update booking status
- [ ] Verified booked dates display correctly
- [ ] Successfully updated a booking status

---

## 🎯 What Changed in This Update

### **Previous Rules:**
- Users could only update their own bookings
- Admins had no special permissions
- Admin panel couldn't update booking statuses

### **New Rules:**
- ✅ Admins can update ANY booking (needed for admin panel)
- ✅ Admins can manage ANY camp
- ✅ Admins can update ANY user profile
- ✅ Admins can delete ANY review
- ✅ Admins can view ALL transactions
- ✅ Regular users still can only modify their own content

---

**Once these rules are deployed and your user has `isAdmin: true`, the admin panel will work correctly!** 🎉