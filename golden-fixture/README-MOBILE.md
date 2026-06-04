# ShipMobile Golden Fixture — Your Android App

Your web app **ShipMobile Golden Fixture** is now wired up to build a real, installable Android app —
and the build runs for free on your own GitHub repository. You do **not** need Android
Studio, a Mac, or any developer tools on your computer. Follow the steps below to get
the app onto your phone.

## Get the app on your phone (the happy path)

1. Open this repository on GitHub and click the **Actions** tab at the top.
2. In the left sidebar, click the **Android Debug APK** workflow, then open the **latest run**
   (the one at the top). Wait until it shows a green check — the build takes a few minutes.
3. Scroll to the bottom of that run to the **Artifacts** section and **download** the file
   named **app-debug-apk**. It downloads as a `.zip` — open it to find **app-debug.apk** inside.
4. **Transfer** `app-debug.apk` to your Android phone (email it to yourself, use Google
   Drive, or plug in a USB cable and copy it across).
5. On your phone, open the file. Android will ask you to **allow installing from this source** —
   turn that on (it is asking because this is your own app, not from the Play Store).
6. Tap **Install**. Open **ShipMobile Golden Fixture** from your app drawer. That's it — you're running your
   app natively on your phone.

> Every time you push to `main` (or click **Run workflow** on the Actions tab), a fresh
> APK is built automatically. Re-download the latest one whenever you make changes.

## Run it in an emulator (optional)

If you'd rather test on your computer instead of a physical phone, you can run the APK in
an Android **emulator**:

1. Install [Android Studio](https://developer.android.com/studio) and open its **Device Manager**.
2. Create and start a virtual device (any recent Pixel image is fine).
3. Drag the downloaded `app-debug.apk` onto the running emulator window to install it, then
   launch **ShipMobile Golden Fixture**.

## Share it via Play internal testing (optional)

To hand the app to a small group of testers without a public Play Store listing, use
Google Play **internal testing**:

1. Create a Google Play Console account and a new app entry for **ShipMobile Golden Fixture**.
2. Under **Testing → Internal testing**, create a release and upload the build.
3. Add your testers by email; they install through a private opt-in link.

Note: internal testing requires a **signed** release build. This template ships an
**unsigned debug** APK (great for installing on your own devices); signing for Play is a
later step.

## Troubleshooting

### White / blank screen when the app opens

This is the single most common issue, and it's almost always caused by asset paths that
assume the app is served from a web root. This template already injects a **relative-base
guard** in the build so your assets load from the app bundle — so in most cases this is
handled for you. If you still see a blank screen, make sure your app doesn't hard-code
absolute URLs (paths starting with `/`) to its own files, and that `npm run cap:build`
finished successfully in the latest Actions run.

### Build failed in Actions

Open the **Actions** tab, click the failed run, and expand the red step to read the log —
the error message at the bottom usually says exactly what went wrong. Remember this build
runs on **your** GitHub runner, so a failure is in your repo's build, not on our servers.
Most failures are a normal app build error (a bad import, a missing dependency). Fix it,
push again, and the workflow re-runs automatically — or click **Re-run jobs** to retry a
flaky run without changing code.

### Can't install on phone

When you open the APK, Android may warn about **installing from unknown sources** or
**Play Protect** may flag it. This is expected: the app is an **unsigned debug** build
(it didn't come from the Play Store), not malware. It's your own app — allow
installing from this source / tap **Install anyway** to continue. If your phone blocks it
entirely, enable "Install unknown apps" for the app you're installing from (your browser,
Files, or Drive) in **Settings → Apps**.

### Where's my APK?

GitHub **artifacts expire** (by default after about 90 days), so an old download link can
go dead. To get a current build, go to the **Actions** tab, open the **latest** Android
Debug APK run, and download the **app-debug-apk** artifact again. If no recent run exists,
click **Run workflow** to regenerate a fresh APK on demand.
