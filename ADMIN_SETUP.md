# Admin Dashboard Setup Guide

## Overview

The Sahra platform now includes a comprehensive admin dashboard with full management capabilities for users, camps, bookings, reviews, analytics, and platform settings.

## Features

### 1. Admin Dashboard (`/admin`)
- **Statistics Overview**: Total users, camps, bookings, and revenue
- **Quick Actions**: Direct links to all management sections
- **Recent Activity Feed**: Real-time platform activity
- **Charts**: Bookings trend and revenue visualization

### 2. User Management (`/admin/users`)
- View all users with search and filtering
- Filter by role (Admin/Host/User) and status (Active/Suspended)
- User details dialog with full profile information
- Actions:
  - Suspend/Activate users
  - Promote/Demote host status
  - Delete users
  - Export user list to CSV

### 3. Camp Management (`/admin/camps`)
- View all camps with search and status filtering
- Camp details with photos, pricing, and ratings
- Actions:
  - Approve/Reject pending camps
  - Activate/Deactivate camps
  - View camp public page
  - Delete camps

### 4. Booking Management (`/admin/bookings`)
- View all bookings with comprehensive filtering
- Filter by status (Confirmed/Pending/Cancelled) and payment status
- Booking details with price breakdown
- Actions:
  - Confirm/Cancel bookings
  - Update booking status
  - Export bookings to CSV

### 5. Review Moderation (`/admin/reviews`)
- View all reviews with rating and status filters
- Review details with user and booking information
- Actions:
  - Flag/Unflag reviews
  - Delete inappropriate reviews
  - View helpful votes

### 6. Analytics Dashboard (`/admin/analytics`)
- **Key Metrics**: Users, revenue, ratings, bookings
- **Revenue Trend**: Line chart showing revenue over time
- **User Growth**: Bar chart showing new user registrations
- **Booking Distribution**: Pie chart of booking statuses
- **Top Performing Camps**: List of highest-rated camps
- Date range selector (7 days, 30 days, 3 months, 1 year)
- Export analytics data to JSON

### 7. Platform Settings (`/admin/settings`)
- **Platform Settings**: Name, contact info, description
- **Financial Settings**: Service fees, commission rates, taxes
- **Refund Policy**: Default policies and deadlines
- **General Settings**: Booking limits, review deadlines

## Setup Instructions

### Step 1: Enable Admin Access

To make a user an admin, you need to manually update their Firestore document:

1. Go to Firebase Console → Firestore Database
2. Navigate to the `users` collection
3. Find the user document you want to make admin
4. Add/Update the field: `isAdmin: true`
5. Optionally add: `status: "active"`

Example user document structure:
```json
{
  "email": "admin@sahra.com",
  "displayName": "Admin User",
  "isAdmin": true,
  "isHost": false,
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Step 2: Access Admin Dashboard

1. Sign in with the admin account
2. Navigate to `/admin` in your browser
3. You should see the admin dashboard

If you're redirected to the home page, verify that:
- The user is signed in
- The `isAdmin` field is set to `true` in Firestore
- The browser has been refreshed after updating Firestore

### Step 3: Test Admin Features

1. **Dashboard**: Check statistics and charts load correctly
2. **Users**: Try searching, filtering, and viewing user details
3. **Camps**: Test camp status updates and filtering
4. **Bookings**: Verify booking management functions
5. **Reviews**: Test review moderation features
6. **Analytics**: Check all charts render properly
7. **Settings**: Update and save platform settings

## Security Considerations

### Important: Production Security

⚠️ **CRITICAL**: The current implementation provides admin UI but does NOT include backend security rules. Before deploying to production, you MUST:

1. **Firebase Security Rules**: Add Firestore security rules to restrict admin operations:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Users collection - admins can read/write all
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Camps collection - admins can manage all camps
    match /camps/{campId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if isAdmin() || 
                               resource.data.hostId == request.auth.uid;
    }
    
    // Bookings collection - admins can manage all bookings
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
                     (isAdmin() || 
                      resource.data.userId == request.auth.uid);
      allow create: if request.auth != null;
      allow update, delete: if isAdmin();
    }
    
    // Reviews collection - admins can manage all reviews
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if isAdmin() || 
                               resource.data.userId == request.auth.uid;
    }
  }
}
```

2. **Cloud Functions**: Implement server-side validation for critical operations:
   - User deletion
   - Camp approval/rejection
   - Booking status changes
   - Refund processing

3. **Rate Limiting**: Implement rate limiting for admin actions to prevent abuse

4. **Audit Logging**: Add logging for all admin actions for accountability

## Admin Routes

- `/admin` - Dashboard
- `/admin/users` - User Management
- `/admin/camps` - Camp Management
- `/admin/bookings` - Booking Management
- `/admin/reviews` - Review Moderation
- `/admin/analytics` - Analytics Dashboard
- `/admin/settings` - Platform Settings

## Troubleshooting

### Issue: Cannot access admin dashboard
**Solution**: Verify `isAdmin: true` is set in the user's Firestore document

### Issue: Statistics not loading
**Solution**: Check browser console for errors. Ensure Firestore has data in collections.

### Issue: Charts not rendering
**Solution**: Verify recharts is installed: `pnpm list recharts`

### Issue: Admin layout not showing
**Solution**: Clear browser cache and refresh. Check that AdminLayout component is imported correctly.

## Future Enhancements

Consider adding these features in future updates:

1. **Email Notifications**: Send emails for important admin actions
2. **Activity Logs**: Detailed audit trail of all admin actions
3. **Bulk Operations**: Mass approve/reject camps, bulk user management
4. **Advanced Analytics**: More detailed reports and custom date ranges
5. **Role-Based Access**: Multiple admin levels with different permissions
6. **Real-time Updates**: Live dashboard updates using Firestore listeners
7. **Export Features**: More export formats (Excel, PDF)
8. **Search Improvements**: Advanced search with multiple criteria
9. **Mobile Optimization**: Better responsive design for mobile admins
10. **Notification Center**: In-app notifications for admin alerts

## Support

For issues or questions about the admin dashboard:
1. Check this documentation
2. Review Firebase Console for data issues
3. Check browser console for JavaScript errors
4. Verify Firestore security rules are properly configured

## License

This admin dashboard is part of the Sahra platform. All rights reserved.