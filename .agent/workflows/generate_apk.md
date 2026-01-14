---
description: Generate Signed APK for Manual Distribution
---

# Generate Signed APK

Since you are distributing outside the Play Store, you need an **APK** file, not an AAB.

1.  **Open Android Studio**.
2.  Go to **Build** > **Generate Signed Bundle / APK**.
3.  Select **APK** and click **Next**.
4.  **Key Store Configuration:**
    *   **Key store path:** Click "Choose existing..." and select `android/app/release-key.jks`.
    *   **Key store password:** `123456`
    *   **Key alias:** `monitor-escolar`
    *   **Key password:** `123456`
    *   *Tip: Check "Remember passwords" to make it easier next time.*
5.  Click **Next**.
6.  Select **release** as the build variant.
7.  Click **Create**.

## Locate the File
Once the build finishes (check the "Build" tab at the bottom right):
1.  A popup will appear: "Generate Signed APK: APK(s) generated successfully".
2.  Click **locate** in that popup.
3.  Or manually go to: `android/app/release/app-release.apk`.

## Distribution
- Rename this file to `MonitorEscolarPro.apk`.
- Upload it to your hosting or send via WhatsApp.
- **Note:** Users will need to enable "Install from Unknown Sources" to install it.
