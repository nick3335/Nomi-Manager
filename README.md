# Nomi Manager

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)
![Data](https://img.shields.io/badge/data-Local%20Storage-lightgrey.svg?style=flat-square)

**Nomi Manager** is a powerful, offline-first dashboard designed to help you organize, chronicle, and manage your [Nomi.ai](https://nomi.ai/) characters and groups.

Built as a lightweight single-file HTML application, it offers deep lore management, image galleries, and seamless API synchronization without sending your data to third-party servers.

---

## 🚀 Getting Started

You can use Nomi Manager directly in your browser or download it for offline use.

### 🌐 Option A: Use Online (Recommended)
Access the latest version of the tool immediately via the web. It works on both desktop and mobile browsers.

👉 **[Launch Nomi Manager](https://nick3335.github.io/Nomi-Manager/)**

### 📂 Option B: Download for Offline Use
If you prefer to run the tool locally on your machine without an internet connection:
1. Go to the **[Releases](../../releases)** page of this repository.
2. Download the latest `NomiManager.html` file.
3. Double-click the file to open it in **Chrome**, **Edge**, **Firefox**, or **Brave**.

---

## ✨ Features

### 🔄 Smart API Integration
- **One-Click Sync:** Connect directly to the Nomi.ai API to fetch your character list.
- **Smart Updates:** Automatically imports new Nomis and updates UUIDs.
- **Non-Destructive Sync:** Fetches official avatars for new Nomis but **preserves your custom profile pictures** for existing ones.
- *Note: Uses a CORS proxy to ensure browser compatibility.*

### 📝 Deep Profile Management
Go beyond the basics with dedicated fields for extensive character details:
- **Lore & Backstory:** Unlimited text space for character history.
- **Roleplay Context:** Track current storylines and active roleplay states.
- **Personality Data:** Manage Inclinations, Preferences, Desires, and Boundaries.
- **Appearance:** Detailed sections for both User and Nomi appearance notes.

### 🎨 Gallery & Creative Tools
- **Visual Gallery:** Store unlimited images per Nomi in a beautiful masonry grid.
- **Prompt Hoarding:** Save generation prompts alongside every image.
- **Built-in Cropper:** Upload any image, zoom/crop within the app, and instantly set it as a profile picture.
- **Lightbox:** Full-screen image viewing.

### 👥 Advanced Group Management
- **Roster Management:** Easily add or remove Nomis from groups via dropdowns.
- **Group Lore:** Dedicated writing space for shared group backstories.
- **Custom Sections:** Create custom expandable sections for tracking timelines, shared inventories, or world-building notes.

### 🔐 Privacy & Security
- **Local-First Architecture:** All data is stored in your browser's **IndexedDB**.
- **No Tracking:** No analytics, no tracking, and no data sent to external servers (except the official Nomi API for syncing).
- **Data Portability:** Full JSON Import/Export system to backup your data or move it between devices.

---

## ⚙️ API Setup Guide

To use the **Sync** feature, you need an API Key from Nomi.ai.

1. Open the **Nomi.ai** App or Website.
2. Navigate to **Profile** > **Integrations**.
3. Click to generate an API Key.
4. Open **Nomi Manager**.
5. Click **Settings** (bottom left) and paste your key into the **Nomi.ai API Key** field.
6. Click the **"Sync from Nomi.ai"** button in the sidebar.

---

## 🎨 Customization

Make the dashboard your own via the **Settings** menu:

* **Themes:** Choose from 5 color palettes:
    * 🟣 **Cyber** (Default Purple)
    * 🟢 **Matrix** (Hacker Green)
    * 🟡 **Royal** (Gold)
    * 🔴 **Crimson** (Red)
    * 🔵 **Ice** (Cyan)
* **Typography:** Switch between Modern, Serif, Monospace, or Rounded fonts.
* **Start View:** Configure the app to launch directly into your last viewed Nomi.

---

## ⚠️ Important Notes

1.  **Backups:** Because data is stored in your browser cache, **please use the "Backup" button in Settings regularly.** If you clear your browser's "Site Data," your Nomi data will be erased unless you have a JSON backup.
2.  **CORS Proxy:** To allow the browser to talk to the Nomi API directly, this app routes requests through `corsproxy.io`. Your API key is sent securely through headers, but if you require strict enterprise-level security, we recommend running a local proxy server.

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for features or improvements:

1.  Fork the repository.
2.  Create a feature branch.
3.  Submit a Pull Request.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

> **Disclaimer:** This is a community-created tool and is not officially affiliated with, endorsed by, or connected to Nomi.ai. All Nomi characters and associated data belong to their respective creators and Nomi.ai.
