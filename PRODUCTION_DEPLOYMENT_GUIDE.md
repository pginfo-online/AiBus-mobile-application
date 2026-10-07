# AiBus — Production Deployment & Release Guide

This document is the official deployment and release manual for **AiBus** (`com.worknai.aibus`), targeting both the **Google Play Store** and the **Apple App Store**.

---

## Table of Contents
1. [App Identity & Asset Architecture](#1-app-identity--asset-architecture)
2. [Leading Travel App Research & Icon Design Principles](#2-leading-travel-app-research--icon-design-principles)
3. [EAS Setup & Configuration](#3-eas-setup--configuration)
4. [Step-by-Step Guide: Building the Android `.aab`](#4-step-by-step-guide-building-the-android-aab)
5. [Publishing Version 1.0.0 to Google Play Store](#5-publishing-version-100-to-google-play-store)
6. [Publishing to Apple App Store](#6-publishing-to-apple-app-store)
7. [Releasing Version 2 (and Future Updates)](#7-releasing-version-2-and-future-updates)
8. [Over-The-Air (OTA) Updates with EAS Update](#8-over-the-air-ota-updates-with-eas-update)
9. [Pre-Flight Verification Checklist](#9-pre-flight-verification-checklist)

---

## 1. App Identity & Asset Architecture

### Project Identifiers
- **App Name**: AiBus
- **Android Package**: `com.worknai.aibus`
- **iOS Bundle Identifier**: `com.worknai.aibus`
- **Scheme**: `aibus://`
- **Expo SDK Version**: 57.0.27
- **React Native Version**: 0.86.3

### Production Assets in `assets/images/`
| Asset File | Dimensions | Format | Purpose |
| :--- | :--- | :--- | :--- |
| `icon.png` | 1024 × 1024 px | RGB (no alpha) | Master App Store & Google Play icon; iOS home screen icon. |
| `android-icon-foreground.png` | 512 × 512 px | RGBA (transparent) | Android Adaptive Icon foreground layer (emblem centered strictly in 66% safe zone circle). |
| `android-icon-background.png` | 512 × 512 px | RGB (full-bleed) | Android Adaptive Icon background layer (deep royal sapphire to midnight gradient). |
| `android-icon-monochrome.png` | 432 × 432 px | RGBA (silhouette) | Android 13+ Material You themed launcher icons (auto-tinted by OS wallpaper palette). |
| `splash-icon.png` | 512 × 512 px | RGBA (transparent) | Splash screen centered brand emblem. |
| `favicon.png` | 48 × 48 px | RGB | Browser tab favicon for web. |

---

## 2. Leading Travel App Research & Icon Design Principles

### Competitor Breakdown
1. **redBus**:
   - *Strengths*: Signature crimson-red background (`#D84444`) with high-contrast white bus silhouette. Instantly recognizable across India.
   - *Design Takeaway*: Single, bold hero emblem with aerodynamic curves; zero micro-text clutter; unmissable home screen visibility.
2. **AbhiBus**:
   - *Strengths*: Deep royal indigo/navy background (`#0A1931`) with warm coral and cyan smart accents. Monogram with integrated bus wheel geometry.
   - *Design Takeaway*: Dark premium canvas makes white/cyan/amber elements pop against both light and dark system wallpapers.
3. **ixigo**:
   - *Strengths*: Vibrant blue canvas with dynamic motion contours.
   - *Design Takeaway*: Strict geometric symmetry and vector precision.

### Why AiBus's Icon Looks Like a Real Commercial Product (Not AI)
- **Mathematical Symmetry**: Balanced vehicle geometry with 100% centered focal point `(512, 512)` on a 1024×1024 grid.
- **Android Safe Zone Compliance**: The bus emblem resides completely within the central 66% circle (radius ~169px on 512×512 canvas). It will **never** be clipped by Samsung OneUI squircles, Google Pixel circles, or Xiaomi rounded squares.
- **No Faux Mockup Borders**: Edge-to-edge full-bleed background without fake device frames or baked-in rounded corners.
- **Harmonious Brand Palette**: Deep Midnight Navy (`#051634`), Royal Sapphire (`#013C9A`), crisp White (`#FFFFFF`), warm amber matrix LEDs (`#F59E0B`), and smart electric cyan accent (`#00D2FF`).

---

## 3. EAS Setup & Configuration

### Prerequisites
1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Initialize the project with EAS:
   ```bash
   eas project:init
   ```

### Configuration Files
- **`app.json`**: Holds app name, package, bundle ID, icons, permissions, and splash config.
- **`eas.json`**: Defines build profiles (`development`, `preview`, `production`) and submission channels.

---

## 4. Step-by-Step Guide: Building the Android `.aab`

Google Play Store **requires** the **Android App Bundle (`.aab`)** format for all new app releases (APK uploads are no longer accepted for new apps).

### Step 4.1: Cloud Build with EAS (Recommended)
Cloud building handles Android SDKs, Gradle dependencies, and signing credentials automatically without requiring local Android Studio.

1. Ensure all changes are committed or staged in git:
   ```bash
   git add .
   git commit -m "Configure production icons and build setup"
   ```
2. Trigger the production Android App Bundle build:
   ```bash
   eas build --platform android --profile production
   ```
3. **Keystore Generation (First Build)**:
   - EAS will ask: *"Would you like Expo to handle your Android Keystore?"*
   - Choose: **Yes (Generate new keystore)**.
   - EAS will securely generate and store your keystore credentials in the Expo cloud.
4. **Monitor and Download**:
   - EAS CLI provides a streaming URL (e.g., `https://expo.dev/accounts/[user]/projects/aibus/builds/[build-id]`).
   - Once completed (typically 5–10 minutes), the CLI displays a download link for the `.aab` file.
   - You can download the `.aab` directly to your machine.

### Step 4.2: Local Build with EAS CLI (Alternative without Cloud Queue)
If you have Docker or local Android SDK installed and prefer building on your local PC:
```bash
eas build --platform android --profile production --local
```
The output `.aab` will be saved directly into your current directory.

### Step 4.3: Standalone Prebuild & Gradle (Bare Native Build)
To generate the raw Android project locally and build with Gradle:
```bash
# 1. Generate the native android directory
npx expo prebuild --platform android

# 2. Navigate and build release bundle
cd android
./gradlew bundleRelease
```
The resulting `.aab` is located at:
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 5. Publishing Version 1.0.0 to Google Play Store

### Step 5.1: Create App in Google Play Console
1. Go to [Google Play Console](https://play.google.com/console).
2. Click **Create App**:
   - **App name**: `AiBus`
   - **Default language**: English (India) - `en-IN`
   - **App or game**: App
   - **Free or paid**: Free
3. Accept Developer Program Policies and US export laws, then click **Create app**.

### Step 5.2: Complete Store Presence & Mandatory Tasks
In the left sidebar, complete all items under **Set up your app**:
1. **Privacy Policy**: Provide a valid URL to your privacy policy (e.g., `https://worknai.com/aibus/privacy`).
2. **App Access**: Choose "All functionality is available without special access" (or provide test credentials if login is required).
3. **Ads**: Declare whether your app contains ads.
4. **Content Rating**: Complete the IARC questionnaire (Travel category).
5. **Target Audience**: Select age 18+ (or 13+) depending on target users.
6. **Data Safety**: Declare data collected (e.g., phone number for customer contact, approximate location if enabled).
7. **Government Apps**: Declare "No".
8. **Financial Features**: Declare non-banking/booking support.

### Step 5.3: Main Store Listing Assets
- **App Icon**: Upload `assets/images/icon.png` (1024×1024 px, will be resized by Play Console or accept 512×512 px).
- **Feature Graphic**: 1024 × 500 px banner (navy background with AiBus logo and tagline).
- **Screenshots**: At least 2 phone screenshots (aspect ratio 16:9 or 9:16).
- **Short Description** (up to 80 chars):
  `Book bus tickets easily across India through your local partner shop.`
- **Full Description** (up to 4000 chars): Detailed description of AiBus booking network, operators (Online Go, Vighnaharta, Siya Ram, Keshari, Pancham), and cities served.

### Step 5.4: Upload the `.aab`
1. Navigate to **Testing** > **Closed testing** (Google requires closed testing with 20 testers for 14 days for new personal developer accounts) or **Production** (for organization accounts).
2. Click **Create new release**.
3. Choose **Google Play App Signing** (let Google manage signing key).
4. Drag and drop your `.aab` file downloaded from EAS.
5. Set Release name: `1.0.0 (1)`.
6. Write Release notes:
   ```xml
   <en-IN>
   Initial release of AiBus! Book bus tickets easily through local partner shops across India.
   </en-IN>
   ```
7. Click **Save** > **Review release** > **Start rollout to Production** (or Closed testing).

---

## 6. Publishing to Apple App Store

1. Ensure your Apple Developer Account is active ($99/yr).
2. Configure Apple App Store build in EAS:
   ```bash
   eas build --platform ios --profile production
   ```
3. EAS will automatically manage Distribution Certificates and Provisioning Profiles via your Apple ID.
4. Once built, submit directly to TestFlight / App Store:
   ```bash
   eas submit --platform ios
   ```
5. In [App Store Connect](https://appstoreconnect.apple.com), select the build, add screenshots (6.7" and 5.5" iPhone sizes), fill metadata, and submit for App Review.

---

## 7. Releasing Version 2 (and Future Updates)

When releasing a bug fix, feature enhancement, or new bus network update, follow these steps.

### Understanding Versioning in Mobile Apps
Every release requires **two** version numbers:
1. **User-Facing Version (`version`)**: Follows [Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`).
   - `1.0.0` → Initial release
   - `1.0.1` → Bug fixes / minor tweaks
   - `1.1.0` → New features (e.g., live tracking, new cities)
   - `2.0.0` → Major redesign or breaking changes
2. **Build Code (`versionCode` on Android, `buildNumber` on iOS)**:
   - **CRITICAL RULE**: Google Play Store and Apple App Store **strictly reject** any upload if the build code is not strictly higher than the previous release!
   - Version 1: `versionCode = 1`, `buildNumber = "1"`
   - Version 2: `versionCode = 2`, `buildNumber = "2"`
   - Version 3: `versionCode = 3`, `buildNumber = "3"`

### Versioning Strategies with EAS
In `eas.json`, the property `cli.appVersionSource` determines where version codes are managed:

#### Strategy A: Remote Versioning (Configured in `eas.json` currently)
With `"appVersionSource": "remote"` and `"autoIncrement": true` in `eas.json`:
- EAS automatically increments `versionCode` and `buildNumber` in the cloud on every production build!
- You only need to update the user-facing `version` in `app.json`:
  ```json
  "version": "1.1.0"
  ```
- EAS will automatically set `versionCode: 2`, `versionCode: 3`, etc.

#### Strategy B: Local Explicit Versioning (Maximum Control)
If you prefer explicit control in your git history, update `app.json` manually before each release:
```json
{
  "expo": {
    "version": "1.1.0",
    "ios": {
      "buildNumber": "2"
    },
    "android": {
      "versionCode": 2
    }
  }
}
```

### Complete Workflow to Release Version 2:
1. **Develop and verify your changes**:
   ```bash
   npx expo-doctor
   npx expo lint
   npx tsc --noEmit
   ```
2. **Update version numbers in `app.json`**:
   - Change `"version"`: `"1.1.0"`
   - Change `"android.versionCode"`: `2`
   - Change `"ios.buildNumber"`: `"2"`
3. **Commit the release in git**:
   ```bash
   git add app.json
   git commit -m "Bump version to 1.1.0 (build 2)"
   git tag v1.1.0
   ```
4. **Build the new Version 2 `.aab`**:
   ```bash
   eas build --platform android --profile production
   ```
5. **Publish the Update on Google Play Console**:
   - Open **Google Play Console** > **Production**.
   - Click **Create new release**.
   - Upload the new `.aab` file (it will show Version 1.1.0, Version Code 2).
   - Enter Release Notes:
     ```xml
     <en-IN>
     What's New in v1.1.0:
     • Expanded bus routes and new partner operators.
     • Performance improvements and faster booking experience.
     • Enhanced user interface and reliability updates.
     </en-IN>
     ```
   - Click **Next** > **Review release**.
   - **Staged Rollout (Recommended Best Practice)**:
     - You can roll out to 10% or 20% of users first to monitor crash rates in Android Vitals.
     - Once verified, increase to 100% rollout!
6. **Automated Submission via EAS (Alternative)**:
   ```bash
   eas submit --platform android --profile production
   ```

---

## 8. Over-The-Air (OTA) Updates with EAS Update

For urgent JavaScript or UI bug fixes that **do not modify native code or config plugins**, you can push updates instantly without going through the 1–3 day Google Play review:

1. Install `expo-updates`:
   ```bash
   npx expo install expo-updates
   ```
2. Configure EAS Update:
   ```bash
   eas update:configure
   ```
3. Publish an instant patch:
   ```bash
   eas update --branch production --message "Fix contact button click handler"
   ```
Existing users receive the update automatically next time they open the app!

---

## 9. Pre-Flight Verification Checklist

Before running any production build, run this 3-step checklist:

| Step | Command | Expected Output |
| :--- | :--- | :--- |
| **1. Diagnostic Health** | `npx expo-doctor` | `21/21 checks passed. No issues detected!` |
| **2. TypeScript Validation** | `npx tsc --noEmit` | Clean exit with code 0. |
| **3. Linter Validation** | `npx expo lint` | Clean exit with code 0. |

With these configurations in place, **AiBus** is fully prepared for successful review and publication on both Google Play and Apple App Store!
