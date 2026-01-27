# Nomi Manager

**Nomi Manager** is a powerful, offline-first tool designed to help you organize, edit, and manage your Nomi.ai profiles and groups. 

Built as a lightweight, single-file application, it acts as a dedicated workspace for crafting detailed backstories, managing shared group contexts, and curating image galleries for your Nomis.

## 🚀 Use It Now

You can run Nomi Manager directly in your browser without installing anything:

👉 **[Launch Nomi Manager](https://nick3335.github.io/Nomi-Manager/)**

---

## ✨ Key Features

### 🧠 Profile Management
* **Complete Field Editing:** Edit all core Nomi fields including Backstory, Inclination, Roleplay Context, Appearance, and Boundaries.
* **Smart Character Limits:** Built-in character counters (e.g., 2000 chars for Backstory) turn red when you exceed Nomi.ai limits, ensuring your prompts always fit.
* **Custom Sections:** Add your own custom text fields to profiles for notes, scratchpads, or alternative scenario drafts.
* **Drag & Drop Organization:** Reorder profile sections to suit your workflow.

### 👥 Group Management
* **Group Context:** Create and manage Groups with their own dedicated "Backstory" field (1000 char limit) to control the shared context of group chats.
* **Member Management:** Easily add or remove Nomis from groups.
* **Custom Group Fields:** Just like individual profiles, you can add custom text sections to Groups to track plot points or shared history.

### 🖼️ Gallery & Media
* **Image Gallery:** Store images associated with specific Nomis in a beautiful masonry grid layout.
* **Prompt Storage:** Save the generation prompts attached to every image so you never lose the "recipe" for a great picture.
* **Profile Pictures:** Crop and set avatars for both individual Nomis and Groups.

### 🔄 Integration & Data
* **Nomi.ai Sync:** Input your Nomi.ai API Key to instantly import your existing Nomis and their avatars directly into the manager.
* **Backup & Restore:** Export your entire database to a JSON file for safekeeping or to transfer between devices.
* **Offline First:** All data is stored locally in your browser (IndexedDB). Your backstories and notes never leave your device unless you choose to sync.

### 🎨 Customization
* **Themes:** Choose from 5 distinct color themes: Cyber (Pink), Matrix (Green), Royal (Gold), Crimson (Red), and Ice (Blue).
* **Mobile Ready:** The app is fully responsive and can be installed as a PWA (Progressive Web App) on mobile devices for a native app-like experience.

---

## 🛠️ How to Use

### Setting Up (API Sync)
To import your current Nomis automatically:
1. Open **Nomi Manager**.
2. Click the **Floating Action Button (Menu)** in the bottom right.
3. Open **Settings**.
4. Paste your **Nomi.ai API Key** (Found in the Nomi App under *Profile > Integrations*).
5. Click the **Sync Pill** button on the main screen.

### Creating a Manual Profile
1. Click **+ Create** next to the "My Nomis" header.
2. Click on the new card to enter the editor.
3. Click the **Avatar** to upload a photo.
4. Click the **Name** to rename the Nomi.
5. Fill out the fields. Use the **"Add Custom Section"** button at the bottom to add extra notes.

---

## 🔒 Privacy

Nomi Manager is a client-side application. 
* **Local Storage:** Your data is stored exclusively in your web browser's local database (IndexedDB).
* **API Usage:** If you use the Sync feature, your API key is used strictly to fetch your data from Nomi.ai and is stored locally on your device.

## 🤝 Contributing

Issues and Pull Requests are welcome! If you have ideas for new features or find a bug, please open an issue in the repository.

## 📄 License

[MIT License](LICENSE)
