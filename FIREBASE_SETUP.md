# Firebase Setup Instructions for Sahra

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: "Sahra" (or your preferred name)
4. Disable Google Analytics (optional, can enable later)
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the **Web icon** (</>) to add a web app
2. Enter app nickname: "Sahra Web App"
3. **Don't** check "Also set up Firebase Hosting" (we'll use MGX hosting)
4. Click "Register app"
5. Copy the `firebaseConfig` object shown

## Step 3: Update Firebase Configuration

1. Open `src/lib/firebase.ts`
2. Replace the placeholder config with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 4: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable the following providers:

### Email/Password
- Click "Email/Password"
- Toggle "Enable"
- Click "Save"

### Google Sign-In
- Click "Google"
- Toggle "Enable"
- Enter project support email
- Click "Save"

### Facebook Sign-In (Optional)
- Click "Facebook"
- Toggle "Enable"
- You'll need to:
  - Create a Facebook App at [Facebook Developers](https://developers.facebook.com/)
  - Get App ID and App Secret
  - Enter them in Firebase
  - Add OAuth redirect URI to Facebook App settings
- Click "Save"

## Step 5: Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Select **Start in test mode** (we'll add security rules later)
4. Choose a location (select closest to your users, e.g., "asia-south1" for Bahrain region)
5. Click "Enable"

### Firestore Collections Structure

Your database will automatically create these collections:

```
users/
  {userId}/
    - id: string
    - email: string
    - name: string
    - isHost: boolean

camps/
  {campId}/
    - id: string
    - slug: string
    - title: string
    - photo: string
    - price: number
    - location: string
    - description: string
    - facilities: array
    - hostId: string
    - createdAt: timestamp

bookings/
  {bookingId}/
    - id: string
    - campId: string
    - campTitle: string
    - campPhoto: string
    - userId: string
    - checkIn: string
    - checkOut: string
    - guests: number
    - totalPrice: number
    - status: string
    - createdAt: timestamp
```

## Step 6: Set Up Firebase Storage (Optional)

1. In Firebase Console, go to **Storage**
2. Click "Get started"
3. Start in **test mode**
4. Click "Next" and "Done"

This will allow users to upload camp images directly instead of using URLs.

## Step 7: Configure Firestore Security Rules

Once you're ready for production, update your Firestore rules:

1. Go to **Firestore Database** > **Rules**
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Camps collection
    match /camps/{campId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.hostId;
    }
    
    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == get(/databases/$(database)/documents/camps/$(resource.data.campId)).data.hostId);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

3. Click "Publish"

## Step 8: Configure Storage Security Rules (Optional)

1. Go to **Storage** > **Rules**
2. Replace with these rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /camps/{campId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

## Step 9: Test Your Integration

1. Make sure you've updated `src/lib/firebase.ts` with your config
2. Run the app and try:
   - Creating an account with email/password
   - Signing in with Google
   - Creating a camp listing
   - Making a reservation

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure you've enabled Email/Password in Authentication settings

### "Firebase: Error (auth/unauthorized-domain)"
- Go to Authentication > Settings > Authorized domains
- Add your MGX deployment domain

### Google Sign-In not working
- Make sure Google provider is enabled in Firebase Console
- Check that your domain is in the authorized domains list

### Facebook Sign-In not working
- Verify Facebook App ID and Secret are correct
- Check OAuth redirect URI is added to Facebook App
- Ensure Facebook Login is enabled in your Facebook App

## Production Checklist

Before going live:
- [ ] Update Firestore rules from test mode to production rules
- [ ] Update Storage rules from test mode to production rules
- [ ] Add your production domain to authorized domains
- [ ] Set up Firebase App Check for additional security
- [ ] Enable Firebase Analytics (optional)
- [ ] Set up Firebase Performance Monitoring (optional)

## Cost Considerations

Firebase offers a generous free tier:
- **Authentication**: 10K verifications/month (free)
- **Firestore**: 50K reads, 20K writes, 20K deletes per day (free)
- **Storage**: 5GB stored, 1GB downloaded per day (free)

This should be more than enough for initial development and testing!