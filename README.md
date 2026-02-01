# 🌌 Nomi Manager v3.9.6

Nomi Manager is a sophisticated, local-first Progressive Web App (PWA) designed to serve as a comprehensive dashboard and archival system for [Nomi.ai](https://nomi.ai) users. It leverages the official Nomi API to provide deep character management, advanced group chat features, and cross-device synchronization through private cloud infrastructure.

[**🚀 Launch Nomi Manager**](https://nick3335.github.io/Nomi-Manager/)

---

## 💎 Core Architecture & Design

* **Glassmorphism Interface**: The UI is built on a "Midnight" design language using CSS variables for high-contrast readability and aesthetic depth.
* **Adaptive Layouts**: Optimized for both desktop and mobile, featuring a sidebar-based chat system that collapses on smaller screens to maximize real estate.
* **Performance Focused**: Utilizes CSS keyframes for fluid transitions, including `popIn`, `slideUpFade`, and specialized nudge animations for active chat participants.
* **PWA Ready**: Includes a dedicated service worker (`sw.js`) that caches core app shell assets like `logo.svg` and `styles.css` for instant loading and offline availability.

---

## 🧠 Nomi & Group Management

### Comprehensive Profiles
* **Deep Backstories**: Manage character data across standardized fields including Backstory (2,000 char limit), Inclinations, and Appearance Tendencies.
* **Dynamic Customization**: Add unlimited custom sections to any Nomi or Group to track unique roleplay lore or specific boundaries.
* **Advanced Cropping**: A built-in canvas-based `cropper` allows you to set perfect circular avatars for Nomis and Group rooms using WebP compression for storage efficiency.

### Group Hub
* **Room Orchestration**: Create group rooms with custom notes, specific member lists, and togglable backchanneling settings.
* **Member Roles**: Assign specific roles or notes to individual Nomis within a group context to keep track of evolving dynamics.

---

## 💬 Next-Gen Chat Experience

* **Dual-Stream Polling**: Features a background sync that runs every 10 seconds and a high-frequency poller for active rooms to ensure no message is missed.
* **The Nudge Mechanic**: Directly trigger responses from specific Nomis in a group room using an interactive nudge bar featuring spinning status indicators and glow effects.
* **Rich Formatting**: Chat bubbles automatically handle newlines and italicize actions wrapped in asterisks or parentheses.
* **Engagement Tracking**: A global notification system and unread badges keep you updated on new messages across all conversations.

---

## ☁️ Synchronization & Storage

* **Hybrid Database System**: Uses `NomiArchDB_v22` for application settings and `NomiArchChatDB` for high-volume message history.
* **GitHub Gist Integration**: Sync your entire database—including Nomis, Groups, and Chat History—to a private GitHub Gist for secure, cross-device persistence.
* **Smart Auto-Sync**: Includes a 15-minute interval timer and a debounced "save-on-change" trigger to ensure your cloud backup is always current.
* **Export Flexibility**: Download your gallery images in WebP (optimized), PNG (high quality), or JPG (compatible) formats.

---

## 🛠 Setup Instructions

1.  **API Integration**: Navigate to **Settings** and input your `Nomi.ai API Key` to enable syncing and chat functionality.
2.  **Cloud Persistence**:
    * Create a GitHub Personal Access Token with `gist` scope.
    * Initialize a secret Gist containing `nomi-data.json`.
    * Input the Token and Gist ID into the app to enable seamless multi-device support.
3.  **Visual Themes**: Choose between **Midnight**, **OLED (True Black)**, **Paper**, or **Terminal** modes to suit your environment.

---

## 🔒 Privacy & Security

Nomi Manager operates on a **zero-server architecture**. Your API keys, chat logs, and backstories are stored exclusively in your browser's IndexedDB or your personal GitHub Gist. No data is ever transmitted to a third-party server other than the official Nomi.ai API and GitHub.