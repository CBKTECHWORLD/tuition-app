# EduLearn – Online Tuition Platform
## Complete Free Setup Guide

---

## STEP 1: Install Node.js
Download and install from: https://nodejs.org (LTS version)

---

## STEP 2: Set up Firebase (FREE)

1. Go to https://firebase.google.com → Click "Get Started" → Sign in with Google
2. Click "Add Project" → Name it "edulearn" → Create project
3. Click the Web icon </> → Register app → Copy the config object

4. Enable **Authentication**:
   - Firebase Console → Authentication → Get Started
   - Sign-in method → Email/Password → Enable → Save

5. Enable **Firestore Database**:
   - Firebase Console → Firestore Database → Create database
   - Choose "Start in test mode" → Select region → Done

---

## STEP 3: Add your Firebase config

Open `src/firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

---

## STEP 4: Install & Run

Open terminal in this folder:

```bash
npm install
npm run dev
```

App runs at: http://localhost:5173

---

## STEP 5: Create your first Admin account

1. Open http://localhost:5173/signup
2. Enter your name, email, password
3. Select role: **Admin**
4. You're now the admin!

---

## STEP 6: How it all works

### As ADMIN:
- Go to /admin → see dashboard stats
- /admin/enrollments → Approve or Reject student requests
- /admin/users → Manage tutor accounts
- /admin/classes → View/delete any class

### As TUTOR:
- Sign up with role "Tutor" (admin can approve tutors in Users page)
- Go to /tutor → Create classes
- Add recorded videos via YouTube Unlisted URL
- Schedule live sessions (Jitsi Meet, free, no download)
- Tutors can edit/delete their own classes

### As STUDENT:
- Sign up with role "Student" (auto-approved)
- Browse all available classes
- Click "Request to Join" on any class
- Wait for admin approval
- Once approved → Go to "My Enrollments" → Watch videos, join live sessions

---

## How to add videos (FOR TUTORS)

### YouTube Unlisted (Recommended):
1. Go to YouTube → Upload video
2. Set visibility to "Unlisted" (not Public, not Private)
3. Copy the video URL
4. Paste in "Add Video" section of your class

### Google Drive:
1. Upload video to Google Drive
2. Right-click → Share → Change to "Anyone with the link"
3. Copy the link
4. Paste in "Add Video" section

---

## How Live Classes work (Jitsi Meet)

- When tutor schedules a live session, a unique room is auto-created
- Tutor and students click "Join Live" → Jitsi opens inside the app
- No downloads, no accounts, completely free
- Works in any browser
- Supports camera, microphone, screen sharing, chat

---

## Deploy to Internet (FREE with Vercel)

1. Push this code to GitHub (https://github.com)
2. Go to https://vercel.com → Sign in with GitHub
3. Click "New Project" → Import your repo
4. Click Deploy → Done!

Your app is now live at: yourproject.vercel.app

---

## Firestore Security Rules (Important for Production)

Go to Firebase Console → Firestore → Rules, and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'tutor' ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    match /enrollments/{enrollId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## Total Cost: ₹0 (Everything is FREE)
- Firebase free tier: Auth + Firestore + Hosting
- YouTube: Free video storage (unlimited)
- Jitsi Meet: Free live video calls
- Vercel: Free hosting
- GitHub: Free code storage
