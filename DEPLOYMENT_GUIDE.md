# Cheetah Reporter - Firebase Deployment Guide

## 🚀 Complete Setup and Deployment Instructions

This guide will walk you through deploying the Cheetah Reporter application to Firebase Hosting with Firestore database. Follow the steps in order for a successful deployment.

---

## **Phase 1: Prerequisites and Setup**

### Prerequisites
- Node.js (v16 or higher) and npm installed
- Git installed  
- Google account for Firebase Console access
- Windows PowerShell (for Windows users)

### Install Firebase CLI
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Verify installation
firebase --version
```

---

## **Phase 2: Firebase Project Setup**

### Step 1: Create Firebase Project
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `cheetah-reporter-prod` (or your preferred name)
4. Enable Google Analytics: **Yes** (recommended)
5. Select Analytics account or create new one
6. Click **"Create project"**

### Step 2: Enable Required Services

**Authentication:**
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click **Save**

**Firestore Database:**
1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select location closest to your users

**Hosting:**
1. Go to **Hosting** 
2. Click **Get started**
3. Note the setup instructions (we'll use CLI instead)

### Step 3: Get Firebase Configuration
1. Go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click **Add app** → **Web app** (</>)
4. App nickname: `Cheetah Reporter Web`
5. Check **"Also set up Firebase Hosting"**
6. Click **Register app**
7. **Copy the configuration object** (you'll need this next)

---

## **Phase 3: Local Project Configuration**

### Step 1: Update Firebase Configuration
Open `src/lib/firebase.ts` and replace the `firebaseConfig` object with your copied configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Step 2: Initialize Firebase CLI
```bash
# Navigate to project directory
cd "d:\Software\Applications\Cheetah-Reporter"

# Login to Firebase
firebase login

# Select your project
firebase use your-project-id
```

### Step 3: Configure Firebase Services
```bash
# Initialize Firebase (select specific services)
firebase init
```

**When prompted, select ONLY these options:**
- ✅ **Firestore: Deploy rules and create indexes**
- ✅ **Hosting: Configure files for Firebase Hosting**
- ❌ **Do NOT select:** Functions, Storage, Emulators, Data Connect

**Configuration answers:**
- Use existing project: **Yes** → Select your project
- Firestore Rules file: **Press ENTER** (uses `firestore.rules`)
- Firestore indexes file: **Press ENTER** (uses `firestore.indexes.json`)
- Public directory: **`dist`**
- Single-page app: **`y`**
- GitHub deploys: **`n`**
- Overwrite index.html: **`n`**

---

## **Phase 4: Build and Deploy**

### Step 1: Install Dependencies and Build
```bash
# Install all dependencies
npm install

# Build for production
npm run build
```

### Step 2: Deploy to Firebase
```bash
# Deploy Firestore rules and hosting together
firebase deploy --only "firestore,hosting"
```

**Expected successful output:**
```
✔ Deploy complete!
Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

---

## **Phase 5: Verification and Testing**

### Test Your Deployed Application
1. **Open your hosting URL**: `https://your-project-id.web.app`

2. **Verify theme system**: 
   - App loads with **dark mode** by default
   - Click theme toggle (Moon/Sun/Monitor icon) to cycle themes
   - Theme persists across page reloads

3. **Test authentication**:
   - Create new account with email/password
   - Login/logout functionality
   - Use "Forgot Password?" link to reset password if needed
   - Check email for password reset instructions

4. **Test core features**:
   - Create a new financial reporting project
   - Upload CSV file (use `/public/sample-trial-balance.csv`)
   - Generate financial statements
   - Export PDF report

---

## **🚨 Troubleshooting**

### Firebase CLI Issues
```bash
# Login problems
firebase logout
firebase login --reauth

# Project selection issues  
firebase projects:list
firebase use your-project-id

# Data Connect API error (safe to ignore)
# Just re-run: firebase deploy --only "firestore,hosting"
```

### Build/Deploy Errors
```bash
# Clean install if needed
rm -rf node_modules package-lock.json
npm install
npm run build

# Deploy specific services if full deploy fails
firebase deploy --only "firestore"
firebase deploy --only "hosting"
```

### Application Runtime Issues
- **Firebase config not found**: Verify you updated `src/lib/firebase.ts`
- **Authentication failed**: Check Email/Password is enabled in Firebase Console
- **Permission denied**: Ensure Firestore rules are deployed
- **Theme not working**: Clear browser cache and reload
- **Password reset not working**: Check that the email address exists in Firebase Auth
- **Can't log in after registration**: Try using the "Forgot Password?" feature to reset

### CSS/Tailwind Issues
- **CSS linting errors**: Install "Tailwind CSS IntelliSense" extension in VSCode
- **Dark mode not working**: Check `src/index.css` has proper CSS variables defined
- **Forms still light in dark mode**: Verify Tailwind config includes design tokens
- **Theme toggle not visible**: Check browser developer tools for contrast issues

---

## **📊 Production Features**

### ✅ Ready for Production
- **Authentication**: Firebase Auth with email/password
- **Database**: Firestore with security rules
- **Theme System**: Dark mode default with user toggle (Dark/Light/System)
- **UI Components**: Modern Tailwind CSS with shadcn/ui
- **Data Import**: CSV trial balance import with PapaParse
- **Financial Statements**: Automated calculation and generation
- **PDF Export**: Professional PDF reports with jsPDF
- **State Management**: Zustand stores with persistence
- **Type Safety**: Full TypeScript implementation

### ⚠️ Optional Enhancements
- **Testing**: No test suite implemented
- **Error Monitoring**: Consider adding Sentry or Firebase Crashlytics  
- **Performance**: Add lazy loading for large datasets
- **CI/CD**: Automate deployments with GitHub Actions
- **Custom Domain**: Configure custom domain in Firebase Console

---

## **🎯 Quick Reference**

### Essential Commands
```bash
# Build and deploy
npm run build
firebase deploy --only "firestore,hosting"

# Deploy individual services
firebase deploy --only "firestore"    # Database rules
firebase deploy --only "hosting"      # Web app

# Check status
firebase projects:list
firebase hosting:channel:list
```

### Important URLs
- **Firebase Console**: https://console.firebase.google.com/
- **Your App**: https://your-project-id.web.app
- **Project Settings**: Firebase Console → Project Settings

### Support
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)

---

**🎉 That's it! Your Cheetah Reporter application is now live and ready for production use.**
