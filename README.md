# Nomi Manager

![Version](https://img.shields.io/badge/version-1.21-blue.svg?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)
![Data](https://img.shields.io/badge/data-Local%20Storage-lightgrey.svg?style=flat-square)

**Nomi Manager** is a powerful, offline-first dashboard designed to help you organize, chronicle, and interact with your [Nomi.ai](https://nomi.ai/) characters.

What started as a simple lore manager has evolved into a full-featured client. You can now chat directly with your Nomis, manage group rooms, organize extensive profile lore, and customize your experience—all from a single, lightweight HTML file.

---

## 🚀 Getting Started

### 🌐 Option A: Use Online (Recommended)
Access the latest version immediately via the web. Works on desktop and mobile.

👉 **[Launch Nomi Manager](https://nick3335.github.io/Nomi-Manager/)**

### 📂 Option B: Download for Offline Use
1. Go to the **[Releases](../../releases)** page.
2. Download `NomiManager.html`.
3. Open it in any modern browser (**Chrome**, **Edge**, **Brave**, **Firefox**).

---

## ✨ New Features: Chat Rooms

Nomi Manager now includes a fully functional **Chat Interface** powered by the Nomi.ai API.

* **💬 Real-Time Messaging:** Send messages to your Nomis and receive replies directly within the app.
* **👋 Nudge System:** A "Story-style" nudge bar allows you to tap any Nomi's avatar to prompt them to speak next.
* **⚙️ Room Management:** Create, Edit, and Delete rooms. Set custom "Context/Notes" for rooms to guide the roleplay (up to 1000 characters).
* **🖼️ Custom Chat Avatars:** Set custom cover images for your chats (stored locally) to make them easier to identify.
* **🔒 Smart Locking:** The interface prevents double-posting by locking inputs while a Nomi is replying.

---

## 🛠️ Core Features

### 🔄 API Integration
* **Two-Way Sync:** Pulls your latest Nomis and Rooms from Nomi.ai.
* **API Actions:** Creating or Deleting a chat in the manager updates it on the official app instantly.
* **Non-Destructive:** Syncing updates data without overwriting your custom local images or lore.

### 📝 Deep Profile Management
* **Drag-and-Drop Layout:** Reorder profile sections exactly how you want them.
* **Custom Sections:** Add unlimited custom text blocks to Nomi or Group profiles.
* **Favorites:** Pin your most-used Nomis to the top of the dashboard.
* **Lore Tracking:** Dedicated fields for Backstory, Appearance, Boundaries, and more.

### 🎨 Gallery & Visuals
* **Visual Gallery:** Store unlimited images per Nomi in a responsive masonry grid.
* **Prompt Hoarding:** Save the generation prompts alongside every image.
* **Built-in Cropper:** Upload, zoom, and crop images to create perfect circular avatars for the dashboard.

### 👥 Groups
* **Roster Management:** Easily add/remove Nomis from groups.
* **Group Lore:** Shared backstory fields for the entire group.
* **Dashboard Access:** Groups now live on the main dashboard for quick access.

---

## ⚙️ Setup & Settings

To enable Sync and Chat features, you need an API Key.

1.  Open **Nomi.ai** > **Profile** > **Integrations**.
2.  Copy your API Key.
3.  In **Nomi Manager**, click **Settings** (bottom left).
4.  Paste the key into the **Nomi.ai API Key** field.

### Customization Options
* **Themes:** Cyber (Purple), Matrix (Green), Royal (Gold), Crimson (Red), Ice (Blue).
* **Start-Up View:** Choose to start on the Dashboard or resume exactly where you left off ("Last Visited Page").

---

## 🔐 Privacy & Data

* **Local-First:** All custom lore, images, and settings are stored in your browser's **IndexedDB**.
* **Direct Connection:** API calls go directly from your browser to Nomi.ai (via a CORS proxy to function in-browser). No data is sent to us.
* **Backup/Restore:** Use the **Data Management** tools in Settings to export your full database to a JSON file. **Do this regularly!**

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

> **Disclaimer:** This is a community-created tool and is not officially affiliated with Nomi.ai.
