// REGISTER SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker failed', err));
    });
}

/** NOMI MANAGER v3.8 - SPLIT SYNC **/

const DB_NAME = 'NomiArchDB_v22';
const DB_VERSION = 1;

const DEFAULT_SECTIONS = [
    { id: 'backstory', label: 'Backstory', limit: 2000 },
    { id: 'inclination', label: 'Inclination', limit: 150 },
    { id: 'current_roleplay', label: 'Current Roleplay', limit: 750 },
    { id: 'your_appearance', label: 'Your Appearance', limit: 200 },
    { id: 'nomi_appearance', label: 'Nomi\'s Appearance', limit: 500 },
    { id: 'appearance_tendencies', label: 'Appearance Tendencies', limit: 200 },
    { id: 'nicknames', label: 'Nicknames', limit: 250 },
    { id: 'preferences', label: 'Preferences', limit: 500 },
    { id: 'desires', label: 'Desires', limit: 500 },
    { id: 'boundaries', label: 'Boundaries', limit: 500 }
];

const cropper = {
    active: false, img: null, scale: 1, posX: 0, posY: 0, isDragging: false, startX: 0, startY: 0, targetType: null, contextId: null,
    
    init(input, type) { 
        if(!input.files[0]) return; 
        this.targetType = type; 
        const reader = new FileReader(); 
        reader.onload = (e) => { this.openCropModal(e.target.result); }; 
        reader.readAsDataURL(input.files[0]); 
    },
    
    setContextId(id) { this.contextId = id; },

    initFromUrl(url, type) { this.targetType = type; this.openCropModal(url); },

    openCropModal(src) { 
        document.getElementById('cropModal').classList.add('active'); 
        const img = document.getElementById('cropTarget'); 
        img.src = src; 
        
        img.onload = () => { 
            const container = document.getElementById('cropContainer');
            const cw = container.offsetWidth;
            const ch = container.offsetHeight;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            this.scale = Math.max(cw / iw, ch / ih);
            this.posX = (cw - (iw * this.scale)) / 2;
            this.posY = (ch - (ih * this.scale)) / 2;
            this.updateTransform(); 
            document.getElementById('cropZoom').value = this.scale; 
        } 
    },

    setZoom(val) { 
        const oldScale = this.scale;
        this.scale = parseFloat(val); 
        const container = document.getElementById('cropContainer');
        const cx = container.offsetWidth / 2;
        const cy = container.offsetHeight / 2;
        const centerX = (cx - this.posX) / oldScale;
        const centerY = (cy - this.posY) / oldScale;
        this.posX = cx - (centerX * this.scale);
        this.posY = cy - (centerY * this.scale);
        this.updateTransform(); 
    },

    handleWheel(e) {
        e.preventDefault();
        const slider = document.getElementById('cropZoom');
        const delta = -Math.sign(e.deltaY) * 0.02; 
        let newScale = this.scale + delta;
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        newScale = Math.max(min, Math.min(newScale, max));
        slider.value = newScale;
        this.setZoom(newScale);
    },

    startDrag(e) { 
        e.preventDefault(); 
        this.isDragging = true; 
        const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
        const clientY = e.touches ? e.touches[0].clientY : e.clientY; 
        this.startX = clientX - this.posX; 
        this.startY = clientY - this.posY; 
        
        const moveHandler = (ev) => { 
            if(!this.isDragging) return; 
            const cx = ev.touches ? ev.touches[0].clientX : ev.clientX; 
            const cy = ev.touches ? ev.touches[0].clientY : ev.clientY; 
            this.posX = cx - this.startX; 
            this.posY = cy - this.startY; 
            this.updateTransform(); 
        }; 
        
        const endHandler = () => { 
            this.isDragging = false; 
            document.removeEventListener('mousemove', moveHandler); 
            document.removeEventListener('mouseup', endHandler); 
            document.removeEventListener('touchmove', moveHandler); 
            document.removeEventListener('touchend', endHandler); 
        }; 
        
        document.addEventListener('mousemove', moveHandler); 
        document.addEventListener('mouseup', endHandler); 
        document.addEventListener('touchmove', moveHandler); 
        document.addEventListener('touchend', endHandler); 
    },

    updateTransform() { 
        document.getElementById('cropTarget').style.transform = `translate(${this.posX}px, ${this.posY}px) scale(${this.scale})`; 
    },

    save() {
        const guide = document.getElementById('cropGuide');
        const img = document.getElementById('cropTarget');
        const container = document.getElementById('cropContainer');
        const guideRect = guide.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const offsetLeft = guideRect.left - containerRect.left;
        const offsetTop = guideRect.top - containerRect.top;
        const width = guideRect.width;
        const height = guideRect.height;
        
        const canvas = document.createElement('canvas'); 
        canvas.width = width; canvas.height = height; 
        const ctx = canvas.getContext('2d'); 
        
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,width,height);
        ctx.translate(-offsetLeft, -offsetTop);
        ctx.translate(this.posX, this.posY);
        ctx.scale(this.scale, this.scale);
        ctx.drawImage(img, 0, 0); 
        
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        
        if(this.targetType === 'nomi') {
            app.setNomiPhoto(dataUrl, this.contextId);
        }
        else if(this.targetType === 'group') {
            app.setGroupPhoto(dataUrl, this.contextId);
        }
        else if (this.targetType === 'context') {
             const isGroup = app.data.groups.find(g => g.id === this.contextId);
             if(isGroup) app.setGroupPhoto(dataUrl, this.contextId);
             else app.setNomiPhoto(dataUrl, this.contextId);
        }
        
        this.cancel();
    },

    cancel() { 
        document.getElementById('cropModal').classList.remove('active'); 
        const n = document.getElementById('nomiPhotoInput'); if(n) n.value=''; 
        const g = document.getElementById('groupPhotoInput'); if(g) g.value='';
        const c = document.getElementById('contextUpload'); if(c) c.value='';
        this.contextId = null;
    }
};

class NomiApp {
    constructor() {
        this.db = null;
        this.data = { nomis: [], groups: [], settings: { theme: 'cyber', startView: 'home', lastNomi: null, apiKey: '', lastState: null } };
        this.currentNomiId = null;
        this.currentGroupId = null;
        this.contextMenuTarget = null;
        this.contextMenuType = null;
        this.isSyncing = false;
        this.isReordering = false;
        this.touchDragItem = null;
        this.resizeDebounce = null;
        this.dragSrcEl = null;
        this.isBatchMode = false;
        this.selectedImages = new Set();
        this.currentEditingImageId = null; 
        this.gallerySort = 'newest';
        this.gallerySize = 'medium';
        this.galleryShowPrompts = false;
        this.dashboardView = 'grid'; 
    }

    async init() {
        await this.openDB();
        await this.loadData();
        this.migrateData();
        
        if(this.data.settings.theme) localStorage.setItem('nomi_theme', this.data.settings.theme);
        this.applyTheme(this.data.settings?.theme || 'midnight');
        
        this.initStartView();
        
        const savedSize = localStorage.getItem('nomi_gallery_size') || 'medium';
        const sizes = ['small', 'medium', 'large', 'xlarge'];
        let sizeIdx = sizes.indexOf(savedSize);
        if(sizeIdx === -1) sizeIdx = 1;
        this.setGallerySize(sizeIdx);

        const savedDash = localStorage.getItem('nomi_dashboard_view') || 'grid';
        this.setDashboardView(savedDash, false); 

        this.renderGallery();
        
        document.getElementById('traitInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { this.addTrait(e.target.value); e.target.value = ''; document.getElementById('traitInput').style.display='none'; } });
        document.addEventListener('click', (e) => { 
            if(!e.target.closest('#memberDropdownWrapper')) document.getElementById('memberOptions').classList.remove('open'); 
            this.hideContextMenu();
        });
        document.addEventListener('paste', (e) => this.handleGlobalPaste(e));
        
        window.addEventListener('popstate', (event) => {
            document.getElementById('lightbox').classList.remove('active');
            if(event.state) {
                if(event.state.view === 'home') this.goHome(false);
                else if(event.state.view === 'nomi') this.editNomi(event.state.id, false, event.state.tab || 'profile');
                else if(event.state.view === 'group') this.editGroup(event.state.id, false, event.state.tab || 'profile');
            }
        });
        history.replaceState({view: 'home'}, '', '');
        
        setTimeout(() => document.body.style.opacity = '1', 50);

        if(this.data.settings.autoDownload) {
             const t = localStorage.getItem('nomi_gh_token');
             const g = localStorage.getItem('nomi_gist_id');
             if(t && g) this.cloudDownload(true);
        }
    }
    
    showContextMenu(e, id, type) {
        e.preventDefault();
        e.stopPropagation();
        this.contextMenuTarget = id;
        this.contextMenuType = type;
        const menu = document.getElementById('contextMenu');
        const targetObj = type === 'nomi' ? this.data.nomis.find(n => n.id === id) : this.data.groups.find(g => g.id === id);
        const name = targetObj.name;
        const close = "app.hideContextMenu()";

        let html = `<div style="padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.85rem; color:var(--accent); font-weight:bold; opacity:0.8;">${name}</div>`;
        html += `<div class="context-item" onclick="${close}; app.openRenamePopup()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Rename</div>`;
        html += `<div class="context-item" onclick="${close}; app.triggerContextUpload()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Change Photo</div>`;
        html += `<div class="context-item" onclick="${close}; app.copyProfilePicture()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy PFP</div>`;

        if(type === 'nomi') {
            html += `<div class="context-item" onclick="${close}; app.duplicateNomi(${id})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>Duplicate</div>`;
        }
        html += `<div class="context-item danger" onclick="${close}; app.deleteFromContext()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete</div>`;
        
        menu.innerHTML = html;
        menu.classList.add('active');
        this.toggleMobileBackdrop(true, 99998);
        let x = e.clientX; let y = e.clientY;
        const rect = menu.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
        if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
        menu.style.left = x + 'px'; menu.style.top = y + 'px';
    }
    
    // --- NEW GALLERY CONTEXT MENU ---
    showGalleryContextMenu(e, id) {
        e.preventDefault();
        e.stopPropagation();
        this.contextMenuTarget = id;
        this.contextMenuType = 'gallery';
        
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        const target = isGroup ? this.data.groups.find(g => g.id === this.currentGroupId) : this.data.nomis.find(n => n.id === this.currentNomiId);
        const imgObj = target.gallery.find(i => i.id === id);
        if(!imgObj) return;

        const menu = document.getElementById('contextMenu');
        const close = "app.hideContextMenu()";
        
        let html = `<div style="padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.85rem; color:var(--accent); font-weight:bold; opacity:0.8;">Image Options</div>`;
        
        // 1. Set As Avatar
        html += `<div class="context-item" onclick="${close}; app.selectGalleryImageOptions('${imgObj.img}', ${id})">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Set as Avatar
        </div>`;

        // 2. Edit Prompt
        html += `<div class="context-item" onclick="${close}; app.openPromptPopup(${id})">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path stroke-linecap="round" stroke-linejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit Prompt
        </div>`;

        // 3. Copy Image
        html += `<div class="context-item" onclick="${close}; app.copyGalleryImage()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy Image
        </div>`;

        html += `<div style="border-top:1px solid var(--border); margin:5px 0;"></div>`;
        
        // 4. Save Options (WebP, PNG, JPG)
        const saveIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

        html += `<div class="context-item" onclick="${close}; app.downloadGalleryImage('webp')">${saveIcon} Save as WebP <span style="opacity:0.5; font-size:0.7em; margin-left:auto;">(Small)</span></div>`;
        html += `<div class="context-item" onclick="${close}; app.downloadGalleryImage('png')">${saveIcon} Save as PNG <span style="opacity:0.5; font-size:0.7em; margin-left:auto;">(HQ)</span></div>`;
        html += `<div class="context-item" onclick="${close}; app.downloadGalleryImage('jpg')">${saveIcon} Save as JPG <span style="opacity:0.5; font-size:0.7em; margin-left:auto;">(Compat)</span></div>`;

        html += `<div style="border-top:1px solid var(--border); margin:5px 0;"></div>`;

        // 5. Delete
        html += `<div class="context-item danger" onclick="${close}; app.deleteGalleryItem(${id})">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path stroke-linecap="round" stroke-linejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            Delete
        </div>`;

        menu.innerHTML = html;
        menu.classList.add('active');
        this.toggleMobileBackdrop(true, 99998);
        let x = e.clientX; let y = e.clientY;
        const rect = menu.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
        if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
        menu.style.left = x + 'px'; menu.style.top = y + 'px';
    }

    async copyGalleryImage() {
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        const target = isGroup ? this.data.groups.find(g => g.id === this.currentGroupId) : this.data.nomis.find(n => n.id === this.currentNomiId);
        const imgObj = target.gallery.find(i => i.id === this.contextMenuTarget);
        if(!imgObj) return;

        try {
            this.showToast("Copying...");
            // Convert DataURL to Blob for Clipboard API
            const res = await fetch(imgObj.img);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            this.showToast("Copied to Clipboard!");
        } catch(err) {
            console.error(err);
            this.showToast("Copy failed (Browser restriction)");
        }
    }

    downloadGalleryImage(format = 'webp') {
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        const target = isGroup ? this.data.groups.find(g => g.id === this.currentGroupId) : this.data.nomis.find(n => n.id === this.currentNomiId);
        const imgObj = target.gallery.find(i => i.id === this.contextMenuTarget);
        if(!imgObj) return;

        // Map short format names to MIME types
        const mimeMap = {
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp'
        };
        const mime = mimeMap[format];

        // Create a temporary image to handle conversion
        const img = new Image();
        img.src = imgObj.img;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            
            // If saving as JPG, fill background with white (removes transparency issues)
            if(format === 'jpg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.drawImage(img, 0, 0);
            
            // Convert to requested format (0.9 quality for lossy formats)
            const dataUrl = canvas.toDataURL(mime, 0.9);
            
            const a = document.createElement('a');
            a.href = dataUrl;
            
            const dateStr = new Date().toISOString().slice(0,10);
            // Filename: Name_Date_ID.format
            a.download = `${target.name.replace(/\s+/g, '_')}_${dateStr}_${imgObj.id}.${format}`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    }
    
    hideContextMenu() { 
        document.getElementById('contextMenu').classList.remove('active'); 
        this.toggleMobileBackdrop(false); // New: Close backdrop
    }
    
    toggleMobileBackdrop(active, zIndex = 90) {
        const bd = document.getElementById('mobileBackdrop');
        if(active) {
            bd.style.zIndex = zIndex;
            bd.classList.add('active');
        } else {
            bd.classList.remove('active');
        }
    }

    closeAllMenus() {
        // Close Grid Menus
        document.querySelectorAll('.grid-menu.active').forEach(el => el.classList.remove('active'));
        // Close Context Menus
        this.hideContextMenu();
        // Hide Backdrop
        this.toggleMobileBackdrop(false);
    }
    
    async copyProfilePicture() {
        this.hideContextMenu();
        const id = this.contextMenuTarget;
        const type = this.contextMenuType;
        const target = type === 'nomi' ? this.data.nomis.find(n => n.id === id) : this.data.groups.find(g => g.id === id);
        if (!target || !target.photo) return this.showToast("No photo available");

        try {
            this.showToast("Copying...");
            const img = new Image();
            img.src = target.photo;
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    this.showToast("Profile Picture Copied!");
                } catch (err) { this.showToast("Clipboard Write Failed (HTTPS required)"); }
            }, 'image/png');
        } catch (err) { this.showToast("Failed to process image"); }
    }
    
    triggerContextUpload() { cropper.setContextId(this.contextMenuTarget); document.getElementById('contextUpload').click(); }
    openRenamePopup() {
        const id = this.contextMenuTarget; const type = this.contextMenuType;
        const target = type === 'nomi' ? this.data.nomis.find(n => n.id === id) : this.data.groups.find(g => g.id === id);
        document.getElementById('globalRenameInput').value = target.name;
        document.getElementById('globalInputPopup').classList.add('active');
        setTimeout(() => document.getElementById('globalRenameInput').focus(), 50);
    }
    confirmRename() {
        const val = document.getElementById('globalRenameInput').value; if(!val.trim()) return;
        const id = this.contextMenuTarget; const type = this.contextMenuType;
        const target = type === 'nomi' ? this.data.nomis.find(n => n.id === id) : this.data.groups.find(g => g.id === id);
        target.name = val; this.saveToDB(); this.renderGallery();
        document.getElementById('globalInputPopup').classList.remove('active'); this.showToast("Renamed!");
    }
    duplicateNomi(id) {
        if(!confirm("Duplicate this Nomi?")) return;
        const original = this.data.nomis.find(n => n.id === id); if(!original) return;
        const clone = JSON.parse(JSON.stringify(original));
        clone.id = Date.now(); clone.name = clone.name + " (Copy)"; clone.uuid = null;
        if(clone.gallery) { clone.gallery.forEach(img => img.id = Date.now() + Math.random()); }
        this.data.nomis.push(clone); this.saveToDB(); this.renderGallery(); this.showToast("Nomi Duplicated!");
    }
    deleteFromContext() {
        const id = this.contextMenuTarget; const type = this.contextMenuType;
        if(type === 'nomi') {
             if(confirm("Delete this Nomi permanently?")) {
                 this.data.nomis = this.data.nomis.filter(n => n.id !== id);
                 this.saveToDB(); this.renderGallery(); this.showToast("Deleted");
             }
        } else {
             if(confirm("Delete this Group?")) {
                 this.data.groups = this.data.groups.filter(g => g.id !== id);
                 this.saveToDB(); this.renderGallery(); this.showToast("Deleted");
             }
        }
    }

    setDashboardView(mode, render = true) {
        this.dashboardView = mode; localStorage.setItem('nomi_dashboard_view', mode);
        const btnGrid = document.getElementById('btnViewGrid'); const btnList = document.getElementById('btnViewList');
        if(btnGrid && btnList) {
            if(mode === 'grid') { btnGrid.classList.add('active'); btnList.classList.remove('active'); }
            else { btnList.classList.add('active'); btnGrid.classList.remove('active'); }
        }
        if(render) this.renderGallery();
    }
    
    toggleGallerySort() {
        this.gallerySort = this.gallerySort === 'newest' ? 'oldest' : 'newest';
        this.showToast(`Sorting: ${this.gallerySort === 'newest' ? 'Newest First' : 'Oldest First'}`);
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        const searchInputId = isGroup ? 'groupGallerySearch' : 'nomiGallerySearch';
        this.filterGallery(document.getElementById(searchInputId).value);
    }
    toggleGridMenu(btn) {
        document.querySelectorAll('.grid-menu').forEach(el => { if (el !== btn.nextElementSibling) el.classList.remove('active'); });
        const menu = btn.nextElementSibling; 
        menu.classList.toggle('active');
        
        // NEW: Toggle Backdrop for Mobile
        this.toggleMobileBackdrop(menu.classList.contains('active'), 90);

        const val = ['small', 'medium', 'large', 'xlarge'].indexOf(this.gallerySize);
        const currentVal = val === -1 ? 1 : val; 
        const slider = menu.querySelector('input'); if(slider) slider.value = currentVal;
        this.updateGridIcons(menu, currentVal);
        
        // Keep desktop click-outside logic
        if(menu.classList.contains('active')) {
            const closeFn = (e) => { 
                // If clicking backdrop, this listener will also fire and clean itself up
                if(!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) { 
                    menu.classList.remove('active'); 
                    this.toggleMobileBackdrop(false); // Ensure backdrop closes
                    document.removeEventListener('click', closeFn); 
                } 
            };
            setTimeout(() => document.addEventListener('click', closeFn), 0);
        }
    }
    setGallerySize(val) {
        const sizes = ['small', 'medium', 'large', 'xlarge'];
        this.gallerySize = sizes[val]; localStorage.setItem('nomi_gallery_size', this.gallerySize);
        const sizeMap = { small: '100px', medium: '160px', large: '260px', xlarge: '360px' };
        ['promptGalleryGrid', 'groupPromptGalleryGrid'].forEach(id => {
            const el = document.getElementById(id); if(el) el.style.setProperty('--grid-min', sizeMap[this.gallerySize]);
        });
        document.querySelectorAll('.custom-slider').forEach(el => el.value = val);
        document.querySelectorAll('.grid-menu').forEach(menu => this.updateGridIcons(menu, val));
    }
    updateGridIcons(menu, val) {
        menu.querySelectorAll('.grid-slider-row svg').forEach((svg, i) => { if(i == val) svg.classList.add('selected'); else svg.classList.remove('selected'); });
    }
    toggleShowPrompts() {
        this.galleryShowPrompts = !this.galleryShowPrompts;
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        const searchInputId = isGroup ? 'groupGallerySearch' : 'nomiGallerySearch';
        this.filterGallery(document.getElementById(searchInputId).value);
    }
    handleGlobalPaste(e) {
        const isNomiGallery = document.getElementById('viewNomi').style.display === 'block' && document.getElementById('tabGallery').classList.contains('active');
        const isGroupGallery = document.getElementById('viewGroup').style.display === 'block' && document.getElementById('tabGroupGallery').classList.contains('active');
        if(isNomiGallery || isGroupGallery) {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            let found = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile(); this.addBlobToGallery(blob); found = true;
                }
            }
            if(found) { e.preventDefault(); this.showToast("Pasted from clipboard!"); }
        }
    }
    async pasteGalleryImage() {
        try {
            const items = await navigator.clipboard.read();
            let found = false;
            for (const item of items) {
                const type = item.types.find(t => t.startsWith('image/'));
                if (type) {
                    const blob = await item.getType(type); this.addBlobToGallery(blob); found = true;
                }
            }
            if(found) this.showToast("Pasted from clipboard!"); else this.showToast("No image found on clipboard");
        } catch (err) { console.error(err); alert("Clipboard access blocked. Please use Ctrl+V (Cmd+V) to paste directly."); }
    }
    async pasteText(id) {
        try {
            const text = await navigator.clipboard.readText();
            const el = document.getElementById(id);
            if(el) {
                if (typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
                    const start = el.selectionStart; const end = el.selectionEnd; const val = el.value;
                    el.value = val.substring(0, start) + text + val.substring(end); el.selectionStart = el.selectionEnd = start + text.length;
                } else { el.value += text; }
                el.dispatchEvent(new Event('input', { bubbles: true })); this.showToast("Pasted!");
            }
        } catch (err) { console.error(err); alert("Clipboard permission denied. Please paste manually."); }
    }
    addBlobToGallery(blob) {
        this.processImage(blob, 1024, (b64) => {
            const isGroup = document.getElementById('viewGroup').style.display === 'block';
            let target;
            if(isGroup) target = this.data.groups.find(x => x.id === this.currentGroupId);
            else target = this.data.nomis.find(x => x.id === this.currentNomiId);
            if (!target.gallery) target.gallery = [];
            target.gallery.push({ id: Date.now() + Math.random(), img: b64, prompt: "" });
            this.saveToDB().then(() => this.renderPromptGallery());
        });
    }
    migrateData() {
        this.data.nomis.forEach(n => {
            if(n.isFavorite === undefined) n.isFavorite = false;
            if(!n.custom_sections) n.custom_sections = [];
            if(!n.sectionOrder) { n.sectionOrder = DEFAULT_SECTIONS.map(s => s.id); n.custom_sections.forEach(cs => n.sectionOrder.push(cs.id)); }
            if(!n.banner) n.banner = null;
        });
        this.data.groups.forEach(g => {
            if(!g.sectionOrder && g.custom_sections) { g.sectionOrder = ['backstory']; g.custom_sections.forEach(cs => g.sectionOrder.push(cs.id)); }
            if(!g.banner) g.banner = null;
            if(!g.gallery) g.gallery = []; 
            // MIGRATE MEMBERS TO OBJECTS
            if(g.members && g.members.length > 0 && typeof g.members[0] !== 'object') {
                g.members = g.members.map(id => ({ id: id, role: "" }));
            }
        });
    }
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains('data')) db.createObjectStore('data', { keyPath: 'id' }); };
            request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            request.onerror = (e) => reject(e);
        });
    }
    saveToDB(skipAutoUpload = false) {
        return new Promise((resolve, reject) => {
            const t = this.db.transaction(['data'], 'readwrite');
            t.objectStore('data').put({ id: 'root', nomis: this.data.nomis, groups: this.data.groups, settings: this.data.settings });
            t.oncomplete = () => { if (this.data.settings.autoUpload && !skipAutoUpload) { this.triggerAutoUpload(); } resolve(); };
            t.onerror = reject;
        });
    }
    loadData() {
        return new Promise((resolve, reject) => {
            const t = this.db.transaction(['data'], 'readonly');
            t.objectStore('data').get('root').onsuccess = (e) => {
                if (e.target.result) {
                    this.data = e.target.result;
                }
                
                // SELF-HEALING: Always ensure these exist
                if (!this.data.nomis) this.data.nomis = [];
                if (!this.data.groups) this.data.groups = [];
                if (!this.data.settings) this.data.settings = {};
                
                // Ensure critical settings defaults
                if (!this.data.settings.theme) this.data.settings.theme = 'midnight';
                if (!this.data.settings.syncCache) this.data.settings.syncCache = {};
                
                resolve();
            };
        });
    }
    toggleCloudSync(checked) { this.data.settings.autoUpload = checked; this.data.settings.autoDownload = checked; this.saveToDB(); }
    triggerAutoUpload() { if (this.uploadTimer) clearTimeout(this.uploadTimer); this.cloudUpload(true); }
    toggleSettings() {
        const m = document.getElementById('settingsModal'); m.classList.toggle('active');
        if(m.classList.contains('active')) { 
            document.getElementById('themeSelect').value = this.data.settings.theme || 'midnight';
            document.getElementById('startUpSelect').value = this.data.settings.startView || 'home'; 
            document.getElementById('apiKeyInput').value = this.data.settings.apiKey || ''; 
            document.getElementById('ghTokenInput').value = localStorage.getItem('nomi_gh_token') || '';
            document.getElementById('gistIdInput').value = localStorage.getItem('nomi_gist_id') || '';
            ['apiKeyInput', 'ghTokenInput', 'gistIdInput'].forEach(id => {
                document.getElementById(id).readOnly = true;
                const btn = document.getElementById(id).nextElementSibling;
                if(btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
                if(btn) btn.classList.remove('active');
            });
            document.getElementById('cloudSyncCheck').checked = this.data.settings.autoUpload || false;
            
            // NEW: Render the Storage Dashboard
            this.renderStorageDashboard();
        }
    }
    
    // NEW FUNCTION: STORAGE CALCULATOR & DASHBOARD
    async renderStorageDashboard() {
        // 1. Calculate Sizes
        const getSize = (obj) => new Blob([JSON.stringify(obj)]).size;
        
        let nomiTotal = 0;
        let groupTotal = 0;
        let totalImgCount = 0;
        let allItems = [];

        this.data.nomis.forEach(n => {
            const size = getSize(n);
            nomiTotal += size;
            const imgCount = (n.gallery ? n.gallery.length : 0) + (n.photo ? 1 : 0);
            totalImgCount += imgCount;
            allItems.push({ name: n.name, size: size, type: 'nomi' });
        });

        this.data.groups.forEach(g => {
            const size = getSize(g);
            groupTotal += size;
            const imgCount = (g.gallery ? g.gallery.length : 0) + (g.photo ? 1 : 0);
            totalImgCount += imgCount;
            allItems.push({ name: g.name, size: size, type: 'group' });
        });

        const totalUsed = nomiTotal + groupTotal;

        // 2. Update Bar Widths
        const pNomis = totalUsed > 0 ? (nomiTotal / totalUsed) * 100 : 0;
        const pGroups = totalUsed > 0 ? (groupTotal / totalUsed) * 100 : 0;
        
        document.getElementById('barNomis').style.width = pNomis + '%';
        document.getElementById('barGroups').style.width = pGroups + '%';

        // 3. Update Grid Stats
        document.getElementById('statTotalImages').innerText = totalImgCount;
        document.getElementById('statTotalNomis').innerText = this.data.nomis.length;

        // Storage Used
        const mbUsed = (totalUsed / 1024 / 1024).toFixed(2);
        const elUsed = document.getElementById('statStorageUsed');
        if(elUsed) elUsed.innerText = `${mbUsed} MB`;

        // 4. Update Top List
        allItems.sort((a, b) => b.size - a.size);
        const top3 = allItems.slice(0, 3);
        const listEl = document.getElementById('storageTopList');
        listEl.innerHTML = '';
        
        if(top3.length === 0) {
            listEl.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-muted); font-size:0.8rem;">No Data</div>';
        } else {
            top3.forEach(item => {
                const mb = (item.size / 1024 / 1024).toFixed(2);
                const dotClass = item.type === 'nomi' ? 'nomi' : 'group';
                listEl.innerHTML += `
                    <div class="storage-list-item">
                        <div class="list-name"><div class="legend-dot ${dotClass}"></div>${item.name}</div>
                        <div class="list-size">${mb} MB</div>
                    </div>`;
            });
        }
    }

    toggleEdit(inputId, btn, type) {
        const input = document.getElementById(inputId); const isLocked = input.readOnly;
        if (isLocked) { input.readOnly = false; input.focus(); btn.classList.add('active'); btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'; } else { input.readOnly = true; btn.classList.remove('active'); btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>'; const val = input.value; if (type === 'apiKey') this.saveSetting('apiKey', val); else if (type === 'ghToken') localStorage.setItem('nomi_gh_token', val); else if (type === 'gistId') localStorage.setItem('nomi_gist_id', val); this.showToast("Saved!"); }
    }
    
    setTheme(name) { this.data.settings.theme = name; localStorage.setItem('nomi_theme', name); this.applyTheme(name); this.saveToDB(true); }
    applyTheme(name) {
        // CHECK: Does window.Theme exist?
        if (window.Theme && typeof window.Theme.applyThemeVars === 'function') {
            window.Theme.applyThemeVars(name);
        } else {
            // FALLBACK: If theme.js didn't load, manually apply "Midnight" default 
            // so the app isn't just a blank screen.
            console.warn("Theme.js missing. Applying fallback styles.");
            const root = document.documentElement;
            root.style.setProperty('--bg-body', '#0f1115');
            root.style.setProperty('--bg-card', '#181b21');
            root.style.setProperty('--text-main', '#e4e4e7');
            root.style.setProperty('--accent', '#c084fc');
            // This prevents the "undefined" crash
        }
        
        // Refresh the gallery if it is currently visible
        const gallery = document.getElementById('nomiGallery'); 
        if(gallery && gallery.innerHTML !== "") this.renderGallery(); 
    }
    saveSetting(k, v) { this.data.settings[k] = v; const isLocal = (k === 'theme' || k === 'startView' || k === 'apiKey'); this.saveToDB(isLocal); }
    saveState(viewType, id = null) { this.data.settings.lastState = { view: viewType, id: id }; this.saveToDB(true); }
    flashSyncSuccess() { const pill = document.getElementById('syncBtn'); pill.classList.add('success'); setTimeout(() => { pill.classList.remove('success'); }, 1500); }
    
    // --- UPDATED SPLIT SYNC LOGIC ---

    async uploadFileBatch(filesObj, token, gistId) {
        return fetch(`https://api.github.com/gists/${gistId}`, { 
            method: 'PATCH', 
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ files: filesObj }) 
        });
    }

    // --- SMART SYNC HELPER ---
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    // --- UPDATED SMART SYNC ---
    // --- UPDATED SMART SYNC (FIXED DELETION) ---
    async cloudUpload(silent = false) {
        const token = localStorage.getItem('nomi_gh_token'); 
        const gistId = localStorage.getItem('nomi_gist_id');
        if (!token || !gistId) { if(!silent) alert("Please enter both a GitHub Token and Gist ID."); return; }
        
        if(!silent && !confirm("Overwrite Cloud Save with current data?")) return;

        const pill = document.getElementById('syncBtn'); 
        const icon = document.getElementById('syncIcon'); 
        const text = document.getElementById('syncText');
        
        if (silent) { pill.classList.add('expanded'); icon.classList.add('spin'); text.innerText = "Checking..."; } 
        else { this.showToast("Analyzing changes..."); }

        try {
            // 1. Get current Gist status
            const currentGistRes = await fetch(`https://api.github.com/gists/${gistId}`, { 
                method: 'GET', headers: { 'Authorization': `token ${token}` } 
            });
            
            if(!currentGistRes.ok) throw new Error("Could not access Gist.");
            const currentGist = await currentGistRes.json();
            const currentFiles = currentGist.files || {};
            
            // Load local sync cache (maps filename -> hash)
            let syncCache = this.data.settings.syncCache || {};
            let filesToUpload = {};
            let uploadCount = 0;

            // 2. DETECT DELETIONS
            // If a file exists in Cloud but not locally, delete it from Cloud
            const localNomiIds = new Set(this.data.nomis.map(n => `n_${n.id}.json`));
            const localGroupIds = new Set(this.data.groups.map(g => `g_${g.id}.json`));

            Object.keys(currentFiles).forEach(filename => {
                // Delete legacy monolith if exists
                if(filename === "nomi-data.json") { 
                    filesToUpload[filename] = null; // FIX: Send raw null to delete
                    uploadCount++; 
                }

                // Check for deleted Nomis
                if(filename.startsWith('n_') && filename.endsWith('.json')) {
                    if(!localNomiIds.has(filename)) { 
                        filesToUpload[filename] = null; // FIX: Send raw null to delete
                        delete syncCache[filename]; 
                        uploadCount++;
                    }
                }
                // Check for deleted Groups
                if(filename.startsWith('g_') && filename.endsWith('.json')) {
                    if(!localGroupIds.has(filename)) { 
                        filesToUpload[filename] = null; // FIX: Send raw null to delete
                        delete syncCache[filename]; 
                        uploadCount++;
                    }
                }
            });

            // 3. DETECT CHANGES (SMART HASHING)
            
            // Helper to check and queue
            const checkAndQueue = (filename, dataObj) => {
                const content = JSON.stringify(dataObj);
                const hash = this.simpleHash(content);
                
                // If hash changed OR file doesn't exist in cloud yet -> Upload
                if (syncCache[filename] !== hash || !currentFiles[filename]) {
                    filesToUpload[filename] = { content: content };
                    syncCache[filename] = hash; // Update local cache
                    uploadCount++;
                    return true;
                }
                return false;
            };

            // Check Nomis
            for (const n of this.data.nomis) {
                checkAndQueue(`n_${n.id}.json`, n);
            }

            // Check Groups
            for (const g of this.data.groups) {
                checkAndQueue(`g_${g.id}.json`, g);
            }

            // Check Meta Files (Always check these)
            const metaSettings = { ...this.data.settings };
            delete metaSettings.theme; delete metaSettings.startView; delete metaSettings.syncCache; 
            checkAndQueue("settings.json", metaSettings);
            
            checkAndQueue("index.json", {
                nomis: this.data.nomis.map(n => ({ id: n.id, name: n.name })),
                groups: this.data.groups.map(g => ({ id: g.id, name: g.name }))
            });

            // 4. EXECUTE UPLOAD
            if(uploadCount === 0) {
                 if(silent) { 
                    text.innerText = "Up to Date"; 
                    setTimeout(() => { pill.classList.remove('expanded'); icon.classList.remove('spin'); }, 2000); 
                } else { 
                    this.showToast("Already up to date!"); 
                }
                // Save the cache anyway just in case
                this.data.settings.syncCache = syncCache;
                this.saveToDB(true);
                return;
            }

            if(silent) text.innerText = `Syncing ${uploadCount} files...`;
            else this.showToast(`Uploading ${uploadCount} changes...`);

            // Send to GitHub (Gist API accepts multiple files in one PATCH request)
            await fetch(`https://api.github.com/gists/${gistId}`, { 
                method: 'PATCH', 
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ files: filesToUpload }) 
            });

            // Save the new cache locally
            this.data.settings.syncCache = syncCache;
            await this.saveToDB(true); // Save local DB with new cache

            // Success UI
            if(silent) { 
                text.innerText = "Synced"; this.flashSyncSuccess(); 
                setTimeout(() => { pill.classList.remove('expanded'); icon.classList.remove('spin'); }, 2000); 
            } else { 
                this.showToast("Cloud Upload Complete!"); this.flashSyncSuccess(); 
            }

        } catch (e) {
            console.error(e);
            alert("SYNC FAILED: " + e.message);
            if(silent) { pill.classList.remove('expanded'); icon.classList.remove('spin'); }
        }
    }

    async cloudDownload(silent = false) {
        const token = localStorage.getItem('nomi_gh_token'); 
        const gistId = localStorage.getItem('nomi_gist_id');
        if (!token || !gistId) { if(!silent) alert("Please enter keys."); return; }
        
        if(!silent && !confirm("Overwrite LOCAL data with Cloud Save?")) return;

        const pill = document.getElementById('syncBtn'); 
        const icon = document.getElementById('syncIcon'); 
        const text = document.getElementById('syncText');
        
        if(silent) { pill.classList.add('expanded'); icon.classList.add('spin'); text.innerText = "Downloading..."; } 
        else { this.showToast("Connecting to Cloud..."); }

        try {
            const res = await fetch(`https://api.github.com/gists/${gistId}`, { method: 'GET', headers: { 'Authorization': `token ${token}` } });
            if (!res.ok) throw new Error("Failed to connect");
            const gist = await res.json();
            const files = gist.files || {};

            // CHECK FOR LEGACY MONOLITH
            if(files["nomi-data.json"]) {
                if(!silent) alert("Old backup format detected. Migrating...");
                
                // 1. Download the old data
                const rawUrl = files["nomi-data.json"].raw_url;
                const rawRes = await fetch(rawUrl);
                const oldData = await rawRes.json();
                
                // 2. Load it into the app
                this.data = oldData;
                await this.saveToDB(true);
                
                // 3. Delete the old file from cloud & create new split files
                console.log("Migrating legacy file...");
                await this.cloudUpload(true); 

                // 4. Update the screen WITHOUT reloading (Breaks the loop)
                if(!silent) alert("Migration complete!");
                this.applyTheme(this.data.settings.theme || 'midnight');
                this.renderGallery();
                
                // 5. Update Storage Dashboard if open
                if(document.getElementById('settingsModal').classList.contains('active')) {
                    this.renderStorageDashboard();
                }
                
                return;
            }

            if(!files["settings.json"]) throw new Error("No Nomi data found.");

            // Parallel Download Logic
            const downloadPromises = [];
            
            // 1. Download Settings
            downloadPromises.push(fetch(files["settings.json"].raw_url).then(r => r.json()).then(d => ({ type: 'settings', data: d })));

            // 2. Identify all data files
            Object.keys(files).forEach(filename => {
                if(filename.startsWith('n_') && filename.endsWith('.json')) {
                    downloadPromises.push(fetch(files[filename].raw_url).then(r => r.json()).then(d => ({ type: 'nomi', data: d })));
                }
                else if(filename.startsWith('g_') && filename.endsWith('.json')) {
                    downloadPromises.push(fetch(files[filename].raw_url).then(r => r.json()).then(d => ({ type: 'group', data: d })));
                }
            });

            if(!silent) this.showToast(`Downloading ${downloadPromises.length} files...`);

            // Execute Downloads
            const results = await Promise.all(downloadPromises);

            // Reassemble Data
            const newData = { nomis: [], groups: [], settings: {} };
            
            results.forEach(res => {
                if(res.type === 'settings') newData.settings = res.data;
                else if(res.type === 'nomi') newData.nomis.push(res.data);
                else if(res.type === 'group') newData.groups.push(res.data);
            });

            // Restore Local-only settings
            const currentTheme = this.data.settings.theme;
            const currentStartView = this.data.settings.startView;
            
            this.data = newData;
            if(!this.data.settings) this.data.settings = {};
            if(currentTheme) this.data.settings.theme = currentTheme;
            if(currentStartView) this.data.settings.startView = currentStartView;

            this.applyTheme(this.data.settings.theme || 'cyber');
            await this.saveToDB(true);

            if(silent) { 
                text.innerText = "Synced"; this.flashSyncSuccess(); this.renderGallery();
                setTimeout(() => { pill.classList.remove('expanded'); icon.classList.remove('spin'); }, 2000); 
            } else { 
                alert("✅ Download Complete. Reloading..."); location.reload(); 
            }

        } catch (e) {
            console.error(e);
            if(!silent) alert("Download Error: " + e.message);
            if(silent) { pill.classList.remove('expanded'); icon.classList.remove('spin'); }
        }
    }
    
    toggleCloudHelp() { document.getElementById('cloudHelpModal').classList.toggle('active'); }
    exportCloudCreds() { const token = localStorage.getItem('nomi_gh_token'); const gistId = localStorage.getItem('nomi_gist_id'); if(!token || !gistId) return alert("No Cloud Keys found to export."); const keys = { token: token, gistId: gistId }; const s = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keys)); const a = document.createElement('a'); a.href = s; a.download = "nomi_cloud_keys.json"; document.body.appendChild(a); a.click(); a.remove(); }
    importCloudCreds(input) { const f = input.files[0]; if(!f) return; const r = new FileReader(); r.onload = (e) => { try { const j = JSON.parse(e.target.result); if(j.token && j.gistId) { localStorage.setItem('nomi_gh_token', j.token); localStorage.setItem('nomi_gist_id', j.gistId); document.getElementById('ghTokenInput').value = j.token; document.getElementById('gistIdInput').value = j.gistId; alert("✅ Keys Imported Successfully!"); } else { alert("Invalid Key File."); } } catch (err) { alert("Error reading file."); } input.value = ''; }; r.readAsText(f); }
    async syncFromApi() {
        if (this.isSyncing) return;
        
        // 1. Get and Clean Key
        let key = this.data.settings.apiKey;
        if (!key) { 
            alert("Please go to Settings and enter your Nomi.ai API Key first."); 
            this.toggleSettings(); 
            return; 
        }
        key = key.trim(); // Fix: Remove accidental spaces

        this.isSyncing = true;
        const pill = document.getElementById('syncBtn');
        const icon = document.getElementById('syncIcon');
        const text = document.getElementById('syncText');
        
        pill.classList.add('expanded');
        icon.classList.add('spin');
        text.innerText = "Connecting...";

        const fetchWithProxy = async (url) => {
            const myWorker = "nomi-proxy.nickszumila.workers.dev/?url="; 
            
            try {
                const res = await fetch(myWorker + encodeURIComponent(url), { headers: { "Authorization": key } });
                if (res.status === 401 || res.status === 403) throw new Error("Invalid API Key");
                if (res.ok) return res;
            } catch (e) {
                if (e.message === "Invalid API Key") throw e;
                console.error("Worker failed", e);
            }
            throw new Error("Unable to connect to Nomi.ai via Cloudflare Worker.");
        };

        try {
            // 2. Fetch Nomi List
            const listRes = await fetchWithProxy("https://api.nomi.ai/v1/nomis");
            const listData = await listRes.json();

            if (!listData || !listData.nomis) throw new Error("Invalid data received from API.");

            let added = 0;
            let updated = 0;
            text.innerText = "Importing...";

            // 3. Process Each Nomi
            for (const r of listData.nomis) {
                // Find existing by UUID or Name
                let l = this.data.nomis.find(n => n.uuid === r.uuid || n.name === r.name);

                if (!l) {
                    // Create New
                    l = {
                        id: Date.now() + Math.random(),
                        uuid: r.uuid,
                        name: r.name,
                        photo: null,
                        banner: null,
                        data: { key_traits: [] },
                        gallery: [],
                        custom_sections: [],
                        sectionOrder: DEFAULT_SECTIONS.map(s => s.id),
                        isFavorite: false
                    };
                    this.data.nomis.push(l);
                    added++;
                } else {
                    // Link existing
                    if (!l.uuid) l.uuid = r.uuid;
                    updated++;
                }

                // 4. Fetch Avatar (Only if missing)
                if (!l.photo) {
                    try {
                        const avRes = await fetchWithProxy(`https://api.nomi.ai/v1/nomis/${r.uuid}/avatar`);
                        const b = await avRes.blob();
                        l.photo = await new Promise(resolve => {
                            const fr = new FileReader();
                            fr.onloadend = () => resolve(fr.result);
                            fr.readAsDataURL(b);
                        });
                        
                        // Add to gallery as first image
                        if (!l.gallery) l.gallery = [];
                        l.gallery.unshift({
                            id: Date.now() + Math.random(),
                            img: l.photo,
                            prompt: "Imported from Nomi.ai"
                        });
                    } catch (e) {
                        console.warn(`Failed to load avatar for ${l.name}`, e);
                    }
                }
            }

            await this.saveToDB();
            this.renderGallery(false);
            
            this.flashSyncSuccess();
            alert(`Import Complete:\n• ${added} New Nomis\n• ${updated} Updated`);

        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            this.isSyncing = false;
            pill.classList.remove('expanded');
            icon.classList.remove('spin');
        }
    }
    initStartView() { if(this.data.settings.startView === 'last' && this.data.settings.lastState) { const state = this.data.settings.lastState; if(state.view === 'nomi' && state.id) { const exists = this.data.nomis.find(n => n.id === state.id); if(exists) return this.editNomi(state.id); } else if(state.view === 'group' && state.id) { const exists = this.data.groups.find(g => g.id === state.id); if(exists) return this.editGroup(state.id); } } this.goHome(); }
    goHome(pushHistory = true) { this.isReordering = false; this.isBatchMode = false; this.selectedImages.clear(); document.getElementById('viewHome').style.display = 'block'; document.getElementById('viewNomi').style.display = 'none'; document.getElementById('viewGroup').style.display = 'none'; document.getElementById('heroBackground').style.backgroundImage = 'none'; this.currentNomiId = null; this.currentGroupId = null; this.renderGallery(false); this.saveState('home'); if(pushHistory) history.pushState({view: 'home'}, '', '#home'); }
    switchTab(t) {
        if(this.currentNomiId) history.replaceState({view: 'nomi', id: this.currentNomiId, tab: t}, '', '#nomi/'+this.currentNomiId);
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
        document.getElementById('tab' + (t.charAt(0).toUpperCase() + t.slice(1))).classList.add('active');
        this.isReordering = false;
        const btnNomi = document.getElementById('btnSortNomi'); if(btnNomi) btnNomi.classList.remove('active'); const rstNomi = document.getElementById('btnResetNomi'); if(rstNomi) rstNomi.style.visibility = 'hidden';
        if (t === 'profile') { document.getElementById('contentProfile').style.display = 'block'; document.getElementById('contentGallery').style.display = 'none'; this.renderFormGrid(); } else { document.getElementById('contentProfile').style.display = 'none'; document.getElementById('contentGallery').style.display = 'block'; this.renderPromptGallery(); }
    }
    switchGroupTab(t) {
        if(this.currentGroupId) history.replaceState({view: 'group', id: this.currentGroupId, tab: t}, '', '#group/'+this.currentGroupId);
        document.querySelectorAll('#viewGroup .tab-btn').forEach(b => b.classList.remove('active')); 
        document.getElementById('tabGroup' + (t.charAt(0).toUpperCase() + t.slice(1))).classList.add('active');
        this.isReordering = false;
        const btnGroup = document.getElementById('btnSortGroup'); if(btnGroup) btnGroup.classList.remove('active'); const rstGroup = document.getElementById('btnResetGroup'); if(rstGroup) rstGroup.style.visibility = 'hidden';
        
        document.getElementById('contentGroupProfile').style.display = 'none';
        document.getElementById('contentGroupGallery').style.display = 'none';
        document.getElementById('contentGroupMembers').style.display = 'none';
        
        if(t === 'profile') { 
            document.getElementById('contentGroupProfile').style.display = 'block'; 
            this.renderGroupSections(); 
        } else if (t === 'gallery') { 
            document.getElementById('contentGroupGallery').style.display = 'block'; 
            this.renderPromptGallery(); 
        } else if (t === 'members') {
            document.getElementById('contentGroupMembers').style.display = 'block';
            this.renderGroupMembers();
        }
    }
    createNomi() { const n = { id: Date.now(), name: "New Nomi", photo: null, banner: null, data: {}, gallery: [], custom_sections: [], sectionOrder: DEFAULT_SECTIONS.map(s=>s.id), isFavorite: false }; this.data.nomis.push(n); this.saveToDB().then(() => this.editNomi(n.id)); }
    
    editNomi(id, pushHistory = true, initialTab = 'profile') { 
        this.currentNomiId = id; 
        this.saveState('nomi', id);
        this.isReordering = false;
        
        const btnNomi = document.getElementById('btnSortNomi');
        if(btnNomi) btnNomi.classList.remove('active');
        const rstNomi = document.getElementById('btnResetNomi');
        if(rstNomi) rstNomi.style.visibility = 'hidden';
        this.isBatchMode = false;
        this.selectedImages.clear();

        if(pushHistory) history.pushState({view: 'nomi', id: id, tab: initialTab}, '', '#nomi/'+id);
        
        const n = this.data.nomis.find(x => x.id === id); 
        if(!n.sectionOrder) { n.sectionOrder = DEFAULT_SECTIONS.map(s=>s.id); (n.custom_sections||[]).forEach(c=>n.sectionOrder.push(c.id)); } 
        
        document.getElementById('viewHome').style.display = 'none'; 
        document.getElementById('viewNomi').style.display = 'block'; 
        document.getElementById('viewGroup').style.display = 'none'; 
        
        window.scrollTo(0, 0);
        this.switchTab(initialTab); 
        
        this.toggleNameEdit('nomi', false); 
        document.getElementById('nomiNameDisplay').innerText = n.name; 
        document.getElementById('nomiName').value = n.name; 
        
        const disp = document.getElementById('nomiImageDisplay'); 
        const plac = document.getElementById('nomiImagePlaceholder'); 
        
        if(n.photo) { 
            disp.src = n.photo; disp.style.display='block'; plac.style.display='none'; 
        } else { 
            disp.style.display='none'; plac.style.display='flex'; 
            plac.innerText = n.name ? n.name.charAt(0) : '?';
        }

        this.renderTraits(); 
        this.renderFormGrid(); 
    }

    selectGalleryImageOptions(imgUrl, imgId) {
        cropper.initFromUrl(imgUrl, this.currentNomiId ? 'nomi' : 'group');
    }
    
    toggleFavorite(e, id) { e.stopPropagation(); const n = this.data.nomis.find(x => x.id === id); n.isFavorite = !n.isFavorite; this.saveToDB(); this.renderGallery(false); }
    
    renderGallery(animate = false) { 
        const isList = this.dashboardView === 'list';
        const g = document.getElementById('nomiGallery'); 
        const gg = document.getElementById('groupGallery'); 
        if(g) { g.innerHTML = ''; if(isList) g.classList.add('list-mode'); else g.classList.remove('list-mode'); }
        if(gg) { gg.innerHTML = ''; if(isList) gg.classList.add('list-mode'); else gg.classList.remove('list-mode'); }

        const term = document.getElementById('searchInput').value.toLowerCase(); 
        
        let sorted = this.data.nomis.filter(n => n.name.toLowerCase().includes(term)).sort((a,b) => (b.isFavorite === a.isFavorite) ? 0 : b.isFavorite ? 1 : -1); 
        
        sorted.forEach(n => { 
            const favClass = n.isFavorite ? 'active' : ''; 
            const animClass = animate ? 'pop-in' : ''; 
            const letter = n.name ? n.name.charAt(0) : '?';
            const imgHtml = n.photo 
                ? `<img src="${n.photo}" loading="lazy">` 
                : `<div class="card-placeholder">${letter}</div>`;
            const html = `
                <div class="nomi-card ${animClass}" onclick="app.editNomi(${n.id})" oncontextmenu="app.showContextMenu(event, ${n.id}, 'nomi')">
                    ${imgHtml}
                    <button class="fav-btn ${favClass}" onclick="app.toggleFavorite(event, ${n.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                    <div class="nomi-card-info">${n.name}</div>
                </div>`; 
            g.insertAdjacentHTML('beforeend', html); 
        }); 
        
        this.data.groups.filter(gr => gr.name.toLowerCase().includes(term)).forEach(gr => { 
            const animClass = animate ? 'pop-in' : '';
            const letter = gr.name ? gr.name.charAt(0) : '?';
            const imgHtml = gr.photo 
                ? `<img src="${gr.photo}" loading="lazy">` 
                : `<div class="card-placeholder">${letter}</div>`;
            const html = `
                <div class="nomi-card ${animClass}" onclick="app.editGroup(${gr.id})" oncontextmenu="app.showContextMenu(event, ${gr.id}, 'group')">
                    ${imgHtml}
                    <div class="nomi-card-info">${gr.name}</div>
                </div>`; 
            gg.insertAdjacentHTML('beforeend', html); 
        }); 
    }
    
    toggleNameEdit(type, isEditing) {
        const display = document.getElementById(type + 'NameDisplay');
        const btn = document.getElementById(type + 'EditBtn'); 
        const editor = document.getElementById(type + 'NameEdit');
        
        if(isEditing) {
            if(type === 'nomi') document.getElementById('nomiName').value = this.data.nomis.find(n=>n.id===this.currentNomiId).name;
            else document.getElementById('groupName').value = this.data.groups.find(g=>g.id===this.currentGroupId).name;

            display.style.display = 'none';
            btn.style.display = 'none';
            editor.classList.add('active');
            document.getElementById(type + 'Name').focus();
        } else {
            display.style.display = 'block';
            btn.style.display = 'flex'; 
            editor.classList.remove('active');
        }
    }

    cancelNameEdit(type) {
        let currentName = "";
        if (type === 'nomi') {
            const n = this.data.nomis.find(x => x.id === this.currentNomiId);
            currentName = n.name;
        } else {
            const g = this.data.groups.find(x => x.id === this.currentGroupId);
            currentName = g.name;
        }
        document.getElementById(type + 'Name').value = currentName;
        this.toggleNameEdit(type, false);
    }

    cancelSection(id, isGroup) {
        if (isGroup) {
            const g = this.data.groups.find(x => x.id === this.currentGroupId);
            let val = "";
            if (id === 'backstory') val = g.backstory || "";
            else {
                const s = g.custom_sections.find(cs => cs.id === id);
                val = s ? s.content : "";
            }
            document.getElementById(`group_sec_${id}`).value = val;
            this.updateGroupSectionContent(id, val);
        } else {
            const n = this.data.nomis.find(x => x.id === this.currentNomiId);
            let val = "";
            const def = DEFAULT_SECTIONS.find(d => d.id === id);
            if (def) val = n.data[id] || "";
            else {
                const s = n.custom_sections.find(cs => cs.id === id);
                val = s ? s.content : "";
            }
            document.getElementById(`field_${id}`).value = val;
            this.handleInput(id, 5000, !def);
        }
        this.showToast("Changes Reverted");
    }
    
    saveName(type) { 
        const val = document.getElementById(type + 'Name').value; 
        if(type === 'nomi') { 
            const n = this.data.nomis.find(x => x.id === this.currentNomiId); 
            n.name = val; 
            document.getElementById('nomiNameDisplay').innerText = val; 
            this.autoSaveNomi(); 
        } else { 
            const g = this.data.groups.find(x => x.id === this.currentGroupId); 
            g.name = val; 
            document.getElementById('groupNameDisplay').innerText = val; 
            this.autoSaveGroup(); 
        } 
        this.toggleNameEdit(type, false); 
    }
    
    setAllSections(collapsed) {
        document.querySelectorAll('.glass-card').forEach(card => {
            if(collapsed) {
                card.classList.add('collapsed');
            } else {
                card.classList.remove('collapsed');
                const ta = card.querySelector('textarea');
                this.autoResize(ta);
            }
        });
    }

    copyAllSections(isGroup) {
        let text = "";
        let count = 0;
        
        if(isGroup) {
            const g = this.data.groups.find(x => x.id === this.currentGroupId);
            g.sectionOrder.forEach(sid => {
                const isBackstory = sid === 'backstory';
                const cust = g.custom_sections ? g.custom_sections.find(cs => cs.id === sid) : null;
                if(!isBackstory && !cust) return;
                const title = isBackstory ? "Group Backstory" : cust.title;
                const content = isBackstory ? (g.backstory || '') : cust.content;
                if(content.trim()) { text += `## ${title}\n${content}\n\n`; count++; }
            });
        } else {
            const n = this.data.nomis.find(x => x.id === this.currentNomiId);
            n.sectionOrder.forEach(sid => {
                const def = DEFAULT_SECTIONS.find(d => d.id === sid);
                const cust = n.custom_sections ? n.custom_sections.find(cs => cs.id === sid) : null;
                if (!def && !cust) return;
                const title = def ? def.label : cust.title;
                const val = def ? (n.data[sid] || '') : cust.content;
                if(val && val.trim()) { text += `## ${title}\n${val}\n\n`; count++; }
            });
        }
        if(count > 0) { navigator.clipboard.writeText(text).then(() => this.showToast(`Copied ${count} sections!`)); } else { this.showToast("Nothing to copy!"); }
    }
    
    toggleReorderMode() {
        this.isReordering = !this.isReordering;
        const btnNomi = document.getElementById('btnSortNomi');
        const btnGroup = document.getElementById('btnSortGroup');
        const rstNomi = document.getElementById('btnResetNomi');
        const rstGroup = document.getElementById('btnResetGroup');
        
        if(this.isReordering) {
            if(btnNomi) btnNomi.classList.add('active');
            if(btnGroup) btnGroup.classList.add('active');
            if(rstNomi) rstNomi.style.visibility = 'visible';
            if(rstGroup) rstGroup.style.visibility = 'visible';
        } else {
            if(btnNomi) btnNomi.classList.remove('active');
            if(btnGroup) btnGroup.classList.remove('active');
            if(rstNomi) rstNomi.style.visibility = 'hidden';
            if(rstGroup) rstGroup.style.visibility = 'hidden';
        }
        if(document.getElementById('viewGroup').style.display === 'block') { this.renderGroupSections(); } else { this.renderFormGrid(); }
    }
    
    resetSort() {
        if(!confirm("Reset sections to default order?")) return;
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        if (isGroup) {
            const g = this.data.groups.find(x => x.id === this.currentGroupId);
            let newOrder = ['backstory'];
            if(g.custom_sections) { g.custom_sections.forEach(cs => { if(!newOrder.includes(cs.id)) newOrder.push(cs.id); }); }
            g.sectionOrder = newOrder;
            this.saveToDB();
            this.renderGroupSections();
        } else {
            const n = this.data.nomis.find(x => x.id === this.currentNomiId);
            let newOrder = DEFAULT_SECTIONS.map(s => s.id);
            if(n.custom_sections) { n.custom_sections.forEach(cs => { if(!newOrder.includes(cs.id)) newOrder.push(cs.id); }); }
            n.sectionOrder = newOrder;
            this.saveToDB();
            this.renderFormGrid();
        }
    }

    toggleBatchMode() {
        this.isBatchMode = !this.isBatchMode;
        this.selectedImages.clear();
        
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let btn, delBtn;
        
        if (isGroup) {
            btn = document.getElementById('btnGroupBatchMode');
            delBtn = document.getElementById('btnGroupBatchDelete');
        } else {
            btn = document.getElementById('btnBatchMode');
            delBtn = document.getElementById('btnBatchDelete');
        }

        if(this.isBatchMode) { btn.classList.add('active'); delBtn.style.display = 'flex'; } 
        else { btn.classList.remove('active'); delBtn.style.display = 'none'; }
        
        const searchInputId = isGroup ? 'groupGallerySearch' : 'nomiGallerySearch';
        const term = document.getElementById(searchInputId).value;
        this.filterGallery(term);
    }

    toggleGallerySelection(id) {
        if(this.selectedImages.has(id)) { this.selectedImages.delete(id); } else { this.selectedImages.add(id); }
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        const searchInputId = isGroup ? 'groupGallerySearch' : 'nomiGallerySearch';
        this.filterGallery(document.getElementById(searchInputId).value);
    }

    deleteBatchImages() {
        if(this.selectedImages.size === 0) return this.showToast("No images selected");
        if(!confirm(`Delete ${this.selectedImages.size} selected images?`)) return;
        
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let target;
        if(isGroup) target = this.data.groups.find(x => x.id === this.currentGroupId);
        else target = this.data.nomis.find(x => x.id === this.currentNomiId);

        target.gallery = target.gallery.filter(g => !this.selectedImages.has(g.id));
        this.saveToDB();
        this.toggleBatchMode();
        this.showToast("Images Deleted!");
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.glass-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    handleDragStart(e, id, isGroup) { 
        if(!this.isReordering) { e.preventDefault(); return; } 
        this.dragSrcEl = e.target.closest('.glass-card'); 
        this.dragSrcEl.classList.add('dragging'); 
        e.dataTransfer.effectAllowed = 'move'; 
        e.dataTransfer.setData('text/plain', id);
    }

    handleDragOver(e) {
        if(!this.isReordering) return;
        e.preventDefault();
        const container = e.target.closest('.form-column-container') || document.getElementById('groupSectionsContainer');
        if(!container) return;
        const afterElement = this.getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if(!draggable) return;
        if (afterElement == null) { container.appendChild(draggable); } else { container.insertBefore(draggable, afterElement); }
    }

    handleDragEnd(e) {
        const draggable = document.querySelector('.dragging');
        if(draggable) draggable.classList.remove('dragging');
        this.saveOrderFromDOM();
    }

    handleTouchStart(e) {
        if(!this.isReordering) return;
        if(e.cancelable) e.preventDefault();
        const handle = e.currentTarget;
        const card = handle.closest('.glass-card');
        this.touchDragItem = card;
        card.classList.add('dragging');
    }

    handleTouchMove(e) {
        if(!this.isReordering) return;
        if(e.cancelable) e.preventDefault();
        if (!this.touchDragItem) return;
        const touch = e.touches[0];
        const elementUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
        if(!elementUnderFinger) return;
        const container = elementUnderFinger.closest('.form-column-container') || document.getElementById('groupSectionsContainer');
        if(!container) return;
        const afterElement = this.getDragAfterElement(container, touch.clientY);
        if (afterElement == null) { container.appendChild(this.touchDragItem); } else { container.insertBefore(this.touchDragItem, afterElement); }
    }

    handleTouchEnd(e) {
        if (this.touchDragItem) {
            this.touchDragItem.classList.remove('dragging');
            this.touchDragItem = null;
            this.saveOrderFromDOM();
        }
    }

    saveOrderFromDOM() {
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        if (isGroup) {
            const g = this.data.groups.find(x => x.id === this.currentGroupId);
            const container = document.getElementById('groupSectionsContainer');
            const newOrder = [];
            Array.from(container.children).forEach(child => {
                 const textArea = child.querySelector('textarea');
                 if(textArea) { const parts = textArea.id.split('group_sec_'); if(parts.length > 1) newOrder.push(parts[1]); }
            });
            if(newOrder.length > 0) { g.sectionOrder = newOrder; this.saveToDB(); }
        } else {
            const n = this.data.nomis.find(x => x.id === this.currentNomiId);
            const container = document.getElementById('profileGrid');
            const newOrder = [];
            Array.from(container.children).forEach(child => {
                const textArea = child.querySelector('textarea');
                if(textArea) { const parts = textArea.id.split('field_'); if(parts.length > 1) newOrder.push(parts[1]); }
            });
            if(newOrder.length > 0) { n.sectionOrder = newOrder; this.saveToDB(); }
        }
    }

    renderFormGrid() { 
        const c = document.getElementById('profileGrid'); c.innerHTML = ''; 
        const n = this.data.nomis.find(x => x.id === this.currentNomiId); 
        if(!n) return; 
        if(!n.sectionOrder || n.sectionOrder.length === 0) { n.sectionOrder = DEFAULT_SECTIONS.map(s=>s.id); if(n.custom_sections) n.custom_sections.forEach(cs=>n.sectionOrder.push(cs.id)); } 
        const draggableAttr = this.isReordering ? 'draggable="true"' : 'draggable="false"';
        const handleStyle = this.isReordering ? 'display:block;' : '';
        if(this.isReordering) { c.ondragover = (e) => app.handleDragOver(e); }

        n.sectionOrder.forEach((sid, idx) => { 
            const def = DEFAULT_SECTIONS.find(d => d.id === sid); 
            const cust = n.custom_sections ? n.custom_sections.find(cs => cs.id === sid) : null; 
            if (!def && !cust) return; 
            const label = def ? def.label : cust.title; 
            const val = def ? (n.data[sid] || '') : cust.content; 
            const limit = def ? def.limit : 5000; 
            const isCust = !!cust; 
            const html = ` <div class="glass-card collapsed ${def && val.length > limit ? 'over-limit' : ''}" id="card_${sid}" ${draggableAttr} ondragstart="app.handleDragStart(event, '${sid}', false)" ondragend="app.handleDragEnd(event)"> <div class="card-header" onclick="app.toggleCard(this.parentNode)"> <div class="card-header-left"> <span class="drag-handle" style="${handleStyle}" onmousedown="event.stopPropagation()" ontouchstart="app.handleTouchStart(event)" ontouchmove="app.handleTouchMove(event)" ontouchend="app.handleTouchEnd(event)"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg> </span> ${isCust ? `<input type="text" value="${label}" style="background:transparent;border:none;color:var(--accent);font-weight:700;font-size:0.85rem;width:100%;font-family:inherit;letter-spacing:1px;text-transform:uppercase;padding:0;margin:0;-webkit-user-select:text;user-select:text;" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()" oninput="app.updateNomiSectionTitle('${sid}', this.value)">` : `<span>${label}</span>`} </div> <div class="card-controls"> ${isCust ? `<button class="tool-btn del" style="width:20px;height:20px;" onclick="event.stopPropagation(); app.deleteNomiSection('${sid}')">×</button>` : `<span id="count_${sid}" style="font-size:0.7rem; opacity:0.6">${val.length}/${limit}</span>`} <span class="card-arrow">▼</span> </div> </div> <div class="card-body"> <textarea id="field_${sid}" class="ghost-input" oninput="app.handleInput('${sid}', ${limit}, ${isCust})">${val}</textarea> <div class="btn-row"> <div style="display:flex; gap:10px;"> <button class="save-btn" onclick="app.saveCurrentNomi(true)">Save</button> <button class="copy-btn" style="background:rgba(239,68,68,0.2); border-color:rgba(239,68,68,0.3); color:#fca5a5;" onclick="app.cancelSection('${sid}', false)">Cancel</button> </div> <div style="display:flex; gap:10px;"> <button class="copy-btn" onclick="app.pasteText('field_${sid}')">Paste</button> <button class="copy-btn" onclick="app.copyText('field_${sid}')">Copy</button> </div> </div> </div> </div>`; 
            c.insertAdjacentHTML('beforeend', html); 
        }); 
    }
    
    addNomiSection() { const n = this.data.nomis.find(x => x.id === this.currentNomiId); if(!n.custom_sections) n.custom_sections = []; const newId = 'cs_' + Date.now(); n.custom_sections.push({ id: newId, title: "New Section", content: "" }); n.sectionOrder.push(newId); this.saveToDB(); this.renderFormGrid(); }
    updateNomiSectionTitle(id, val) { const n = this.data.nomis.find(x => x.id === this.currentNomiId); const s = n.custom_sections.find(c => c.id === id); if(s) { s.title = val; this.saveToDB(); } }
    deleteNomiSection(id) { if(!confirm("Delete this section?")) return; const n = this.data.nomis.find(x => x.id === this.currentNomiId); n.custom_sections = n.custom_sections.filter(c => c.id !== id); n.sectionOrder = n.sectionOrder.filter(o => o !== id); this.saveToDB(); this.renderFormGrid(); }
    handleInput(id, limit, isCust) { 
        if(!isCust) { 
            const el = document.getElementById(`field_${id}`); 
            const card = document.getElementById(`card_${id}`); 
            const count = document.getElementById(`count_${id}`); 
            if(count) count.innerText = `${el.value.length}/${limit}`; 
            if(el.value.length > limit) { card.classList.add('over-limit'); count.style.color='#ef4444'; } 
            else { card.classList.remove('over-limit'); count.style.color='inherit'; } 
        } 
        this.autoResize(document.getElementById(`field_${id}`));
    }    
    autoSaveNomi() { this.saveCurrentNomi(false); }
    saveCurrentNomi(toast) { const n = this.data.nomis.find(x => x.id === this.currentNomiId); DEFAULT_SECTIONS.forEach(s => { const el = document.getElementById(`field_${s.id}`); if(el) n.data[s.id] = el.value; }); if(n.custom_sections) { n.custom_sections.forEach(s => { const el = document.getElementById(`field_${s.id}`); if(el) s.content = el.value; }); } this.saveToDB().then(() => { if(toast) this.showToast("Profile Saved!"); }); }
    renderTraits() { const n = this.data.nomis.find(x => x.id === this.currentNomiId); const c = document.getElementById('traitContainer'); c.innerHTML = ''; (n.data.key_traits || []).forEach(t => { const d=document.createElement('div'); d.className='tag'; d.innerText=t+' ×'; d.onclick=()=>{ n.data.key_traits=n.data.key_traits.filter(x=>x!==t); this.saveToDB(); this.renderTraits(); }; c.appendChild(d); }); }
    addTrait(t) { const n=this.data.nomis.find(x=>x.id===this.currentNomiId); if(!n.data.key_traits)n.data.key_traits=[]; if(n.data.key_traits.length>=7)return alert("Max 7 traits"); if(t.trim()){ n.data.key_traits.push(t.trim()); this.saveToDB(); this.renderTraits(); } }
    async addGalleryImages(inpt) { 
        const files=Array.from(inpt.files); 
        if(files.length===0)return; 
        
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let target;
        if(isGroup) target = this.data.groups.find(x => x.id === this.currentGroupId);
        else target = this.data.nomis.find(x => x.id === this.currentNomiId);

        for(const f of files){ 
            await new Promise(r=>{ 
                this.processImage(f,1024,(b64)=>{ 
                    if(!target.gallery) target.gallery=[]; 
                    target.gallery.push({id:Date.now()+Math.random(),img:b64,prompt:""}); 
                    r(); 
                }); 
            }); 
        } 
        this.saveToDB().then(()=>this.renderPromptGallery()); 
    }
    
    filterGallery(term) {
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let target;
        if(isGroup) target = this.data.groups.find(x => x.id === this.currentGroupId);
        else target = this.data.nomis.find(x => x.id === this.currentNomiId);
        let filtered = (target.gallery || []);
        if(term && term.trim() !== '') {
            const lowerTerm = term.toLowerCase();
            filtered = filtered.filter(item => (item.prompt || "").toLowerCase().includes(lowerTerm));
        }
        this.renderPromptGallery(filtered);
    }

    renderPromptGallery(filteredList = null) { 
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let target, containerId;
        if (isGroup) {
            target = this.data.groups.find(x => x.id === this.currentGroupId);
            containerId = 'groupPromptGalleryGrid';
        } else {
            target = this.data.nomis.find(x => x.id === this.currentNomiId);
            containerId = 'promptGalleryGrid';
        }

        const g = document.getElementById(containerId); 
        if(!g) return;
        g.innerHTML = ''; 
        
        let listToRender = filteredList || (target.gallery || []);
        if(this.gallerySort === 'newest') listToRender = [...listToRender].reverse();

        const sizeMap = { small: '100px', medium: '160px', large: '260px', xlarge: '360px' };
        g.style.setProperty('--grid-min', sizeMap[this.gallerySize]);

        listToRender.forEach(i => { 
            const isSel = this.selectedImages.has(i.id);
            const d = document.createElement('div'); 
            d.className = `prompt-card ${isSel ? 'selected' : ''}`; 
            d.id = `card_${i.id}`; 
            
            // CONTEXT MENU ATTACHED HERE (Right-click or Long-press)
            d.oncontextmenu = (e) => app.showGalleryContextMenu(e, i.id);

            let clickHandler;
            if(this.isBatchMode) {
                clickHandler = `onclick="app.toggleGallerySelection(${i.id})"`;
            } else {
                clickHandler = `onclick="app.openLightbox('${i.img}')"`;
            }
            
            const promptText = (i.prompt && i.prompt.trim()) ? i.prompt : "No prompt";
            const promptOverlay = this.galleryShowPrompts 
                ? `<div class="prompt-preview-text">${promptText}</div>` 
                : '';

            // Clean HTML without the ghost-overlay buttons
            d.innerHTML = `
                <img src="${i.img}" ${clickHandler}>
                ${promptOverlay}
            `; 
            g.appendChild(d); 
        }); 
    }
    
    openPromptPopup(imgId) {
        this.currentEditingImageId = imgId;
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let target;
        if(isGroup) target = this.data.groups.find(x => x.id === this.currentGroupId);
        else target = this.data.nomis.find(x => x.id === this.currentNomiId);
        const i = target.gallery.find(g => g.id === imgId);
        if(!i) return;
        document.getElementById('globalPromptInput').value = i.prompt || '';
        document.getElementById('globalPromptPopup').classList.add('active');
        setTimeout(() => document.getElementById('globalPromptInput').focus(), 50);
    }
    closePromptPopup() {
        document.getElementById('globalPromptPopup').classList.remove('active');
        this.currentEditingImageId = null;
    }

    updatePrompt(imgId, text) { 
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let target;
        if(isGroup) target = this.data.groups.find(x => x.id === this.currentGroupId);
        else target = this.data.nomis.find(x => x.id === this.currentNomiId);

        const i=target.gallery.find(g=>g.id===imgId); 
        if(i){ i.prompt=text; } 
        
        const globalEl = document.getElementById('globalPromptInput');
        const localEl = document.getElementById(`inplace_input_${imgId}`);
        if(globalEl && globalEl.value !== text) globalEl.value = text;
        if(localEl && localEl.value !== text) localEl.value = text;
    }

    savePromptManual() { 
        if(!this.currentEditingImageId) return;
        const val = document.getElementById('globalPromptInput').value;
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let target;
        if(isGroup) target = this.data.groups.find(x => x.id === this.currentGroupId);
        else target = this.data.nomis.find(x => x.id === this.currentNomiId);

        const i = target.gallery.find(g => g.id === this.currentEditingImageId);
        if(i) {
            i.prompt = val;
            const card = document.getElementById(`card_${this.currentEditingImageId}`);
            if(card) {
                const overlay = card.querySelector('.prompt-preview-text');
                if(overlay) overlay.innerText = val;
            }
        }
        this.saveToDB(); this.showToast("Prompt Saved!"); this.closePromptPopup(); 
    }

    deleteGalleryItem(id) { 
        if(!confirm("Remove image?")) return; 
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        let target;
        if(isGroup) target = this.data.groups.find(x => x.id === this.currentGroupId);
        else target = this.data.nomis.find(x => x.id === this.currentNomiId);

        target.gallery = target.gallery.filter(g => g.id !== id); 
        this.saveToDB(); this.renderPromptGallery(); 
    }
    
    setNomiPhoto(b64, optionalId) { 
        const id = optionalId || this.currentNomiId;
        const n = this.data.nomis.find(x => x.id === id); 
        if(n) {
            n.photo = b64; this.saveToDB(); 
            if(this.currentNomiId === id) {
                document.getElementById('nomiImageDisplay').src = b64; 
                document.getElementById('nomiImageDisplay').style.display = 'block'; 
                document.getElementById('nomiImagePlaceholder').style.display = 'none'; 
            }
            this.renderGallery(false);
        }
    }

    setGroupPhoto(b64, optionalId) { 
        const id = optionalId || this.currentGroupId;
        const g = this.data.groups.find(x => x.id === id); 
        if(g) {
            g.photo = b64; this.saveToDB(); 
            if(this.currentGroupId === id) {
                document.getElementById('groupImageDisplay').src = b64; 
                document.getElementById('groupImageDisplay').style.display = 'block'; 
                document.getElementById('groupImagePlaceholder').style.display = 'none'; 
            }
            this.renderGallery(false);
        }
    }

    editGroup(id, pushHistory = true, initialTab = 'profile') { 
        this.currentGroupId=id; this.saveState('group', id);
        this.isReordering = false;
        const btnGroup = document.getElementById('btnSortGroup');
        if(btnGroup) btnGroup.classList.remove('active');
        const rstGroup = document.getElementById('btnResetGroup');
        if(rstGroup) rstGroup.style.visibility = 'hidden';

        if(pushHistory) history.pushState({view: 'group', id: id, tab: initialTab}, '', '#group/'+id);
        
        const g=this.data.groups.find(x=>x.id===id); 
        if(!g.sectionOrder) { g.sectionOrder = ['backstory']; (g.custom_sections||[]).forEach(c=>g.sectionOrder.push(c.id)); } 
        
        document.getElementById('viewHome').style.display='none'; 
        document.getElementById('viewNomi').style.display='none'; 
        document.getElementById('viewGroup').style.display='block'; 
        document.getElementById('heroBackground').style.backgroundImage='none'; 
        
        this.toggleNameEdit('group', false); 
        document.getElementById('groupNameDisplay').innerText=g.name; 
        document.getElementById('groupName').value=g.name; 
        
        const d=document.getElementById('groupImageDisplay'); 
        const p=document.getElementById('groupImagePlaceholder'); 
        
        if(g.photo) {
            d.src=g.photo; d.style.display='block'; p.style.display='none';
        } else {
            d.style.display='none'; p.style.display='flex';
            p.innerText = g.name ? g.name.charAt(0) : '?';
        } 
        
        this.switchGroupTab(initialTab); 
    }
    createGroup() { const g={ id:Date.now(), name:"New Group", photo:null, members:[], custom_sections:[], sectionOrder:['backstory'], gallery: [] }; this.data.groups.push(g); this.saveToDB().then(()=>this.editGroup(g.id)); }
    
    renderGroupMembers() { 
        const c = document.getElementById('groupMembersGrid'); 
        c.innerHTML = ''; 
        const g = this.data.groups.find(x => x.id === this.currentGroupId); 
        
        if(g.members.length === 0) {
            c.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">No members yet. Add one above!</div>';
            return;
        }

        g.members.forEach(m => { 
            const n = this.data.nomis.find(x => x.id === m.id); 
            if(n) { 
                const d = document.createElement('div'); 
                d.className = 'member-card'; 
                
                const roleText = m.role && m.role.trim() !== "" ? m.role : '<em style="opacity:0.5">Add Note...</em>';
                // Clean role for attribute safety (removes quotes)
                const safeRole = (m.role || "").replace(/"/g, '&quot;');
                
                d.innerHTML = `
                    <div class="member-remove" onclick="app.removeMember(${n.id})" title="Remove">✕</div>
                    <img src="${n.photo || ''}" onerror="this.style.display='none'" onclick="app.editNomi(${n.id})">
                    <div class="member-name" onclick="app.editNomi(${n.id})">${n.name}</div>
                    
                    <div id="role_disp_${n.id}" class="member-role-display" title="${safeRole}" onclick="app.toggleMemberRoleEdit(${n.id}, true)">
                        <span>${roleText}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5; flex-shrink:0;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </div>

                    <div id="role_edit_${n.id}" class="member-role-edit">
                        <textarea id="role_input_${n.id}" class="member-role-input" placeholder="Role / Note">${m.role || ''}</textarea>
                        <div style="display:flex; flex-direction:column; gap:5px;">
                            <div class="role-btn save" onclick="app.saveMemberRole(${n.id})">✓</div>
                            <div class="role-btn cancel" onclick="app.cancelMemberRole(${n.id})">✕</div>
                        </div>
                    </div>
                `; 
                c.appendChild(d); 
            } 
        }); 
    }
    
    toggleMemberDropdown() { const d=document.getElementById('memberOptions'); if(d.classList.contains('open')){d.classList.remove('open');return;} d.innerHTML=''; const g=this.data.groups.find(x=>x.id===this.currentGroupId); let h=false; this.data.nomis.forEach(n=>{ if(!g.members.find(m => m.id === n.id)){ h=true; const dv=document.createElement('div'); dv.className='custom-option'; dv.innerHTML=`<img src="${n.photo||''}" onerror="this.style.display='none'"><span>${n.name}</span>`; dv.onclick=()=>app.addMember(n.id); d.appendChild(dv); } }); if(!h)d.innerHTML='<div style="padding:10px;color:var(--text-muted);font-size:0.9rem;">No other Nomis available.</div>'; d.classList.add('open'); }
    addMember(id) { const g=this.data.groups.find(x=>x.id===this.currentGroupId); g.members.push({id: id, role: ""}); this.saveToDB(); this.renderGroupMembers(); document.getElementById('memberOptions').classList.remove('open'); }
    removeMember(id) { const g=this.data.groups.find(x=>x.id===this.currentGroupId); g.members=g.members.filter(m=>m.id!==id); this.saveToDB(); this.renderGroupMembers(); }
    updateMemberRole(id, val) { const g=this.data.groups.find(x=>x.id===this.currentGroupId); const m=g.members.find(x=>x.id===id); if(m){ m.role=val; this.saveToDB(); } }
    toggleMemberRoleEdit(id, show) {
        // 1. Force close any OTHER open edit boxes to keep the grid clean
        if (show) {
            const activeEdits = document.querySelectorAll('.member-role-edit.active');
            activeEdits.forEach(el => {
                const otherId = el.id.split('role_edit_')[1];
                if (otherId && otherId != id) {
                    this.cancelMemberRole(otherId);
                }
            });
        }

        // 2. Toggle the specific one requested
        const disp = document.getElementById(`role_disp_${id}`);
        const edit = document.getElementById(`role_edit_${id}`);
        const input = document.getElementById(`role_input_${id}`);
        
        if(show) {
            disp.style.display = 'none';
            edit.classList.add('active');
            setTimeout(() => input.focus(), 50);
        } else {
            disp.style.display = 'flex';
            edit.classList.remove('active');
        }
    }

    saveMemberRole(id) {
        const g = this.data.groups.find(x => x.id === this.currentGroupId);
        const m = g.members.find(x => x.id === id);
        const input = document.getElementById(`role_input_${id}`);
        if(m) {
            m.role = input.value;
            this.saveToDB();
            this.renderGroupMembers(); // Re-render to show updated text
        }
    }

    cancelMemberRole(id) {
        const g = this.data.groups.find(x => x.id === this.currentGroupId);
        const m = g.members.find(x => x.id === id);
        const input = document.getElementById(`role_input_${id}`);
        
        // Reset input to original value and hide edit mode
        input.value = m.role || "";
        this.toggleMemberRoleEdit(id, false);
    }
    addGroupSection() { const g=this.data.groups.find(x=>x.id===this.currentGroupId); if(!g.custom_sections)g.custom_sections=[]; const nid='cs_g_'+Date.now(); g.custom_sections.push({id:nid,title:"New Section",content:""}); g.sectionOrder.push(nid); this.saveToDB(); this.renderGroupSections(); }
    renderGroupSections() { 
        const c=document.getElementById('groupSectionsContainer'); c.innerHTML=''; 
        const g=this.data.groups.find(x=>x.id===this.currentGroupId); 
        if(!g.sectionOrder) { g.sectionOrder=['backstory']; (g.custom_sections||[]).forEach(cs=>g.sectionOrder.push(cs.id)); } 
        const draggableAttr = this.isReordering ? 'draggable="true"' : 'draggable="false"';
        const handleStyle = this.isReordering ? 'display:block;' : '';
        if(this.isReordering) { c.ondragover = (e) => app.handleDragOver(e); }

        g.sectionOrder.forEach(sid => { 
            const isBackstory = sid === 'backstory'; 
            const cust = g.custom_sections ? g.custom_sections.find(cs => cs.id === sid) : null; 
            if(!isBackstory && !cust) return; 
            const title = isBackstory ? "Group Backstory" : cust.title; 
            const content = isBackstory ? (g.backstory || '') : cust.content; 
            const html = ` <div class="glass-card collapsed" id="card_group_${sid}" draggable="${this.isReordering}" ondragstart="app.handleDragStart(event, '${sid}', true)" ondragend="app.handleDragEnd(event)"> <div class="card-header" onclick="app.toggleCard(this.parentNode)"> <div class="card-header-left"> <span class="drag-handle" style="${handleStyle}" onmousedown="event.stopPropagation()" ontouchstart="app.handleTouchStart(event)" ontouchmove="app.handleTouchMove(event)" ontouchend="app.handleTouchEnd(event)"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg> </span> ${isBackstory ? `<span>${title}</span>` : `<input type="text" value="${title}" style="background:transparent;border:none;color:var(--accent);font-weight:700;font-size:0.85rem;width:100%;font-family:inherit;letter-spacing:1px;text-transform:uppercase;padding:0;margin:0;-webkit-user-select:text;user-select:text;" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()" oninput="app.updateGroupSectionTitle('${sid}', this.value)">`} </div> <div class="card-controls"> ${isBackstory ? `<span id="groupCount" style="margin-right:10px;opacity:0.6">${content.length}/1000</span>` : `<button class="tool-btn del" style="width:20px;height:20px;" onclick="event.stopPropagation(); app.deleteGroupSection('${sid}')">×</button>`} <span class="card-arrow">▼</span> </div> </div> <div class="card-body"> <textarea id="group_sec_${sid}" class="ghost-input" oninput="app.updateGroupSectionContent('${sid}', this.value)">${content}</textarea> <div class="btn-row"> <div style="display:flex; gap:10px;"> <button class="save-btn" onclick="app.saveCurrentGroup(true)">Save</button> <button class="copy-btn" style="background:rgba(239,68,68,0.2); border-color:rgba(239,68,68,0.3); color:#fca5a5;" onclick="app.cancelSection('${sid}', true)">Cancel</button> </div> <div style="display:flex; gap:10px;"> <button class="copy-btn" onclick="app.pasteText('group_sec_${sid}')">Paste</button> <button class="copy-btn" onclick="app.copyText('group_sec_${sid}')">Copy</button> </div> </div> </div> </div>`; 
            c.insertAdjacentHTML('beforeend', html); 
        }); 
    }
    updateGroupSectionTitle(id, val) { const g=this.data.groups.find(x=>x.id===this.currentGroupId); const s=g.custom_sections.find(x=>x.id===id); if(s){ s.title=val; this.saveToDB(); } }
    updateGroupSectionContent(id, val) { 
        const g=this.data.groups.find(x=>x.id===this.currentGroupId); 
        if(id==='backstory') { document.getElementById('groupCount').innerText=`${val.length}/1000`; }
        this.autoResize(document.getElementById(`group_sec_${id}`));
    }    
    deleteGroupSection(id) { if(!confirm("Delete?"))return; const g=this.data.groups.find(x=>x.id===this.currentGroupId); g.custom_sections=g.custom_sections.filter(x=>x.id!==id); g.sectionOrder=g.sectionOrder.filter(x=>x!==id); this.saveToDB(); this.renderGroupSections(); }
    autoSaveGroup() { this.saveCurrentGroup(false); }
    saveCurrentGroup(showToast = true) {
        const g = this.data.groups.find(x => x.id === this.currentGroupId);
        const bsEl = document.getElementById('group_sec_backstory');
        if(bsEl) g.backstory = bsEl.value;
        if(g.custom_sections) {
            g.custom_sections.forEach(s => {
                const el = document.getElementById('group_sec_' + s.id);
                if(el) s.content = el.value;
            });
        }
        this.saveToDB();
        if (showToast) this.showToast("Group Saved!");
    }
    autoResize(el) {
        if (!el) return;
        el.style.height = 'auto';
        const newHeight = el.scrollHeight;
        el.style.height = newHeight + 'px';
        if (newHeight > 300) { el.style.overflowY = "auto"; } else { el.style.overflowY = "hidden"; }
    }
    toggleCard(c) { c.classList.toggle('collapsed'); if (!c.classList.contains('collapsed')) { const ta = c.querySelector('textarea'); this.autoResize(ta); } }
    deleteNomi() { if(confirm("Delete permanently?")) { this.data.nomis=this.data.nomis.filter(n=>n.id!==this.currentNomiId); this.saveToDB(); this.goHome(); } }
    deleteGroup() { if(confirm("Delete Group?")) { this.data.groups=this.data.groups.filter(g=>g.id!==this.currentGroupId); this.saveToDB(); this.goHome(); } }

    exportData() { const s="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(this.data)); const a=document.createElement('a'); a.href=s; a.download="nomi_backup.json"; document.body.appendChild(a); a.click(); a.remove(); }
    importData(i) { const f=i.files[0]; if(!f)return; const r=new FileReader(); r.onload=(e)=>{ try{const j=JSON.parse(e.target.result); if(confirm("Overwrite data?")){this.data=j;this.saveToDB().then(()=>{alert("Done!");location.reload();});}}catch(e){alert("Invalid JSON");} }; r.readAsText(f); }
    
    processImage(f,mw,cb) { 
        if(!f)return; 
        const r=new FileReader(); 
        r.onload=(e)=>{ 
            const i=new Image(); i.src=e.target.result; 
            i.onload=()=>{ 
                const c=document.createElement('canvas'); const s=mw/i.width; c.width=mw; c.height=i.height*s; 
                const x=c.getContext('2d'); x.drawImage(i,0,0,c.width,c.height); cb(c.toDataURL('image/webp',0.8)); 
            }; 
        }; 
        r.readAsDataURL(f); 
    }
    
    async optimizeStorage() {
        const btn = document.getElementById('btnOptimize'); const originalText = btn.innerText;
        btn.innerText = "Processing... (Do not close)"; btn.disabled = true;
        let count = 0;
        const recompress = (b64) => {
            return new Promise((resolve) => {
                if(!b64 || !b64.startsWith('data:image')) return resolve(b64);
                const img = new Image(); img.src = b64;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxWidth = 1024;
                    let width = img.naturalWidth; let height = img.naturalHeight;
                    if(width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/webp', 0.8));
                };
                img.onerror = () => resolve(b64);
            });
        };
        for(let n of this.data.nomis) {
            if(n.photo) { n.photo = await recompress(n.photo); count++; }
            if(n.gallery) { for(let g of n.gallery) { if(g.img) { g.img = await recompress(g.img); count++; } } }
        }
        for(let g of this.data.groups) {
            if(g.photo) { g.photo = await recompress(g.photo); count++; }
            if(g.gallery) { for(let pic of g.gallery) { if(pic.img) { pic.img = await recompress(pic.img); count++; } } }
        }
        await this.saveToDB();
        btn.innerText = "Done! Processed " + count + " images.";
        this.renderStorageDashboard();
        setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 3000);
        alert(`Optimization Complete!\nProcessed ${count} images.\nCheck "Local Data" to see how much space you saved.`);
    }
    deleteAllData() {
        const confirmation = prompt("⚠️ DESTRUCTIVE ACTION ⚠️\n\nThis will permanently delete ALL data, including:\n- All Nomis & Backstories\n- All Groups\n- All Gallery Images\n- All App Settings\n\nThis action cannot be undone.\n\nTo confirm, type 'DELETE EVERYTHING' exactly below:");

        if (confirmation === 'DELETE EVERYTHING') {
            // FIX: Close the current connection so we don't block ourselves
            if (this.db) {
                this.db.close();
            }

            localStorage.clear();

            const req = indexedDB.deleteDatabase(DB_NAME);

            req.onsuccess = () => {
                alert("Reset Complete. The application will now reload.");
                window.location.reload();
            };

            req.onerror = (e) => {
                console.error("Delete Error:", e);
                alert("Error deleting database. Please manually clear site data in browser settings.");
            };

            req.onblocked = () => {
                // Now this will ONLY show if you actually have a second tab open
                alert("Deletion blocked! You have Nomi Manager open in another tab. Please close it and try again.");
            };
        } else if (confirmation !== null) {
            alert("Confirmation phrase did not match. Data was NOT deleted.");
        }
    }

    copyText(id) { navigator.clipboard.writeText(document.getElementById(id).value).then(()=>this.showToast("Copied!")); }
    showToast(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000); }
    openLightbox(s) { if(!s)return; document.getElementById('lightboxImg').src=s; document.getElementById('lightbox').classList.add('active'); history.pushState({ view: 'lightbox' }, '', '#lightbox');}
    closeLightbox() { document.getElementById('lightbox').classList.remove('active'); if(history.state && history.state.view === 'lightbox') { history.back(); } }
}

const app = new NomiApp(); window.onload = () => app.init();
