<!-- ═══════════════════════════════════════════════════════════════════════
     PRIVCLOUD — DEMO / INSTALLATION & USAGE GUIDE (UI-TEAM READY)
     Purpose : Provide the complete user-facing installation, setup, usage,
               and troubleshooting content for the website. Each section
               maps directly to a website page or component: download,
               install guide, usage walkthrough, settings reference,
               troubleshooting/FAQ, uninstall guide, quick reference, etc.
     Audience: Non-technical end users. Windows-focused. Simple language.
     ═══════════════════════════════════════════════════════════════════════ -->

---

# SECTION: Page Header

---

# PrivCloud — Installation & Setup Guide

**A complete step-by-step guide to install, set up, and use PrivCloud on your Windows computer.**

Written for non-technical users. No prior experience required.

---

# SECTION: Prerequisites

---

## Before You Begin

Make sure you have the following ready before starting the installation:

| What You Need | Details |
|---|---|
| ✅ **Windows Computer** | Windows 10 or later. This is the computer that will become your personal cloud server. |
| ✅ **Free Disk Space** | At least **125 MB** for the installation, plus whatever space you want for cloud storage (the more, the better). |
| ✅ **Internet Connection** | Needed during installation to activate your product key. Also needed for remote access features (Basic & Pro editions). |
| ✅ **Your Product Key** | You received this when you purchased PrivCloud. It looks like this: `XXXXX-XXXXX` (groups of letters and numbers separated by a dash). If you don't have one yet, you can start with a **free 14-day trial** — no key needed. |
| ✅ **Web Browser** | Any modern browser (Chrome, Edge, Firefox, Safari) on any device you want to access your cloud from. |

### Optional (Recommended)

- **An external hard drive or secondary drive** — if you want more storage than your main drive has available, you can point PrivCloud to any connected drive.
- **A phone or tablet** — to test accessing your cloud from another device.

---

# SECTION: Download

---

## Step 1 — Download PrivCloud

1. Visit the PrivCloud website or product page.
2. Click the **Download** button to get the installer file.
3. The file is called **`PrivCloud_Setup.exe`** — it is a single file, approximately 37 MB.
4. Save it anywhere on your computer (your **Downloads** folder is fine).

> **Note:** Your browser or Windows Defender may show a warning because the file is an executable. This is normal for downloaded software. Click **"Keep"** or **"Run Anyway"** to proceed.

---

# SECTION: Installation Walkthrough

---

## Step 2 — Run the Installer

1. Find the file called **`PrivCloud_Setup.exe`** that you just downloaded.
2. **Double-click** on it to start the installation.
3. If Windows shows a security prompt asking *"Do you want to allow this app to make changes to your device?"*, click **Yes**.

The **PrivCloud Setup Wizard** will open — a friendly window that walks you through the installation one screen at a time.

---

## Step 3 — Enter Your Product Key (or Start Free Trial)

The first screen asks for your **product key**.

**If you have a product key:**
1. Type or paste your key into the text box. The wizard will automatically detect whether it's a Basic key (10 characters) or a Pro key (16 characters).
2. Click the **Activate** button.
3. Wait a few seconds — the wizard verifies your key online.
4. Once accepted, you'll see a green confirmation message showing your edition (Basic or Pro).

**If you want to try PrivCloud for free:**
1. Click the **"Start 14-Day Free Trial"** button.
2. No product key or credit card is needed.
3. The trial includes core file management with 5 GB of storage, limited to your local Wi-Fi network.

Click **Next** to continue.

---

## Step 4 — Welcome Screen

This screen shows a brief overview of what PrivCloud will install and what it does. There's nothing to configure here.

Click **Next** to continue.

---

## Step 5 — License Agreement

Read through the license agreement (MIT License).

1. Select **"I accept the agreement"** by clicking the radio button.
2. Click **Next** to continue.

> **Note:** You cannot proceed without accepting the agreement.

---

## Step 6 — Choose Installation Location

This screen asks **where** on your computer PrivCloud should be installed.

- **The default location works for most users.** It installs into your user programs folder (e.g., `C:\Users\YourName\AppData\Local\Programs\PrivCloud`).
- If you want to install somewhere else, click **Browse** and choose a different folder.

The wizard displays how much free disk space is available on the chosen drive. You need at least **125 MB** free.

Click **Next** to continue.

---

## Step 7 — Cloud Configuration

This is the most important step — it's where you configure your personal cloud. Take a moment to set these up carefully.

### 👤 Owner Name
- Enter your name (or any name you'd like to display).
- This appears in the desktop Control Panel and when other PrivCloud users on the same Wi-Fi network see your computer.
- **Default:** Your Windows username.

### 📁 Storage Folder
- This is the folder where **all your cloud files will be stored**.
- **The default location is fine for most users**, but you can click **Browse** to choose a different folder.
- **Tip:** If you have a large secondary hard drive or an external USB drive, point your storage there to maximize your available cloud space.

### 🔑 Server Password
- Choose a password that you will use to **log into your cloud** from any web browser.
- ⚠️ **Remember this password!** You'll need it every time you open your cloud from your phone, tablet, or any other device.
- You can change this password later at any time from the Control Panel or web interface.
- **Tip:** Choose something memorable but secure. Avoid very short or obvious passwords.

### 🌐 Domain / Subdomain *(Pro Edition Only)*
- If you purchased the **Pro edition**, you can enter a **custom subdomain** — this gives you a permanent, easy-to-remember web address for your cloud (e.g., `https://yourname.loca.lt`).
- **Basic edition users:** You can skip this field. You'll receive an automatically generated address that changes each time you restart the server.

### 📏 Storage Quota
- Optionally set a **maximum storage limit** (in GB). This prevents your cloud from filling up your entire hard drive.
- Leave at 0 or blank for no limit (your storage will be limited only by your available disk space and your edition's cap).

Click **Next** to continue.

---

## Step 8 — Additional Options

Choose your installation preferences. All of these can be changed later.

| Option | Recommendation | What It Does |
|---|:---:|---|
| **Create a Desktop shortcut** | ✅ Recommended | Places a "PrivCloud" icon on your Desktop for easy access. |
| **Create a Start Menu entry** | ✅ Recommended | Adds PrivCloud to your Windows Start Menu so you can find it by searching. |
| **Start PrivCloud when Windows starts** | Optional | Makes your cloud automatically available every time your PC boots — no manual action needed. Enable this if you want your cloud "always on." |
| **Add a Windows Firewall rule** | ✅ Recommended | Allows other devices on your network to connect to your cloud. If you skip this, only the computer running PrivCloud can access the cloud. |

Click **Next** to begin installation.

---

## Step 9 — Installation in Progress

The wizard now installs PrivCloud on your computer. You'll see:

- A **progress bar** filling up as files are copied.
- **Status messages** showing what's happening (copying files, creating shortcuts, configuring firewall, etc.).

This usually takes **less than 1 minute**.

⚠️ **Do not close the installer window** while installation is in progress.

---

## Step 10 — Installation Complete! 🎉

You'll see a green checkmark and a success message.

- If **"Launch PrivCloud"** is checked, the PrivCloud Control Panel will open automatically when you click Finish.
- Click **Finish** to close the installer.

**Congratulations — PrivCloud is now installed on your computer!**

---

# SECTION: Post-Installation — First Launch

---

## Opening PrivCloud for the First Time

After installation, you can open PrivCloud in two ways:

| Method | How |
|---|---|
| **Desktop Shortcut** | Double-click the **"PrivCloud"** icon on your Desktop. |
| **Start Menu** | Click the Windows Start button, search for **"PrivCloud"**, and click it. |

This opens the **PrivCloud Control Panel** — a desktop window that acts as your cloud's command center.

---

## Starting Your Cloud Server

1. In the Control Panel, click the **▶ Start Server** button.
2. Wait a few seconds — the status indicator will change from red ("Stopped") to green ("Running").
3. Once running, the Control Panel will display:
   - Your cloud's **local web address** (e.g., `http://192.168.1.5:9527`).
   - Your cloud's **remote web address** (Basic & Pro only).
   - A **QR code** that you can scan with your phone to connect instantly.

**Your personal cloud is now live!** 🎉

---

# SECTION: Accessing Your Cloud

---

## How to Access Your Cloud

### From the Same Computer

1. Open any web browser (Chrome, Edge, Firefox).
2. Type the **local address** shown in the Control Panel into the address bar — usually something like:
   ```
   http://localhost:9527
   ```
3. Press Enter. You'll see the PrivCloud **login screen**.
4. Enter the **server password** you chose during installation.
5. Click **Login**.

You're now inside your cloud dashboard!

---

### From Your Phone or Tablet (Same Wi-Fi)

**Method 1 — Scan the QR Code (Easiest):**
1. Open the **Camera app** on your phone.
2. Point it at the **QR code** shown in the PrivCloud Control Panel on your PC.
3. Tap the link that appears — it opens your cloud directly in your phone's browser.
4. Enter your server password and log in.

**Method 2 — Type the Address Manually:**
1. Open any browser on your phone (Safari, Chrome, Firefox).
2. Type the **Wi-Fi address** shown in the Control Panel (e.g., `http://192.168.1.5:9527`).
3. Enter your password and log in.

> **Important:** Your phone and the PrivCloud computer must be connected to the **same Wi-Fi network**.

---

### From Anywhere on the Internet (Basic & Pro Only)

1. Open any browser on any device.
2. Type the **remote address** shown in the Control Panel — it looks something like:
   ```
   https://abc123xyz.loca.lt
   ```
   Pro users with a custom subdomain will have an address like:
   ```
   https://yourname.loca.lt
   ```
3. You may see a Localtunnel landing page asking you to verify. Follow the instructions (usually just clicking a button).
4. Enter your server password and log in.

> **Note:** Remote access is not available on the free Trial — upgrade to Basic or Pro to unlock it.

---

# SECTION: Using Your Cloud — Core Features

---

## Uploading Files

### Upload by Dragging and Dropping
1. Open your cloud in a web browser and log in.
2. Navigate to the folder where you want to upload files.
3. **Drag files or folders** from your computer and **drop them** anywhere on the browser page.
4. A progress indicator will show the upload status.

### Upload Using the Upload Button
1. Click the **Upload** button (usually an upward arrow icon) in the toolbar.
2. Browse and select the files you want to upload.
3. Click **Open** to start uploading.

### Uploading Folders
- You can upload **entire folders** with all their subfolders and files intact. Just drag the folder from File Explorer into the browser.
- PrivCloud preserves the complete folder structure.

### Large File Uploads
- PrivCloud automatically handles large files (multi-gigabyte) by splitting them into smaller pieces during upload.
- If your connection drops during a large upload, only the current chunk needs to be re-sent — not the entire file.

---

## Downloading Files

1. Navigate to the file you want to download.
2. Click on the file name, or click the **download button** (down arrow icon).
3. The file downloads to your device's default download folder.

### Downloading Multiple Files at Once (Basic & Pro)
1. Select multiple files by clicking the **checkboxes** next to each file.
2. Click the **Download** button in the toolbar.
3. PrivCloud bundles all selected files into a single **ZIP archive** and downloads it.

---

## Browsing & Organizing Files

| Action | How |
|---|---|
| **Navigate folders** | Click a folder to open it. Use the breadcrumb trail at the top to go back to parent folders. |
| **Create a new folder** | Click the **"New Folder"** button, type a name, and press Enter. |
| **Rename a file or folder** | Right-click (or long-press on mobile) → Select **Rename** → Type the new name → Press Enter. |
| **Delete a file or folder** | Right-click → Select **Delete** → Confirm the deletion. |
| **Move a file** | Right-click → Select **Move** → Choose the destination folder from the picker. |
| **Copy a file** | Right-click → Select **Copy** → Choose the destination folder. |
| **Add to Favorites** | Click the **star icon** ⭐ next to any file or folder to bookmark it. |
| **Search** | Type in the **search bar** at the top. Results appear instantly as you type. |

### Navigation Sidebar

The left sidebar gives you quick access to:
- **All Files** — your entire cloud.
- **Documents** — your Documents folder.
- **Movies** — your Movies folder.
- **Photos** — your Photos folder.
- **Videos** — your Videos folder.
- **Projects** — your Projects folder.
- **Shared** — your Shared folder (where Wi-Fi peer transfers and upload dropboxes are saved).
- **Nearby Wi-Fi** — see other PrivCloud users on your network.
- **Favorites** — all your bookmarked files and folders.

---

## Previewing & Streaming Media

PrivCloud lets you preview most file types directly in your browser — no need to download first.

| File Type | What You Can Do |
|---|---|
| **Photos** (JPG, PNG, GIF, WebP, etc.) | View in high-resolution gallery with zoom, rotation, and slideshow. |
| **Videos** (MP4, MKV, WebM, MOV, etc.) | Stream with built-in video player — scrub, full-screen, volume control. |
| **Audio** (MP3, WAV, FLAC, etc.) | Play with built-in audio player — background playback supported. |
| **PDFs** | Read with integrated PDF viewer — zoom, page navigation, text search. |
| **Text & Code** (Python, JavaScript, HTML, JSON, etc.) | View with syntax highlighting and line numbers. |
| **Markdown** (.md) | Rendered with full formatting — headers, tables, code blocks. |
| **Spreadsheets** (CSV, TSV) | View in formatted table layout. |

Just click on any file to preview it. Close the preview to return to your file browser.

---

## Sharing Files

### Creating a Share Link

1. Navigate to the file you want to share.
2. Right-click the file (or long-press on mobile) and select **Share**.
3. Configure your share options:

| Option | Details |
|---|---|
| **Password** *(optional)* | Set a custom password that the recipient must enter before downloading. (Basic & Pro only.) |
| **Expiration** *(optional)* | Choose when the link should stop working: **1 hour**, **24 hours**, **7 days**, **30 days**, or **Never**. |
| **Share Type** | **Download Link** — recipient can download the file. **Upload Dropbox** — recipient can upload files to a folder (Pro only). |

4. Click **Create Link**.
5. **Copy the link** and send it to anyone — via email, text message, WhatsApp, Slack, or any messaging app.

### How the Recipient Uses the Link

1. They open the link in **any web browser** — no account or app needed.
2. If a password was set, they enter it.
3. They can preview or download the file.

### Managing Your Share Links

1. Click **Shared** in the sidebar or navigate to the **Share Management** page.
2. See all your active share links with:
   - Link URL
   - Creation date
   - Expiration countdown
   - Whether it has a password
   - Whether the shared file still exists
3. Click **Revoke** to immediately deactivate any link.

---

## Sending Files via Wi-Fi (Peer Transfer)

1. Make sure another PrivCloud user is connected to the **same Wi-Fi network**.
2. Click **"Nearby Wi-Fi"** in the sidebar — you'll see all discovered peers listed with their names and status.
3. Select the file you want to send.
4. Choose **"Send to Peer"** and select the target computer.
5. The file transfers **directly over your local network** at full speed — it never touches the internet.
6. The recipient finds the file in their **Shared → Wi-Fi Inbox** folder.

---

# SECTION: Control Panel Settings Reference

---

## Control Panel Settings

Open the PrivCloud Control Panel (double-click the Desktop shortcut) to manage your cloud.

### Dashboard & Connect Tab

| Setting | What It Does |
|---|---|
| **Start Server / Stop Server** | Turn your cloud on or off with a single click. |
| **Server Status** | Shows whether the server is currently running (green) or stopped (red). |
| **Local Address** | The address to access your cloud from the same Wi-Fi network. |
| **Remote Address** | The address to access your cloud from anywhere on the internet (Basic & Pro). |
| **QR Code** | Scan with your phone camera to instantly open your cloud on your phone. |

### Storage & Security Tab

| Setting | What It Does |
|---|---|
| **Storage Folder** | Change where your cloud files are stored. Click Browse to pick a new folder. |
| **Storage Quota** | Set a maximum storage limit (in GB) to prevent your drive from filling up. Set to 0 for no limit. |
| **Free Disk Space** | Shows how much free space is available on the drive containing your storage folder. |
| **Server Password** | View or change the password used to log into your cloud. |
| **Open Storage Folder** | Opens your storage folder in Windows File Explorer so you can browse files directly. |

### Network & Domain Tab

| Setting | What It Does |
|---|---|
| **Server Port** | The port number your server runs on (default: 9527). Most users don't need to change this. |
| **Custom Subdomain** *(Pro only)* | Enter your desired subdomain for a permanent remote address. |

### Additional Controls

| Control | What It Does |
|---|---|
| **Save Settings (Ctrl+S)** | Saves all changes you've made across all tabs. |
| **Theme Toggle** 🌙/☀️ | Switch between Dark Mode and Light Mode. |
| **License Badge** | Shows your current edition (Trial, Basic, Pro) and owner name. |

---

# SECTION: Changing Your Password

---

## How to Change Your Password

### From the Desktop Control Panel
1. Open the PrivCloud Control Panel.
2. Go to the **Storage & Security** tab.
3. Enter a new password in the **Server Password** field.
4. Click **Save Settings** (or press **Ctrl+S**).

### From the Web Interface
1. Open your cloud in a web browser and log in.
2. Open the **Settings** page.
3. In the **Change Password** section, enter your current password and your new password.
4. Click **Save**.

---

# SECTION: Stopping the Server

---

## How to Stop Your Cloud Server

When you want to stop your cloud (for example, before shutting down your computer):

**Option 1 — From the Control Panel:**
1. Open the PrivCloud Control Panel.
2. Click the **⏹ Stop Server** button.
3. The status changes to red ("Stopped").

**Option 2 — From the Desktop:**
1. Find and double-click the **"Stop PrivCloud"** shortcut (if one was created during installation).

**What happens when the server is stopped:**
- No one can access your cloud — not from your phone, not from other devices, and not remotely.
- Your files are completely safe — nothing is deleted or changed.
- Start the server again anytime by clicking **Start Server** in the Control Panel.

> **💡 Tip:** If you enabled **auto-start** during installation, the server will start automatically the next time your PC boots up — you won't need to do anything manually.

---

# SECTION: Upgrading Your License

---

## How to Upgrade Your Edition

You can upgrade from Trial to Basic, or from Basic to Pro, **without reinstalling**.

### From the Desktop Control Panel
1. Open the PrivCloud Control Panel.
2. Your current license badge is visible in the header area.
3. Enter your new product key when prompted, or look for the upgrade option.

### From the Web Interface
1. Open your cloud in a web browser and log in.
2. If you're on a Trial or Basic edition, you'll see upgrade prompts in the dashboard.
3. Click **Activate Key** and enter your new product key.
4. Your edition upgrades instantly — new features become available immediately.

No reinstallation. No data loss. No downtime.

---

# SECTION: Uninstallation

---

## How to Uninstall PrivCloud

If you decide to remove PrivCloud from your computer:

### Step 1 — Open the Uninstaller
- Find the **"Uninstall"** file in the PrivCloud installation folder, **or**
- Search for **"PrivCloud Uninstall"** in the Windows Start Menu, **or**
- Navigate to the installation directory and double-click **Uninstall.bat**.

### Step 2 — Review What Will Be Removed
The uninstaller shows you exactly what will be removed:
- PrivCloud application files.
- Desktop shortcuts and Start Menu entries.
- Auto-start entries (if configured).
- Windows Firewall rules (if configured).

### Step 3 — Choose Whether to Keep Your Files
⚠️ **This is the most important step:**

You will be asked: *"Do you also want to delete the storage folder?"*

| Choice | What Happens |
|---|---|
| **No** (Recommended) | Your uploaded files, photos, videos, and documents are **kept safe** on your hard drive. Only the PrivCloud application is removed. |
| **Yes** | All files in your cloud storage folder are **permanently deleted**. This cannot be undone. You will be asked to type a confirmation phrase ("delete storage folder") as a safety measure. |

### Step 4 — Complete Uninstallation
1. Click **Uninstall** and wait for the process to finish.
2. The uninstaller shows step-by-step progress.
3. When complete, click **Close**.

**After uninstallation:**
- All PrivCloud application files are removed.
- All shortcuts are cleaned up.
- All background processes are stopped.
- **Your stored files remain on your hard drive** (unless you chose to delete them).

---

# SECTION: Troubleshooting

---

## Common Issues & Simple Solutions

### ❓ "I forgot my password"

**Solution:** Open the PrivCloud Control Panel on the computer where PrivCloud is installed. Go to the **Storage & Security** tab — you can view or change the password from there. If you cannot open the Control Panel, reinstalling PrivCloud will let you set a new password without losing your files.

---

### ❓ "My phone can't find the cloud"

**Check these things:**
1. ✅ Is your phone and the PrivCloud computer on the **same Wi-Fi network**?
2. ✅ Is the PrivCloud server **running**? (Open the Control Panel — the status should show green / "Running".)
3. ✅ Try typing the **full address manually** into your phone's browser instead of scanning the QR code.
4. ✅ Did you allow PrivCloud through the **Windows Firewall** during installation? If not, other devices cannot connect.

**If it still doesn't work:**
- Check if another security application (antivirus, VPN, or third-party firewall) is blocking network connections.
- Try restarting the PrivCloud server.
- Try restarting your Wi-Fi router.

---

### ❓ "I see a Windows Firewall warning when I start the server"

**Solution:** Click **"Allow access"** when Windows asks. This lets other devices on your network connect to your cloud. If you click "Cancel" or "Block," only the computer running PrivCloud itself can access the cloud — your phone, tablet, and other computers will not be able to connect.

---

### ❓ "The remote/internet address isn't working"

**Check these things:**
1. ✅ Remote access requires a **Basic or Pro license**. The free trial only works over local Wi-Fi.
2. ✅ Make sure the host computer has an **active internet connection**.
3. ✅ The remote address may take **10–30 seconds** to become available after starting the server.
4. ✅ If you're using the Basic edition, your remote address **changes every time you restart** the server. Copy the new address from the Control Panel.
5. ✅ If you see a Localtunnel landing page, follow the instructions to verify (usually just clicking a button or entering your public IP).

---

### ❓ "Upload failed" or "Storage limit reached"

**Solutions:**
- Check if your **storage quota** has been reached. View your usage in the cloud dashboard sidebar or the Control Panel.
- **Trial:** 5 GB storage limit, 250 MB per-file upload limit.
- **Basic:** 500 GB storage limit, 4 GB per-file upload limit.
- **Pro:** Unlimited.
- Free up space by deleting files you no longer need.
- Upgrade your license for more storage capacity.

---

### ❓ "The installer asks for a product key but I want the free trial"

**Solution:** Look for the **"Start 14-Day Free Trial"** or **"Try for 14 Days"** button on the product key screen. You do **not** need a product key to start a free trial.

---

### ❓ "PrivCloud isn't starting automatically when I turn on my PC"

**Solutions:**
1. Open the PrivCloud Control Panel and check if the **auto-start option** is enabled.
2. If it was enabled during installation, try **disabling and re-enabling** it from the Control Panel.
3. Some antivirus software may prevent auto-start programs. Check your antivirus settings for blocked startup items.

---

### ❓ "The PrivCloud window looks blurry or too small"

**Solution:** PrivCloud supports High-DPI displays. If the interface appears blurry:
1. Right-click the PrivCloud shortcut → **Properties** → **Compatibility** tab.
2. Click **"Change high DPI settings"**.
3. Check **"Override high DPI scaling behavior"** and set it to **"Application"**.
4. Click **OK** and relaunch PrivCloud.

---

### ❓ "Can I run PrivCloud on Mac or Linux?"

**Answer:** Not at this time. PrivCloud is currently designed exclusively for **Windows 10 and later**. macOS and Linux are not supported.

---

### ❓ "Can I use PrivCloud on multiple computers?"

**Answer:** Each product key activates on one computer. If you want PrivCloud on multiple machines, you'll need a separate key for each one.

---

### ❓ "What happens to my files if I uninstall PrivCloud?"

**Answer:** Your files are **completely safe** and remain on your hard drive after uninstallation. PrivCloud only removes its own application files. The only way your stored files get deleted is if you **explicitly choose** to remove the storage folder during the uninstall process.

---

### ❓ "How do I move PrivCloud to a new computer?"

**Answer:** Your product key is tied to your license. Contact PrivCloud support for assistance with transferring your license to a new machine.

---

# SECTION: Quick Reference Card

---

## Quick Reference

A cheat-sheet of the most common actions:

| What You Want to Do | How to Do It |
|---|---|
| **Open PrivCloud** | Double-click the "PrivCloud" shortcut on your Desktop |
| **Start the cloud server** | Control Panel → Click **Start Server** |
| **Stop the cloud server** | Control Panel → Click **Stop Server** |
| **Access your cloud on this PC** | Open a browser → Go to `http://localhost:9527` |
| **Connect your phone** | Scan the **QR code** in the Control Panel with your phone's camera |
| **Upload files** | Drag and drop files into the browser window, or click the **Upload** button |
| **Upload a folder** | Drag and drop the entire folder from File Explorer into the browser |
| **Download a file** | Click the file → Click the **download** button (↓ arrow) |
| **Download multiple files** | Select files with checkboxes → Click **Download** (creates a ZIP) |
| **Create a new folder** | Click **New Folder** → Type a name → Press Enter |
| **Rename a file** | Right-click → **Rename** → Type new name → Press Enter |
| **Delete a file** | Right-click → **Delete** → Confirm |
| **Move a file** | Right-click → **Move** → Choose destination folder |
| **Copy a file** | Right-click → **Copy** → Choose destination folder |
| **Share a file** | Right-click → **Share** → Set options → **Copy link** |
| **Revoke a share link** | Go to **Shared** in the sidebar → Click **Revoke** on the link |
| **Search for files** | Type in the **search bar** at the top of the dashboard |
| **Favorite a file** | Click the **⭐ star icon** next to the file |
| **View favorites** | Click **Favorites** in the sidebar |
| **Preview a file** | Click on any image, video, audio, PDF, or text file |
| **Stream a video** | Click on any video file — it plays directly in the browser |
| **Send via Wi-Fi** | Sidebar → **Nearby Wi-Fi** → Select peer → Send file |
| **Change password** | Control Panel → **Storage & Security** tab → Enter new password → **Save** |
| **Change storage folder** | Control Panel → **Storage & Security** tab → Click **Browse** → **Save** |
| **Switch theme** | Control Panel → Click the **🌙/☀️** theme toggle |
| **Save settings** | Control Panel → Click **Save Settings** (or press **Ctrl+S**) |
| **Upgrade license** | Web dashboard → **Activate Key** → Enter your new key |
| **Uninstall** | Start Menu → Search "PrivCloud Uninstall" → Follow the prompts |

---

# SECTION: Glossary

---

## Glossary of Terms

In case you encounter any unfamiliar terms:

| Term | What It Means |
|---|---|
| **Cloud** | A way to store and access files from multiple devices. With PrivCloud, your cloud is your own computer. |
| **Server** | The computer that stores and serves your files. When PrivCloud is running, your PC acts as the server. |
| **Control Panel** | The PrivCloud desktop application where you start/stop the server and manage settings. |
| **Dashboard** | The web-based file manager that you open in a browser to manage your cloud files. |
| **Product Key** | A unique code (like XXXXX-XXXXX) that activates your PrivCloud license. |
| **Subdomain** | The custom part of your web address (e.g., "yourname" in `https://yourname.loca.lt`). Pro edition only. |
| **QR Code** | A square barcode that your phone camera can scan to quickly open a web address. |
| **Peer** | Another PrivCloud computer discovered on the same Wi-Fi network. |
| **Upload Dropbox** | A shared folder where other people can upload files to your cloud (Pro edition). |
| **Storage Quota** | The maximum amount of storage space you've allocated for your cloud. |
| **Firewall** | A Windows security feature that controls which programs can communicate over your network. |

---

# SECTION: Need Help CTA

---

## Need Help?

If you encounter an issue not covered in this guide:

- **Re-read the relevant section** — the answer may be in the troubleshooting section above.
- **Check the Quick Reference** — for step-by-step instructions on common tasks.
- **Contact PrivCloud Support** — we're here to help.

---

*PrivCloud · © 2026 PrivCloud Development Team · All Rights Reserved*
