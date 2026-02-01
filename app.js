// REGISTER SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker failed', err));
    });
}

/** NOMI MANAGER v3.9.6 - AUTO SYNC TIMER ADDED **/

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
        this.data = { nomis: [], groups: [], settings: { theme: 'cyber', startView: 'home', lastNomi: null, apiKey: '', lastState: null, dashboardOrder: { nomis: [], groups: [] } } };
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
            this.isDashboardReordering = false;
        this._dashDragEl = null;
        this._dashDragType = null;
        this._dashDndSetup = false;
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
        this.setupDashboardDnD();
        this.updateDashboardArrangeButtons();
        
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

        // --- OPTION 3: 15-MINUTE AUTO SYNC INTERVAL ---
        // Runs only while the app is open. Browser throttles this if tab is backgrounded/closed.
        setInterval(() => {
            if(this.data.settings.autoUpload) {
                console.log("15-minute Interval: Triggering Auto-Sync...");
                this.cloudUpload(true); // 'true' means silent mode (no toast)
            }
        }, 15 * 60 * 1000); 
    }
    
    // --- SHARED PROXY FETCHER ---
    async fetchProxy(url, apiKeyOverride = null) {
        let key = apiKeyOverride || this.data.settings.apiKey;
        if (!key) throw new Error("API Key missing");
        
        const myWorker = "https://nomi-proxy.nickszumila.workers.dev/?url="; 
        const res = await fetch(myWorker + encodeURIComponent(url), { headers: { "Authorization": key } });
        
        if (res.status === 401 || res.status === 403) throw new Error("Invalid API Key");
        if (!res.ok) throw new Error(`API Error ${res.status}`);
        return res;
    }

    // --- HELPER: CONTEXT MANAGER ---
    getCurrentContext() {
        const isGroup = document.getElementById('viewGroup').style.display === 'block';
        return {
            type: isGroup ? 'group' : 'nomi',
            id: isGroup ? this.currentGroupId : this.currentNomiId,
            target: isGroup ? this.data.groups.find(g => g.id === this.currentGroupId) 
                            : this.data.nomis.find(n => n.id === this.currentNomiId)
        };
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
      const target = isGroup
        ? this.data.groups.find(g => g.id === this.currentGroupId)
        : this.data.nomis.find(n => n.id === this.currentNomiId);

      const imgObj = target.gallery.find(i => i.id === this.contextMenuTarget);
      if (!imgObj) return;

      try {
        this.showToast("Copying...");

        // Guard: some browsers don’t support image clipboard writes
        if (!navigator.clipboard || !window.ClipboardItem) {
          this.showToast("Clipboard not supported — use Save as PNG");
          return;
        }

        // Convert whatever it is (often WebP) into PNG for best compatibility
        const img = new Image();
        img.src = imgObj.img;

        // Prefer decode() when available
        if (img.decode) await img.decode();
        else await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const pngBlob = await new Promise((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );

        if (!pngBlob) throw new Error("PNG conversion failed");

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': pngBlob })
        ]);

        this.showToast("Copied to Clipboard!");
      } catch (err) {
        console.error(err);
        this.showToast("Copy failed — try Save as PNG");
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
        // Prevent switching layouts while in reorder mode
        if (this.isDashboardReordering) {
            this.showToast("Exit arrange mode to switch layouts");
            return;
        }
        
        this.dashboardView = mode; localStorage.setItem('nomi_dashboard_view', mode);
        const btnGrid = document.getElementById('btnViewGrid'); const btnList = document.getElementById('btnViewList');
        if(btnGrid && btnList) {
            if(mode === 'grid') { btnGrid.classList.add('active'); btnList.classList.remove('active'); }
            else { btnList.classList.add('active'); btnGrid.classList.remove('active'); }
        }
        if(render) this.renderGallery();
    }
    
    // --- Dashboard manual ordering (drag + drop) ---
    updateDashboardArrangeButtons() {
        const btn = document.getElementById('btnDashboardArrange');
        const rst = document.getElementById('btnDashboardReset');
        if (btn) btn.classList.toggle('active', !!this.isDashboardReordering);
        if (rst) rst.style.display = this.isDashboardReordering ? 'flex' : 'none';

        // Add a subtle visual hint on the grids while arranging
        const ng = document.getElementById('nomiGallery');
        const gg = document.getElementById('groupGallery');
        if (ng) ng.classList.toggle('dash-reorder', !!this.isDashboardReordering);
        if (gg) gg.classList.toggle('dash-reorder', !!this.isDashboardReordering);
    }

    onDashboardCardClick(type, id) {
        // While rearranging, ignore clicks so you don't accidentally open stuff mid-drag.
        if (this.isDashboardReordering) return;
        if (type === 'group') this.editGroup(id);
        else this.editNomi(id);
    }

    toggleDashboardReorder() {
        const term = (document.getElementById('searchInput')?.value || '').trim();
        // Reordering while filtered can drop hidden items from the saved order.
        if (!this.isDashboardReordering && term) {
            this.showToast("Clear search to reorder");
            return;
        }

        this.isDashboardReordering = !this.isDashboardReordering;
        if (this.isDashboardReordering) {
            this.showToast("Arrange mode: drag cards to reorder");
        } else {
            this.saveDashboardOrderFromDOM();
            this.saveToDB(true);
            this.showToast("Order saved");
        }
        this.refreshDashboardDraggables();
        this.updateDashboardArrangeButtons();
    }

    resetDashboardOrder() {
        const ok = confirm("Reset dashboard order back to default sorting?");
        if (!ok) return;

        if (!this.data.settings.dashboardOrder) this.data.settings.dashboardOrder = { nomis: [], groups: [] };
        this.data.settings.dashboardOrder.nomis = [];
        this.data.settings.dashboardOrder.groups = [];

        this.saveToDB(true);
        this.renderGallery(false);
        this.showToast("Order reset");
    }

    saveDashboardOrderFromDOM() {
        if (!this.data.settings.dashboardOrder) this.data.settings.dashboardOrder = { nomis: [], groups: [] };

        const ng = document.getElementById('nomiGallery');
        const gg = document.getElementById('groupGallery');
        
        const getOrderFromContainer = (container) => {
            if (!container) return [];
            
            const isList = container.classList.contains('list-mode');
            if (isList) {
                // In list mode, we need to interleave items from both columns
                const col0 = container.querySelector('.list-col[data-col="0"]');
                const col1 = container.querySelector('.list-col[data-col="1"]');
                
                if (!col0 || !col1) return [];
                
                const items0 = [...col0.querySelectorAll('.nomi-card')];
                const items1 = [...col1.querySelectorAll('.nomi-card')];
                
                // Interleave: col0[0], col1[0], col0[1], col1[1], ...
                const interleaved = [];
                const maxLen = Math.max(items0.length, items1.length);
                for (let i = 0; i < maxLen; i++) {
                    if (items0[i]) interleaved.push(Number(items0[i].dataset.id));
                    if (items1[i]) interleaved.push(Number(items1[i].dataset.id));
                }
                return interleaved.filter(Boolean);
            } else {
                // Grid mode - just get all items in order
                return [...container.querySelectorAll('.nomi-card')]
                    .map(el => Number(el.dataset.id))
                    .filter(Boolean);
            }
        };

        if (ng) {
            this.data.settings.dashboardOrder.nomis = getOrderFromContainer(ng);
        }
        if (gg) {
            this.data.settings.dashboardOrder.groups = getOrderFromContainer(gg);
        }
    }

    setupDashboardDnD() {
        if (this._dashDndSetup) return;
        this._dashDndSetup = true;

        const ng = document.getElementById('nomiGallery');
        const gg = document.getElementById('groupGallery');

        const bindContainer = (container) => {
            if (!container) return;

            // Per-container state to reduce jitter
        let _rafPending = false;
        let _lastX = 0;
        let _lastY = 0;
        let _lastRefEl = null;
        let _lockedCol = null; // 'L' or 'R'
        let _lastMoveThreshold = 0; // track last significant Y position
        
        container.addEventListener('dragover', (e) => {
            
            if (!this.isDashboardReordering) return;
            e.preventDefault();

            const dragging = document.querySelector('.nomi-card.dragging');
            if (!dragging) return;

            // Prevent dragging a Nomi into the Groups grid (and vice-versa)
            const t = dragging.dataset.type;
            if ((container.id === 'nomiGallery' && t !== 'nomi') || (container.id === 'groupGallery' && t !== 'group')) return;

            _lastX = e.clientX;
            _lastY = e.clientY;

            if (_rafPending) return;
            _rafPending = true;

            requestAnimationFrame(() => {
                _rafPending = false;

                const isList = container.classList.contains('list-mode');
                
                if (isList) {
                    // In list mode, find which column we're hovering
                    const cols = [...container.querySelectorAll('.list-col')];
                    let targetCol = null;
                    let sourceCol = null;
                    
                    // Find source and target columns
                    for (const col of cols) {
                        if (col.contains(dragging)) {
                            sourceCol = col;
                        }
                        const rect = col.getBoundingClientRect();
                        if (_lastX >= rect.left && _lastX <= rect.right) {
                            targetCol = col;
                        }
                    }
                    
                    if (!targetCol) return;
                    
                    // Get the reference element within this column
                    const colItems = [...targetCol.querySelectorAll('.nomi-card:not(.dragging)')];
                    let refEl = null;
                    
                    for (const item of colItems) {
                        const rect = item.getBoundingClientRect();
                        const midY = rect.top + rect.height / 2;
                        if (_lastY < midY) {
                            refEl = item;
                            break;
                        }
                    }
                    
                    // Don't update if nothing changed
                    if (refEl === _lastRefEl && dragging.parentElement === targetCol) return;
                    _lastRefEl = refEl;
                    
                    // Insert into the column
                    if (refEl == null) targetCol.appendChild(dragging);
                    else targetCol.insertBefore(dragging, refEl);
                    
                    // Smart rebalancing: if columns become unbalanced by 2+, shift an item intelligently
                    const col0 = container.querySelector('.list-col[data-col="0"]');
                    const col1 = container.querySelector('.list-col[data-col="1"]');
                    
                    if (col0 && col1) {
                        const count0 = col0.querySelectorAll('.nomi-card').length;
                        const count1 = col1.querySelectorAll('.nomi-card').length;
                        const diff = count0 - count1;
                        
                        // If left column has 2+ more items, move the last item to right column
                        if (diff >= 2) {
                            const items0 = [...col0.querySelectorAll('.nomi-card:not(.dragging)')];
                            const lastItem = items0[items0.length - 1];
                            if (lastItem) {
                                col1.insertBefore(lastItem, col1.firstChild);
                            }
                        }
                        // If right column has 2+ more items, move the first item to left column
                        else if (diff <= -2) {
                            const items1 = [...col1.querySelectorAll('.nomi-card:not(.dragging)')];
                            const firstItem = items1[0];
                            if (firstItem) {
                                col0.appendChild(firstItem);
                            }
                        }
                    }
                } else {
                    // Grid mode - use existing logic
                    const refEl = this.getDashboardDragAfterElement(container, _lastX, _lastY);
                    
                    if (refEl === _lastRefEl) return;
                    _lastRefEl = refEl;
                    
                    if (refEl == null) container.appendChild(dragging);
                    else container.insertBefore(dragging, refEl);
                }
            });
        });



            container.addEventListener('drop', (e) => {
                if (!this.isDashboardReordering) return;
                e.preventDefault();
                const dragging = document.querySelector('.nomi-card.dragging');
                if (dragging) {
                    const t = dragging.dataset.type;
                    if ((container.id === 'nomiGallery' && t !== 'nomi') || (container.id === 'groupGallery' && t !== 'group')) return;
                }
                
                // Rebalance columns if in list mode
                if (container.classList.contains('list-mode')) {
                    this.rebalanceListColumns(container);
                }
                
                this.saveDashboardOrderFromDOM();
                this.saveToDB(true);
            });
        };

        bindContainer(ng);
        bindContainer(gg);
    }

    refreshDashboardDraggables() {
        const apply = (container) => {
            if (!container) return;
            container.classList.toggle('dash-reorder', !!this.isDashboardReordering);

            container.querySelectorAll('.nomi-card').forEach(card => {
                card.draggable = !!this.isDashboardReordering;
                card.classList.toggle('dash-reorder', !!this.isDashboardReordering);

                // Images inside the card can "steal" the drag gesture (Chrome/Safari),
                // so disable native image dragging while in arrange mode.
                card.querySelectorAll('img').forEach(img => {
                    img.draggable = false;
                    img.ondragstart = (ev) => { if (this.isDashboardReordering) ev.preventDefault(); };
                });

                // Prevent buttons/labels from blocking drag in arrange mode
                const block = card.querySelectorAll('button, a, input, textarea, select, label');
                block.forEach(el => {
                    el.style.pointerEvents = this.isDashboardReordering ? 'none' : '';
                });

                // Bind handlers (safe to reassign; elements are recreated on every render)
                card.ondragstart = (e) => this.handleDashboardDragStart(e);
                card.ondragend = (e) => this.handleDashboardDragEnd(e);
            });
        };

        apply(document.getElementById('nomiGallery'));
        apply(document.getElementById('groupGallery'));
    }

    handleDashboardDragStart(e) {
        this._dashLockedCol = null;
        if (!this.isDashboardReordering) return;
        const el = e.currentTarget;
        this._dashDragEl = el;
        this._dashDragType = el?.dataset?.type || null;

        // Required for Firefox to initiate DnD
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'reorder');
        }

        el.classList.add('dragging');
    }

    handleDashboardDragEnd(e) {
        this._dashLockedCol = null;
        const el = e.currentTarget;
        if (el) el.classList.remove('dragging');
        if (this.isDashboardReordering) {
            // Rebalance columns if in list mode
            const container = el?.closest('.gallery-grid');
            if (container && container.classList.contains('list-mode')) {
                this.rebalanceListColumns(container);
            }
            this.saveDashboardOrderFromDOM();
            this.saveToDB(true);
        }
        this._dashDragEl = null;
        this._dashDragType = null;
    }

    rebalanceListColumns(container) {
        const col0 = container.querySelector('.list-col[data-col="0"]');
        const col1 = container.querySelector('.list-col[data-col="1"]');
        
        if (!col0 || !col1) return;
        
        const items0 = [...col0.querySelectorAll('.nomi-card')];
        const items1 = [...col1.querySelectorAll('.nomi-card')];
        
        const count0 = items0.length;
        const count1 = items1.length;
        const diff = Math.abs(count0 - count1);
        
        // Only rebalance if difference is 2 or more
        if (diff < 2) return;
        
        // Collect all items in their current visual order (interleaved)
        const allItems = [];
        const maxLen = Math.max(count0, count1);
        for (let i = 0; i < maxLen; i++) {
            if (items0[i]) allItems.push(items0[i]);
            if (items1[i]) allItems.push(items1[i]);
        }
        
        // Clear both columns
        col0.innerHTML = '';
        col1.innerHTML = '';
        
        // Redistribute: alternate between columns
        allItems.forEach((item, index) => {
            const targetCol = (index % 2 === 0) ? col0 : col1;
            targetCol.appendChild(item);
        });
    }

    getDashboardDragAfterElement(container, x, y) {
        const items = [...container.querySelectorAll('.nomi-card:not(.dragging)')];
        if (!items.length) return null;
        const isList = container.classList.contains('list-mode');
        
        if (isList) {
            // In list mode, we have actual columns - find which column we're hovering
            const cols = [...container.querySelectorAll('.list-col')];
            let targetCol = null;
            
            for (const col of cols) {
                const rect = col.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right) {
                    targetCol = col;
                    break;
                }
            }
            
            if (!targetCol) return null;
            
            // Get items only in this column
            const colItems = [...targetCol.querySelectorAll('.nomi-card:not(.dragging)')];
            if (!colItems.length) return null;
            
            // Simple Y-based sorting within the column
            for (const item of colItems) {
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (y < midY) {
                    return item;
                }
            }
            
            return null; // append to end of column
        }

        const cRect = container.getBoundingClientRect();

        // Detect "hovered" card under cursor (most stable for 2-column list)
        let hover = document.elementFromPoint(x, y);
        hover = hover?.closest?.('.nomi-card');
        if (hover && (!container.contains(hover) || hover.classList.contains('dragging'))) hover = null;

        // Sort in visual row-major order for fallback logic
        const rects = items
            .map(el => ({ el, r: el.getBoundingClientRect() }))
            .sort((a, b) => (a.r.top - b.r.top) || (a.r.left - b.r.left));

        const last = rects[rects.length - 1].r;

        // "Append zone" (keeps end-of-grid stable)
        const pad = 16;
        const pastLastRow = y > (last.bottom - pad);
        const pastLastCol = x > (last.right - pad);
        const belowGrid = y > (cRect.bottom - pad);
        if ((pastLastRow && pastLastCol) || belowGrid) return null;

        const decideRefFromRect = (r, el) => {
            const midY = r.top + r.height / 2;
            const midX = r.left + r.width / 2;

            // Hysteresis zone around the midpoint to reduce flip-flop
            const yBand = r.height * 0.22;

            // If clearly above, insert before
            if (y < midY - yBand) return el;

            // If clearly below, insert after
            if (y > midY + yBand) return el.nextElementSibling;

            // Otherwise (near the middle), decide by X (handles 2-col list nicely)
            return (x < midX) ? el : el.nextElementSibling;
        };

        // 1) Best case: we’re actually hovering a card
        if (hover) {
            const r = hover.getBoundingClientRect();
            return decideRefFromRect(r, hover);
        }

        // 2) Fallback: choose nearest card by center distance (when hovering gaps)
        let closest = null;
        let best = Infinity;
        for (const { el, r } of rects) {
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if (d < best) { best = d; closest = { el, r }; }
        }

        if (!closest) return null;
        return decideRefFromRect(closest.r, closest.el);
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
            const { target, type } = this.getCurrentContext();
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
                // Ensure dashboard ordering defaults
                if (!this.data.settings.dashboardOrder) this.data.settings.dashboardOrder = { nomis: [], groups: [] };
                if (!Array.isArray(this.data.settings.dashboardOrder.nomis)) this.data.settings.dashboardOrder.nomis = [];
                if (!Array.isArray(this.data.settings.dashboardOrder.groups)) this.data.settings.dashboardOrder.groups = [];

                
                resolve();
            };
        });
    }
        // --- Sync menu UI (Download / Upload) ---
        setupSyncMenu() {
            if (this._syncMenuSetup) return;
            this._syncMenuSetup = true;

            document.addEventListener('click', (e) => {
                const fab = document.getElementById('fabGroup');
                if (!fab) return;
                if (!fab.classList.contains('sync-open')) return;

                // Click outside closes
                if (!fab.contains(e.target)) {
                    this.closeSyncMenu();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeSyncMenu();
            });
        }

        toggleSyncMenu(ev) {
            this.setupSyncMenu();

            try { ev?.stopPropagation?.(); } catch {}

            const fab = document.getElementById('fabGroup');
            const btn = document.getElementById('syncBtn');
            const menu = document.getElementById('syncMenu');
            const icon = document.getElementById('syncIcon');

            if (!fab || !btn) return;

            // Don't open while syncing (icon spinning)
            if (icon && icon.classList.contains('spin')) return;

            const isOpen = fab.classList.toggle('sync-open');

            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (menu) menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        }

        closeSyncMenu() {
            const fab = document.getElementById('fabGroup');
            const btn = document.getElementById('syncBtn');
            const menu = document.getElementById('syncMenu');

            if (fab) fab.classList.remove('sync-open');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            if (menu) menu.setAttribute('aria-hidden', 'true');
        }

        startCloudDownload() {
            this.closeSyncMenu();
            return this.cloudDownload(false);
        }

        startCloudUpload() {
            this.closeSyncMenu();
            return this.cloudUpload(false);
        }


        toggleCloudSync(checked) { this.data.settings.autoUpload = checked; this.data.settings.autoDownload = checked; this.saveToDB(); }
        triggerAutoUpload() { 
        console.log('triggerAutoUpload: Called');

        // Respect the Settings checkbox
        if (!this.data?.settings?.autoUpload) {
            console.log('triggerAutoUpload: autoUpload disabled; skipping.');
            return;
        }

        // Debounce (prevents spam uploads if multiple saves happen quickly)
        if (this.uploadTimer) clearTimeout(this.uploadTimer);

        this.uploadTimer = setTimeout(() => {
            console.log('triggerAutoUpload: Debounced call to cloudUpload(true)');
            this.cloudUpload(true);
        }, 1500);
        }

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
            console.warn("Theme.js missing. Applying fallback styles.");
            const root = document.documentElement;
            root.style.setProperty('--bg-body', '#0f1115');
            root.style.setProperty('--bg-card', '#181b21');
            root.style.setProperty('--text-main', '#e4e4e7');
            root.style.setProperty('--accent', '#c084fc');
        }
        
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

    // --- UPDATED SMART SYNC (FIXED DELETION + CHAT SYNC) ---
    async cloudUpload(silent = false) {
        console.log('cloudUpload: Called with silent =', silent);
        const token = localStorage.getItem('nomi_gh_token'); 
        const gistId = localStorage.getItem('nomi_gist_id');
        console.log('cloudUpload: token exists?', !!token, 'gistId exists?', !!gistId);
        if (!token || !gistId) { 
            console.warn('cloudUpload: Missing credentials, returning');
            if(!silent) alert("Please enter both a GitHub Token and Gist ID."); 
            return; 
        }
        
        if(!silent && !confirm("Overwrite Cloud Save with current data?")) return;

        const pill = document.getElementById('syncBtn'); 
        const icon = document.getElementById('syncIcon'); 
        const text = document.getElementById('syncText');
        
        if (silent) { pill.classList.add('expanded'); icon.classList.add('spin'); text.innerText = "Checking..."; } 
        else { this.showToast("Analyzing changes...", "info", 0); }

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
            const localNomiIds = new Set(this.data.nomis.map(n => `n_${n.id}.json`));
            const localGroupIds = new Set(this.data.groups.map(g => `g_${g.id}.json`));

            Object.keys(currentFiles).forEach(filename => {
                if(filename === "nomi-data.json") { 
                    filesToUpload[filename] = null; 
                    uploadCount++; 
                }
                if(filename.startsWith('n_') && filename.endsWith('.json')) {
                    if(!localNomiIds.has(filename)) { 
                        filesToUpload[filename] = null; 
                        delete syncCache[filename]; 
                        uploadCount++;
                    }
                }
                if(filename.startsWith('g_') && filename.endsWith('.json')) {
                    if(!localGroupIds.has(filename)) { 
                        filesToUpload[filename] = null; 
                        delete syncCache[filename]; 
                        uploadCount++;
                    }
                }
            });

            // 3. DETECT CHANGES (SMART HASHING)
            
            const checkAndQueue = (filename, dataObj) => {
                const content = JSON.stringify(dataObj);
                const hash = this.simpleHash(content);
                
                if (syncCache[filename] !== hash || !currentFiles[filename]) {
                    filesToUpload[filename] = { content: content };
                    syncCache[filename] = hash;
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

            // Check Meta Files
            const metaSettings = { ...this.data.settings };
            delete metaSettings.theme; delete metaSettings.startView; delete metaSettings.syncCache; 
            checkAndQueue("settings.json", metaSettings);
            
            checkAndQueue("index.json", {
                nomis: this.data.nomis.map(n => ({ id: n.id, name: n.name })),
                groups: this.data.groups.map(g => ({ id: g.id, name: g.name }))
            });

            // --- Chat Sync (rooms + messages) ---
            // Prefer chatManager (IndexedDB). Fallback to legacy localStorage if needed.
            let chatRooms = [];
            let chatMsgs = {};

            console.log('cloudUpload: Loading chat data...');
            console.log('cloudUpload: window.chatManager exists?', !!window.chatManager);
            
            if (window.chatManager && typeof chatManager.whenReady === 'function') {
            try {
                await chatManager.whenReady();
                
                // Force flush any pending writes before reading
                if (typeof chatManager._flushKVWrites === 'function') {
                    await chatManager._flushKVWrites();
                }
                
                chatRooms = Array.isArray(chatManager.rooms) ? chatManager.rooms : [];
                chatMsgs = (chatManager.messages && typeof chatManager.messages === 'object') ? chatManager.messages : {};
                console.log('cloudUpload: Loaded from chatManager - rooms:', chatRooms.length, 'message keys:', Object.keys(chatMsgs).length);
            } catch (e) {
                console.warn("cloudUpload: chatManager not ready, falling back to localStorage.", e);
            }
            }

            // Fallback to localStorage if no data from chatManager
            if (!chatRooms.length && localStorage.getItem('nomi_chat_rooms')) {
            try {
                chatRooms = JSON.parse(localStorage.getItem('nomi_chat_rooms') || '[]');
                console.log('cloudUpload: Loaded rooms from localStorage:', chatRooms.length);
            } catch (e) {
                console.warn('cloudUpload: Failed to parse rooms from localStorage', e);
                chatRooms = [];
            }
            }
            if (Object.keys(chatMsgs).length === 0 && localStorage.getItem('nomi_chat_messages')) {
            try {
                chatMsgs = JSON.parse(localStorage.getItem('nomi_chat_messages') || '{}');
                console.log('cloudUpload: Loaded messages from localStorage:', Object.keys(chatMsgs).length);
            } catch (e) {
                console.warn('cloudUpload: Failed to parse messages from localStorage', e);
                chatMsgs = {};
            }
            }

            console.log('cloudUpload: Final chat data - rooms:', chatRooms.length, 'message keys:', Object.keys(chatMsgs).length);

            // Normalize: room messages saved under stable room.cloudId (not device-local room.id)
            const normalizedMsgs = {};
            for (const [k, v] of Object.entries(chatMsgs || {})) {
            if (typeof k === 'string' && k.startsWith('room_')) {
                const r = chatRooms.find(rr => rr.id === k);
                normalizedMsgs[(r && r.cloudId) ? r.cloudId : k] = v;
            } else {
                normalizedMsgs[k] = v; // nomi UUID keys stay as-is
            }
            }

            console.log('cloudUpload: Normalized messages - keys:', Object.keys(normalizedMsgs).length);
            console.log('cloudUpload: About to checkAndQueue chat files...');
            
            const roomsQueued = checkAndQueue('chat_rooms.json', chatRooms);
            const msgsQueued = checkAndQueue('chat_messages.json', normalizedMsgs);
            
            console.log('cloudUpload: chat_rooms.json queued?', roomsQueued);
            console.log('cloudUpload: chat_messages.json queued?', msgsQueued);


            // 4. EXECUTE UPLOAD
            console.log('cloudUpload: Upload count:', uploadCount, 'Files to upload:', Object.keys(filesToUpload));
            if(uploadCount === 0) {
                 console.log('cloudUpload: No changes detected, skipping upload');
                 if(silent) { 
                    text.innerText = "Up to Date"; 
                    setTimeout(() => { pill.classList.remove('expanded'); icon.classList.remove('spin'); }, 2000); 
                } else { 
                    this.showToast("Already up to date!"); 
                }
                this.data.settings.syncCache = syncCache;
                this.saveToDB(true);
                return;
            }

            if(silent) text.innerText = `Syncing ${uploadCount} files...`;
            else this.showToast(`Uploading ${uploadCount} changes...`, "info", 0);

            await fetch(`https://api.github.com/gists/${gistId}`, { 
                method: 'PATCH', 
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ files: filesToUpload }) 
            });

            this.data.settings.syncCache = syncCache;
            await this.saveToDB(true); 

            if(silent) { 
                text.innerText = "Synced"; this.flashSyncSuccess(); 
                setTimeout(() => { pill.classList.remove('expanded'); icon.classList.remove('spin'); }, 2000); 
            } else { 
                this.showToast("Cloud Upload Complete!", "success", 2400); this.flashSyncSuccess(); 
            }

        } catch (e) {
            console.error(e);
            alert("SYNC FAILED: " + e.message);
            if(!silent) { this.showToast("Sync failed: " + e.message, "error", 6000); }
            if(silent) { pill.classList.remove('expanded'); icon.classList.remove('spin'); }
        }
    }

    // ==========================================
    // SMART MERGE HELPER (Prevents Data Loss)
    // ==========================================
        mergeChatData(localData, cloudData, type) {
        // Normalize undefined/null
        localData = localData ?? (type === 'rooms' ? [] : {});
        cloudData = cloudData ?? (type === 'rooms' ? [] : {});

        // ---------- ROOMS: arrays ----------
        if (type === 'rooms') {
            const localArr = Array.isArray(localData) ? localData : [];
            const cloudArr = Array.isArray(cloudData) ? cloudData : [];

            // Use cloudId when possible; fall back to id so rooms without cloudId don't vanish.
            const keyForRoom = (r) => (r && (r.cloudId || r.id)) || null;

            const merged = new Map();

            // Local first
            for (const r of localArr) {
                const k = keyForRoom(r);
                if (!k) continue;
                merged.set(k, r);
            }

            // Cloud merges in (cloud overwrites, but preserve local `id` if cloud doesn't have one)
            for (const r of cloudArr) {
                const k = keyForRoom(r);
                if (!k) continue;
                const existing = merged.get(k);
                if (existing) {
                    merged.set(k, { ...existing, ...r, id: (r.id ?? existing.id) });
                } else {
                    merged.set(k, r);
                }
            }

            return Array.from(merged.values());
        }

        // ---------- MESSAGES: objects ----------
        // Expected: { "<chatId>": [ {sender,text,timestamp,...}, ... ], ... }
        const localObj = (localData && typeof localData === 'object' && !Array.isArray(localData)) ? localData : {};
        const cloudObj = (cloudData && typeof cloudData === 'object' && !Array.isArray(cloudData)) ? cloudData : {};

        const out = { ...localObj };

        const getMsgId = (m) => (m?.id ?? m?.message_id ?? m?.msgId ?? null);
        const getMsgTs = (m) => (m?.timestamp ?? m?.ts ?? m?.time ?? m?.createdAt ?? 0);
        const getMsgSender = (m) => (m?.sender ?? m?.role ?? m?.author ?? '');
        const getMsgText = (m) => (m?.text ?? m?.content ?? m?.message ?? '');

        for (const key of Object.keys(cloudObj)) {
            const l = Array.isArray(out[key]) ? out[key] : [];
            const c = Array.isArray(cloudObj[key]) ? cloudObj[key] : [];

            // Merge + de-dupe messages by id (fallback to timestamp+sender+text)
            const seen = new Set();
            const merged = [];

            const add = (msg) => {
                if (!msg || typeof msg !== 'object') return;
                const id = getMsgId(msg);
                const ts = getMsgTs(msg);
                const sender = getMsgSender(msg);
                const text = getMsgText(msg);
                const dedupeKey = id ? `id:${id}` : `${ts}|${sender}|${text}`;
                if (seen.has(dedupeKey)) return;
                seen.add(dedupeKey);
                merged.push(msg);
            };

            l.forEach(add);
            c.forEach(add);

            // Keep chronological order if timestamps exist
            merged.sort((a, b) => getMsgTs(a) - getMsgTs(b));

            out[key] = merged;
        }

        return out;
    }

        async cloudDownload(silent = false) {
    const token = localStorage.getItem('nomi_gh_token');
    const gistId = localStorage.getItem('nomi_gist_id');
    if (!token || !gistId) { if (!silent) alert("Please enter keys."); return; }

    const pill = document.getElementById('syncBtn');
    const icon = document.getElementById('syncIcon');
    const text = document.getElementById('syncText');

    const setSyncUi = (label) => {
        if (silent) {
            try { pill?.classList.add('expanded'); } catch {}
            try { icon?.classList.add('spin'); } catch {}
            if (text) text.innerText = label;
        } else {
            this.showToast(label);
        }
    };

    const clearSyncUi = () => {
        if (silent) {
            try { pill?.classList.remove('expanded'); } catch {}
            try { icon?.classList.remove('spin'); } catch {}
        }
    };

    const safeParse = (s) => {
        try { return JSON.parse(s); } catch { return null; }
    };

    // Fetch gist (file list + small file contents)
    const fetchGist = async () => {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'GET',
            cache: 'no-store',
            headers: { 'Authorization': `token ${token}` }
        });
        if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
        return await res.json();
    };

    // Get JSON for a file entry in the gist:
    // - if not truncated, use inline content
    // - if truncated, fetch raw_url with cache-bust
    const readFileJson = async (fileObj, filename, fallback = null) => {
        try {
            if (!fileObj) return fallback;

            if (typeof fileObj.content === 'string' && !fileObj.truncated) {
                const parsed = safeParse(fileObj.content);
                return parsed ?? fallback;
            }

            if (fileObj.raw_url) {
                const bustUrl = `${fileObj.raw_url}${fileObj.raw_url.includes('?') ? '&' : '?'}t=${Date.now()}`;
                const r = await fetch(bustUrl, { cache: 'no-store' });
                if (!r.ok) return fallback;
                const txt = await r.text();
                const parsed = safeParse(txt);
                return parsed ?? fallback;
            }

            return fallback;
        } catch {
            return fallback;
        }
    };

    const normalizeRooms = (rooms) => Array.isArray(rooms) ? rooms : [];
    const normalizeMsgs = (msgs) => (msgs && typeof msgs === 'object' && !Array.isArray(msgs)) ? msgs : {};

    const safeLoadJson = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    };

    try {
        setSyncUi("Downloading...");

        // 1) Fetch gist once
        const gist = await fetchGist();
        const files = gist?.files || {};

        // 2) Read index + settings first (they tell us what to fetch)
        const indexData = await readFileJson(files['index.json'], 'index.json', { nomis: [], groups: [] });
        const settingsData = await readFileJson(files['settings.json'], 'settings.json', {});

        // 3) Determine which nomi/group files to fetch
        // Prefer index.json (authoritative). Fallback: scan file list.
        const nomiFileNames = [];
        const groupFileNames = [];

        if (indexData && Array.isArray(indexData.nomis) && indexData.nomis.length) {
            for (const n of indexData.nomis) {
                if (n && (n.id !== undefined && n.id !== null)) nomiFileNames.push(`n_${n.id}.json`);
            }
        } else {
            for (const name of Object.keys(files)) {
                if (name.startsWith('n_') && name.endsWith('.json')) nomiFileNames.push(name);
            }
        }

        if (indexData && Array.isArray(indexData.groups) && indexData.groups.length) {
            for (const g of indexData.groups) {
                if (g && (g.id !== undefined && g.id !== null)) groupFileNames.push(`g_${g.id}.json`);
            }
        } else {
            for (const name of Object.keys(files)) {
                if (name.startsWith('g_') && name.endsWith('.json')) groupFileNames.push(name);
            }
        }

        // 4) Fetch nomis/groups (these might be truncated, so use readFileJson)
        setSyncUi("Downloading nomis/groups...");

        const nomiPromises = nomiFileNames
            .filter(fn => files[fn])
            .map(fn => readFileJson(files[fn], fn, null));

        const groupPromises = groupFileNames
            .filter(fn => files[fn])
            .map(fn => readFileJson(files[fn], fn, null));

        const [cloudNomisRaw, cloudGroupsRaw] = await Promise.all([
            Promise.all(nomiPromises),
            Promise.all(groupPromises)
        ]);

        const cloudNomis = (cloudNomisRaw || []).filter(Boolean);
        const cloudGroups = (cloudGroupsRaw || []).filter(Boolean);

        // 5) Fetch chat files
        setSyncUi("Downloading chats...");

        let cloudChatRooms = await readFileJson(files['chat_rooms.json'], 'chat_rooms.json', []);
        let cloudChatMsgs  = await readFileJson(files['chat_messages.json'], 'chat_messages.json', {});

        cloudChatRooms = normalizeRooms(cloudChatRooms);
        cloudChatMsgs  = normalizeMsgs(cloudChatMsgs);

        // 6) Merge chats (prefer chatManager because it reflects IndexedDB)
        if (window.chatManager && typeof chatManager.whenReady === 'function') {
            try { await chatManager.whenReady(); } catch {}
        }

        const localChatRooms = (window.chatManager && Array.isArray(chatManager.rooms) && chatManager.rooms.length)
            ? normalizeRooms(chatManager.rooms)
            : normalizeRooms(safeLoadJson('nomi_chat_rooms', []));

        const localChatMsgs = (window.chatManager && chatManager.messages && typeof chatManager.messages === 'object' && Object.keys(chatManager.messages).length)
            ? normalizeMsgs(chatManager.messages)
            : normalizeMsgs(safeLoadJson('nomi_chat_messages', {}));

        let finalRooms = this.mergeChatData(localChatRooms, cloudChatRooms, 'rooms');
        let finalMsgs  = this.mergeChatData(localChatMsgs, cloudChatMsgs, 'messages');

        // 7) OPTIONAL: API ghost-room cleanup (only if apiKey exists)
        if (settingsData?.apiKey && Array.isArray(finalRooms) && finalRooms.length > 0) {
            try {
                const apiRes = await this.fetchProxy("https://api.nomi.ai/v1/rooms", settingsData.apiKey);
                const apiData = await apiRes.json();

                if (apiData && (apiData.rooms || Array.isArray(apiData))) {
                    const liveRooms = apiData.rooms || apiData;
                    const liveRoomUuids = liveRooms.map(r => r.uuid);

                    finalRooms = finalRooms.filter(r => liveRoomUuids.includes(r.cloudId));

                    const validNomiUuids = cloudNomis.map(n => n.uuid).filter(Boolean);
                    const validRoomIds = finalRooms.map(r => r.id);
                    const validRoomCloudIds = finalRooms.map(r => r.cloudId).filter(Boolean);

                    const cleanedMsgs = {};
                    Object.keys(finalMsgs || {}).forEach(key => {
                        if (validRoomIds.includes(key) || validRoomCloudIds.includes(key) || validNomiUuids.includes(key)) {
                            cleanedMsgs[key] = finalMsgs[key];
                        }
                    });
                    finalMsgs = cleanedMsgs;
                }
            } catch (e) {
                console.warn("API Verification failed, preserving history.");
            }
        }

        // 8) Remap messages keyed by room.cloudId back to local room.id
        const cloudIdToLocalId = new Map(
            finalRooms
                .filter(r => r && r.cloudId && r.id)
                .map(r => [r.cloudId, r.id])
        );

        const remappedMsgs = {};
        for (const [key, arr] of Object.entries(finalMsgs || {})) {
            const targetKey = cloudIdToLocalId.get(key) || key;
            const list = Array.isArray(arr) ? arr : [];
            if (!remappedMsgs[targetKey]) remappedMsgs[targetKey] = [];
            remappedMsgs[targetKey].push(...list);
        }

        // De-dupe + sort
        for (const k of Object.keys(remappedMsgs)) {
            const seen = new Set();
            const merged = [];

            for (const msg of remappedMsgs[k]) {
                if (!msg || typeof msg !== 'object') continue;

                const msgId     = (msg.id ?? msg.message_id ?? msg.msgId);
                const msgTs     = (msg.timestamp ?? msg.ts ?? msg.time ?? msg.createdAt ?? 0);
                const msgSender = (msg.sender ?? msg.role ?? msg.author ?? '');
                const msgText   = (msg.text ?? msg.content ?? msg.message ?? '');

                const dedupeKey = msgId ? `id:${msgId}` : `${msgTs}|${msgSender}|${msgText}`;
                if (seen.has(dedupeKey)) continue;

                seen.add(dedupeKey);
                merged.push(msg);
            }

            merged.sort((a, b) => ((a.timestamp ?? a.ts ?? 0) - (b.timestamp ?? b.ts ?? 0)));
            remappedMsgs[k] = merged;
        }

        finalMsgs = remappedMsgs;

        // 9) Save chats (fallback) + push into chatManager + flush
        localStorage.setItem('nomi_chat_rooms', JSON.stringify(finalRooms || []));
        localStorage.setItem('nomi_chat_messages', JSON.stringify(finalMsgs || {}));

        if (window.chatManager) {
            try {
                if (typeof chatManager.whenReady === 'function') await chatManager.whenReady();

                chatManager.rooms = finalRooms || [];
                chatManager.messages = finalMsgs || {};

                if (typeof chatManager.saveRooms === 'function') chatManager.saveRooms();
                if (typeof chatManager.saveMessages === 'function') chatManager.saveMessages();

                if (typeof chatManager._flushKVWrites === 'function') await chatManager._flushKVWrites();

                if (typeof chatManager.updateGlobalBadge === 'function') chatManager.updateGlobalBadge();
            } catch (e) {
                console.warn("Failed to push downloaded chat data into chatManager:", e);
            }
        }

        // 10) Apply settings/nomis/groups to your main app data
        // IMPORTANT: don't blow away other fields your app stores; just update what we synced.
        const prev = this.data || { settings: {}, nomis: [], groups: [] };
        const themeKeep = prev?.settings?.theme;

        // Merge settings but preserve local-only UI prefs
        const mergedSettings = { ...(prev.settings || {}), ...(settingsData || {}) };
        // keep these local-only
        if (themeKeep) mergedSettings.theme = themeKeep;

        this.data = {
            ...prev,
            settings: mergedSettings,
            nomis: Array.isArray(cloudNomis) ? cloudNomis : [],
            groups: Array.isArray(cloudGroups) ? cloudGroups : []
        };

        // 11) Persist to IndexedDB + refresh UI
        if (typeof this.applyTheme === 'function') this.applyTheme(this.data.settings.theme || 'cyber');
        await this.saveToDB(true);

        // Debug snapshot
        const debugInfo = {
            timestamp: new Date().toISOString(),
            nomis: this.data.nomis.length,
            groups: this.data.groups.length,
            cloudRooms: cloudChatRooms.length,
            cloudMsgKeys: Object.keys(cloudChatMsgs).length,
            finalRooms: finalRooms.length,
            finalMsgKeys: Object.keys(finalMsgs).length,
            nomiFiles: nomiFileNames,
            groupFiles: groupFileNames
        };
        localStorage.setItem('nomi_last_download_debug', JSON.stringify(debugInfo, null, 2));

        // 12) Finish UI
        if (silent) {
            if (text) text.innerText = "Synced";
            if (typeof this.flashSyncSuccess === 'function') this.flashSyncSuccess();
            if (typeof this.renderGallery === 'function') this.renderGallery();
            setTimeout(() => clearSyncUi(), 2000);
        } else {
            let totalMsgCount = 0;
            for (const msgs of Object.values(finalMsgs || {})) {
                if (Array.isArray(msgs)) totalMsgCount += msgs.length;
            }

            alert(
                `Download Complete!\n\n` +
                `Nomis: ${this.data.nomis.length}\n` +
                `Groups: ${this.data.groups.length}\n` +
                `Rooms: ${finalRooms.length}\n` +
                `Chat conversations: ${Object.keys(finalMsgs || {}).length}\n` +
                `Total messages: ${totalMsgCount}\n\n` +
                `The page will now reload to apply changes.`
            );

            try {
                if (window.chatManager && typeof chatManager._flushKVWrites === 'function') {
                    await chatManager._flushKVWrites();
                }
            } catch {}

            location.reload();
        }

    } catch (e) {
        console.error(e);
        if (!silent) alert("Sync Error: " + e.message);
        clearSyncUi();
    }
}

    
    toggleCloudHelp() { document.getElementById('cloudHelpModal').classList.toggle('active'); }
    exportCloudCreds() { const token = localStorage.getItem('nomi_gh_token'); const gistId = localStorage.getItem('nomi_gist_id'); if(!token || !gistId) return alert("No Cloud Keys found to export."); const keys = { token: token, gistId: gistId }; const s = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keys)); const a = document.createElement('a'); a.href = s; a.download = "nomi_cloud_keys.json"; document.body.appendChild(a); a.click(); a.remove(); }
    importCloudCreds(input) { const f = input.files[0]; if(!f) return; const r = new FileReader(); r.onload = (e) => { try { const j = JSON.parse(e.target.result); if(j.token && j.gistId) { localStorage.setItem('nomi_gh_token', j.token); localStorage.setItem('nomi_gist_id', j.gistId); document.getElementById('ghTokenInput').value = j.token; document.getElementById('gistIdInput').value = j.gistId; alert("✅ Keys Imported Successfully!"); } else { alert("Invalid Key File."); } } catch (err) { alert("Error reading file."); } input.value = ''; }; r.readAsText(f); }
    async syncFromApi() {
        if (this.isSyncing) return;
        
        // Use the newly shared fetchProxy
        if (!this.data.settings.apiKey) { 
            alert("Please go to Settings and enter your Nomi.ai API Key first."); 
            this.toggleSettings(); 
            return; 
        }

        this.isSyncing = true;
        const pill = document.getElementById('syncBtn');
        const icon = document.getElementById('syncIcon');
        const text = document.getElementById('syncText');
        
        pill.classList.add('expanded');
        icon.classList.add('spin');
        text.innerText = "Connecting...";

        try {
            const listRes = await this.fetchProxy("https://api.nomi.ai/v1/nomis");
            const listData = await listRes.json();

            if (!listData || !listData.nomis) throw new Error("Invalid data received from API.");

            let added = 0;
            let updated = 0;
            text.innerText = "Importing...";

            for (const r of listData.nomis) {
                let l = this.data.nomis.find(n => n.uuid === r.uuid || n.name === r.name);

                if (!l) {
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
                    // [FIX] Always update UUID to match server, ensuring we never have stale IDs
                    if (l.uuid !== r.uuid) l.uuid = r.uuid; 
                    updated++;
                }

                if (!l.photo) {
                    try {
                        const avRes = await this.fetchProxy(`https://api.nomi.ai/v1/nomis/${r.uuid}/avatar`);
                        const b = await avRes.blob();
                        l.photo = await new Promise(resolve => {
                            const fr = new FileReader();
                            fr.onloadend = () => resolve(fr.result);
                            fr.readAsDataURL(b);
                        });
                        
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
    
    createNomi() { this.createContext('nomi'); }  
    editNomi(id, pushHistory = true, initialTab = 'profile') { 
        this.editContext(id, 'nomi', pushHistory, initialTab); 
    }

    createContext(type) {
        const id = Date.now();
        const isGroup = type === 'group';
        
        const newObj = {
            id: id,
            name: isGroup ? "New Group" : "New Nomi",
            photo: null,
            banner: null,
            gallery: [],
            custom_sections: [],
            sectionOrder: isGroup ? ['backstory'] : DEFAULT_SECTIONS.map(s => s.id),
            ...(isGroup ? { members: [] } : { data: {}, isFavorite: false })
        };

        if (isGroup) this.data.groups.push(newObj);
        else this.data.nomis.push(newObj);

        this.saveToDB().then(() => this.editContext(id, type));
    }
    
    editContext(id, type, pushHistory = true, initialTab = 'profile') {
        if (type === 'group') this.currentGroupId = id;
        else this.currentNomiId = id;

        this.saveState(type, id);
        this.isReordering = false;
        this.isBatchMode = false;
        this.selectedImages.clear();

        const suffix = type === 'group' ? 'Group' : 'Nomi';
        const btnSort = document.getElementById('btnSort' + suffix);
        const btnReset = document.getElementById('btnReset' + suffix);
        if(btnSort) btnSort.classList.remove('active');
        if(btnReset) btnReset.style.visibility = 'hidden';

        if(pushHistory) history.pushState({view: type, id: id, tab: initialTab}, '', `#${type}/${id}`);

        const target = type === 'group' ? this.data.groups.find(x => x.id === id) : this.data.nomis.find(x => x.id === id);
        
        if(!target.sectionOrder) {
            target.sectionOrder = type === 'group' ? ['backstory'] : DEFAULT_SECTIONS.map(s => s.id);
            if(target.custom_sections) target.custom_sections.forEach(cs => target.sectionOrder.push(cs.id));
        }

        document.getElementById('viewHome').style.display = 'none';
        document.getElementById('viewNomi').style.display = type === 'nomi' ? 'block' : 'none';
        document.getElementById('viewGroup').style.display = type === 'group' ? 'block' : 'none';
        document.getElementById('heroBackground').style.backgroundImage = 'none';
        window.scrollTo(0, 0);

        this.toggleNameEdit(type, false);
        document.getElementById(type + 'NameDisplay').innerText = target.name;
        document.getElementById(type + 'Name').value = target.name;

        const disp = document.getElementById(type + 'ImageDisplay');
        const plac = document.getElementById(type + 'ImagePlaceholder');
        if(target.photo) {
            disp.src = target.photo; disp.style.display = 'block'; plac.style.display = 'none';
        } else {
            disp.style.display = 'none'; plac.style.display = 'flex';
            plac.innerText = target.name ? target.name.charAt(0) : '?';
        }

        if(type === 'group') this.switchGroupTab(initialTab);
        else {
            this.switchTab(initialTab);
            this.renderTraits();
            this.renderFormGrid();
        }
    }
    
    selectGalleryImageOptions(imgUrl, imgId) {
        cropper.initFromUrl(imgUrl, this.currentNomiId ? 'nomi' : 'group');
    }
    
    toggleFavorite(e, id) { e.stopPropagation(); const n = this.data.nomis.find(x => x.id === id); n.isFavorite = !n.isFavorite; this.saveToDB(); this.renderGallery(false); }
    
    renderGallery(animate = false) { 
        const isList = this.dashboardView === 'list';
        const isMobile = window.innerWidth <= 768; // Mobile breakpoint
        const g = document.getElementById('nomiGallery'); 
        const gg = document.getElementById('groupGallery'); 
        
        if(g) { 
            g.innerHTML = ''; 
            if(isList) {
                g.classList.add('list-mode');
                // Create two column containers for list mode (desktop only uses both)
                g.innerHTML = '<div class="list-col" data-col="0"></div><div class="list-col" data-col="1"></div>';
            } else {
                g.classList.remove('list-mode');
            }
        }
        
        if(gg) { 
            gg.innerHTML = ''; 
            if(isList) {
                gg.classList.add('list-mode');
                // Create two column containers for list mode (desktop only uses both)
                gg.innerHTML = '<div class="list-col" data-col="0"></div><div class="list-col" data-col="1"></div>';
            } else {
                gg.classList.remove('list-mode');
            }
        }

        const term = (document.getElementById('searchInput').value || '').toLowerCase(); 

        // --- Helper: apply saved manual order (fallback keeps previous behavior) ---
        const order = this.data?.settings?.dashboardOrder || { nomis: [], groups: [] };
        const nomiOrder = Array.isArray(order.nomis) ? order.nomis : [];
        const groupOrder = Array.isArray(order.groups) ? order.groups : [];

        const buildIndexMap = (arr) => {
            const map = new Map();
            arr.forEach((id, idx) => map.set(Number(id), idx));
            return map;
        };

        const sortByManualOrder = (items, orderArr, fallbackCmp) => {
            const idxMap = buildIndexMap(orderArr);
            return items.slice().sort((a, b) => {
                const ai = idxMap.has(a.id) ? idxMap.get(a.id) : Infinity;
                const bi = idxMap.has(b.id) ? idxMap.get(b.id) : Infinity;
                if (ai !== bi) return ai - bi;
                return fallbackCmp(a, b);
            });
        };

        const nomiFallbackCmp = (a, b) => {
            // Default dashboard behavior: Favorites first, then name
            if (a.isFavorite !== b.isFavorite) return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
            return (a.name || '').localeCompare((b.name || ''), undefined, { sensitivity: 'base' });
        };

        const groupFallbackCmp = (a, b) =>
            (a.name || '').localeCompare((b.name || ''), undefined, { sensitivity: 'base' });

        // --- Nomis ---
        const nomisFiltered = this.data.nomis
            .filter(n => (n.name || '').toLowerCase().includes(term));

        const sortedNomis = nomiOrder.length
            ? sortByManualOrder(nomisFiltered, nomiOrder, nomiFallbackCmp)
            : nomisFiltered.slice().sort(nomiFallbackCmp);

        sortedNomis.forEach((n, index) => { 
            const favClass = n.isFavorite ? 'active' : ''; 
            const animClass = animate ? 'pop-in' : ''; 
            const letter = n.name ? n.name.charAt(0) : '?';
            const imgHtml = n.photo 
                ? `<img src="${n.photo}" loading="lazy">` 
                : `<div class="card-placeholder">${letter}</div>`;
            const html = `
                <div class="nomi-card ${animClass}" data-type="nomi" data-id="${n.id}" onclick="app.onDashboardCardClick('nomi', ${n.id})" oncontextmenu="app.showContextMenu(event, ${n.id}, 'nomi')">
                    ${imgHtml}
                    <button class="fav-btn ${favClass}" onclick="app.toggleFavorite(event, ${n.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                    <div class="nomi-card-info">${n.name}</div>
                </div>`; 
            
            if(isList) {
                // On mobile, put everything in first column; on desktop, alternate
                const colIndex = isMobile ? 0 : (index % 2);
                const col = g.children[colIndex];
                col.insertAdjacentHTML('beforeend', html);
            } else {
                g.insertAdjacentHTML('beforeend', html);
            }
        }); 

        // --- Groups ---
        const groupsFiltered = this.data.groups
            .filter(gr => (gr.name || '').toLowerCase().includes(term));

        const sortedGroups = groupOrder.length
            ? sortByManualOrder(groupsFiltered, groupOrder, groupFallbackCmp)
            : groupsFiltered.slice().sort(groupFallbackCmp);

        sortedGroups.forEach((gr, index) => { 
            const animClass = animate ? 'pop-in' : '';
            const letter = gr.name ? gr.name.charAt(0) : '?';
            const imgHtml = gr.photo 
                ? `<img src="${gr.photo}" loading="lazy">` 
                : `<div class="card-placeholder">${letter}</div>`;
            const html = `
                <div class="nomi-card ${animClass}" data-type="group" data-id="${gr.id}" onclick="app.onDashboardCardClick('group', ${gr.id})" oncontextmenu="app.showContextMenu(event, ${gr.id}, 'group')">
                    ${imgHtml}
                    <div class="nomi-card-info">${gr.name}</div>
                </div>`; 
            
            if(isList) {
                // On mobile, put everything in first column; on desktop, alternate
                const colIndex = isMobile ? 0 : (index % 2);
                const col = gg.children[colIndex];
                col.insertAdjacentHTML('beforeend', html);
            } else {
                gg.insertAdjacentHTML('beforeend', html);
            }
        }); 

        // Ensure drag bindings reflect current mode
        this.refreshDashboardDraggables();
        this.updateDashboardArrangeButtons();
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
        
        const { type } = this.getCurrentContext();
        const prefix = type === 'group' ? 'btnGroup' : 'btn';
        
        const btn = document.getElementById(prefix + 'BatchMode');
        const delBtn = document.getElementById(prefix + 'BatchDelete');

        if(this.isBatchMode) { btn.classList.add('active'); delBtn.style.display = 'flex'; } 
        else { btn.classList.remove('active'); delBtn.style.display = 'none'; }
        
        const searchInputId = type === 'group' ? 'groupGallerySearch' : 'nomiGallerySearch';
        this.filterGallery(document.getElementById(searchInputId).value);
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
        const { target } = this.getCurrentContext();
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
    
    renderSectionCard(sid, label, val, limit, isCust, isReordering, isGroup) {
        const prefix = isGroup ? 'group_sec_' : 'field_';
        const cardId = isGroup ? 'card_group_' + sid : 'card_' + sid;
        const inputId = prefix + sid;
        
        const updateTitleFn = 'updateSectionTitle';
        const deleteFn = 'deleteSection';
        const inputFn = 'handleInput';
        const saveFn = 'saveCurrentContext';
        
        const draggableAttr = isReordering ? 'draggable="true"' : 'draggable="false"';
        const handleStyle = isReordering ? 'display:block;' : '';
        const isOverLimit = (!isCust && val.length > limit);
        const countDisplay = isCust ? '' : `<span id="count_${sid}" style="font-size:0.7rem; opacity:0.6; ${isOverLimit ? 'color:#ef4444' : ''}">${val.length}/${limit}</span>`;

        return `
        <div class="glass-card collapsed ${isOverLimit ? 'over-limit' : ''}" id="${cardId}" ${draggableAttr} 
             ondragstart="app.handleDragStart(event, '${sid}', ${isGroup})" ondragend="app.handleDragEnd(event)">
            
            <div class="card-header" onclick="app.toggleCard(this.parentNode)">
                <div class="card-header-left">
                    <span class="drag-handle" style="${handleStyle}" 
                          onmousedown="event.stopPropagation()" ontouchstart="app.handleTouchStart(event)" 
                          ontouchmove="app.handleTouchMove(event)" ontouchend="app.handleTouchEnd(event)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </span>
                    ${isCust 
                        ? `<input type="text" value="${label}" style="background:transparent;border:none;color:var(--accent);font-weight:700;font-size:0.85rem;width:100%;font-family:inherit;letter-spacing:1px;text-transform:uppercase;padding:0;margin:0;-webkit-user-select:text;user-select:text;" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()" oninput="app.${updateTitleFn}('${sid}', this.value)">` 
                        : `<span>${label}</span>`
                    }
                </div>
                <div class="card-controls">
                    ${isCust 
                        ? `<button class="tool-btn del" style="width:20px;height:20px;" onclick="event.stopPropagation(); app.${deleteFn}('${sid}')">×</button>` 
                        : countDisplay
                    }
                    <span class="card-arrow">▼</span>
                </div>
            </div>

            <div class="card-body">
                <textarea id="${inputId}" class="ghost-input" oninput="app.${inputFn}('${sid}', ${limit}, ${isCust})">${val}</textarea>
                <div class="btn-row">
                    <div style="display:flex; gap:10px;">
                        <button class="save-btn" onclick="app.${saveFn}(true)">Save</button>
                        <button class="copy-btn" style="background:rgba(239,68,68,0.2); border-color:rgba(239,68,68,0.3); color:#fca5a5;" onclick="app.cancelSection('${sid}', ${isGroup})">Cancel</button>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="copy-btn" onclick="app.pasteText('${inputId}')">Paste</button>
                        <button class="copy-btn" onclick="app.copyText('${inputId}')">Copy</button>
                    </div>
                </div>
            </div>
        </div>`;
    }
    
    renderFormGrid() { 
        const c = document.getElementById('profileGrid'); c.innerHTML = ''; 
        const n = this.data.nomis.find(x => x.id === this.currentNomiId); 
        if(!n) return; 
        
        if(!n.sectionOrder || n.sectionOrder.length === 0) { 
            n.sectionOrder = DEFAULT_SECTIONS.map(s=>s.id); 
            if(n.custom_sections) n.custom_sections.forEach(cs=>n.sectionOrder.push(cs.id)); 
        } 

        if(this.isReordering) { c.ondragover = (e) => app.handleDragOver(e); }

        n.sectionOrder.forEach((sid) => { 
            const def = DEFAULT_SECTIONS.find(d => d.id === sid); 
            const cust = n.custom_sections ? n.custom_sections.find(cs => cs.id === sid) : null; 
            
            if (!def && !cust) return; 
            
            const label = def ? def.label : cust.title; 
            const val = def ? (n.data[sid] || '') : cust.content; 
            const limit = def ? def.limit : 5000; 
            
            c.insertAdjacentHTML('beforeend', this.renderSectionCard(sid, label, val, limit, !!cust, this.isReordering, false)); 
        }); 
    }
    
    setContextPhoto(b64, optionalId) {
        const targetId = optionalId || this.getCurrentContext().id;
        let target = this.data.nomis.find(x => x.id === targetId);
        if (!target) target = this.data.groups.find(x => x.id === targetId);
        
        if (target) {
            target.photo = b64;
            this.saveToDB();
            
            if (this.currentNomiId === targetId) {
                const d = document.getElementById('nomiImageDisplay');
                const p = document.getElementById('nomiImagePlaceholder');
                if(d && p) { d.src = b64; d.style.display = 'block'; p.style.display = 'none'; }
            } else if (this.currentGroupId === targetId) {
                const d = document.getElementById('groupImageDisplay');
                const p = document.getElementById('groupImagePlaceholder');
                if(d && p) { d.src = b64; d.style.display = 'block'; p.style.display = 'none'; }
            }
            this.renderGallery(false);
        }
    }

    addSection() {
        const { target, type } = this.getCurrentContext();
        if(!target.custom_sections) target.custom_sections = [];
        
        const prefix = type === 'group' ? 'cs_g_' : 'cs_';
        const newId = prefix + Date.now();
        
        target.custom_sections.push({ id: newId, title: "New Section", content: "" });
        target.sectionOrder.push(newId);
        this.saveToDB();
        
        if(type === 'group') this.renderGroupSections();
        else this.renderFormGrid();
    }

    updateSectionTitle(id, val) {
        const { target } = this.getCurrentContext();
        const s = target.custom_sections.find(c => c.id === id);
        if(s) { s.title = val; this.saveToDB(); }
    }

    deleteSection(id) {
        if(!confirm("Delete this section?")) return;
        const { target, type } = this.getCurrentContext();
        
        target.custom_sections = target.custom_sections.filter(c => c.id !== id);
        target.sectionOrder = target.sectionOrder.filter(o => o !== id);
        this.saveToDB();
        
        if(type === 'group') this.renderGroupSections();
        else this.renderFormGrid();
    }

    handleInput(id, limit, isCust) {
        const { type } = this.getCurrentContext();
        
        const inputPrefix = type === 'group' ? 'group_sec_' : 'field_';
        const el = document.getElementById(inputPrefix + id);
        if(!el) return;

        const cardPrefix = type === 'group' ? 'card_group_' : 'card_';
        const card = document.getElementById(cardPrefix + id);

        const count = document.getElementById(`count_${id}`);

        if (count) count.innerText = `${el.value.length}/${limit}`;
        
        if (el.value.length > limit) {
            if (card) card.classList.add('over-limit');
            if (count) count.style.color = '#ef4444';
        } else {
            if (card) card.classList.remove('over-limit');
            if (count) count.style.color = 'inherit';
        }

        this.autoResize(el);
    }

    saveCurrentContext(showToast = true) {
        const { target, type } = this.getCurrentContext();
        
        if (type === 'group') {
            const bsEl = document.getElementById('group_sec_backstory');
            if(bsEl) target.backstory = bsEl.value;
        } else {
             DEFAULT_SECTIONS.forEach(s => {
                const el = document.getElementById(`field_${s.id}`);
                if(el) target.data[s.id] = el.value;
             });
        }
        
        if(target.custom_sections) {
            const prefix = type === 'group' ? 'group_sec_' : 'field_';
            target.custom_sections.forEach(s => {
                const el = document.getElementById(prefix + s.id);
                if(el) s.content = el.value;
            });
        }
        
        this.saveToDB().then(() => {
            if(showToast) this.showToast(type === 'group' ? "Group Saved!" : "Profile Saved!");
        });
    }
       
    renderTraits() { const n = this.data.nomis.find(x => x.id === this.currentNomiId); const c = document.getElementById('traitContainer'); c.innerHTML = ''; (n.data.key_traits || []).forEach(t => { const d=document.createElement('div'); d.className='tag'; d.innerText=t+' ×'; d.onclick=()=>{ n.data.key_traits=n.data.key_traits.filter(x=>x!==t); this.saveToDB(); this.renderTraits(); }; c.appendChild(d); }); }
    addTrait(t) { const n=this.data.nomis.find(x=>x.id===this.currentNomiId); if(!n.data.key_traits)n.data.key_traits=[]; if(n.data.key_traits.length>=7)return alert("Max 7 traits"); if(t.trim()){ n.data.key_traits.push(t.trim()); this.saveToDB(); this.renderTraits(); } }
    async addGalleryImages(inpt) { 
        const files=Array.from(inpt.files); 
        if(files.length===0)return; 
        const { target } = this.getCurrentContext();
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
        const { target } = this.getCurrentContext();
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
        const { target } = this.getCurrentContext();
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
        const { target } = this.getCurrentContext();
        target.gallery = target.gallery.filter(g => g.id !== id); 
        this.saveToDB(); this.renderPromptGallery(); 
    }
    
    editGroup(id, pushHistory = true, initialTab = 'profile') { 
        this.editContext(id, 'group', pushHistory, initialTab); 
    }
    
    createGroup() { this.createContext('group'); }
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
        if (show) {
            const activeEdits = document.querySelectorAll('.member-role-edit.active');
            activeEdits.forEach(el => {
                const otherId = el.id.split('role_edit_')[1];
                if (otherId && otherId != id) {
                    this.cancelMemberRole(otherId);
                }
            });
        }

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
            this.renderGroupMembers(); 
        }
    }

    cancelMemberRole(id) {
        const g = this.data.groups.find(x => x.id === this.currentGroupId);
        const m = g.members.find(x => x.id === id);
        const input = document.getElementById(`role_input_${id}`);
        
        input.value = m.role || "";
        this.toggleMemberRoleEdit(id, false);
    }
    
    renderGroupSections() { 
        const c = document.getElementById('groupSectionsContainer'); c.innerHTML = ''; 
        const g = this.data.groups.find(x => x.id === this.currentGroupId); 
        
        if(!g.sectionOrder) { 
            g.sectionOrder=['backstory']; 
            (g.custom_sections||[]).forEach(cs=>g.sectionOrder.push(cs.id)); 
        } 
        
        if(this.isReordering) { c.ondragover = (e) => app.handleDragOver(e); }

        g.sectionOrder.forEach(sid => { 
            const isBackstory = sid === 'backstory'; 
            const cust = g.custom_sections ? g.custom_sections.find(cs => cs.id === sid) : null; 
            
            if(!isBackstory && !cust) return; 
            
            const title = isBackstory ? "Group Backstory" : cust.title; 
            const content = isBackstory ? (g.backstory || '') : cust.content;
            const limit = isBackstory ? 1000 : 5000;
            
            c.insertAdjacentHTML('beforeend', this.renderSectionCard(sid, title, content, limit, !isBackstory, this.isReordering, true)); 
        }); 
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
            if (this.db) {
                this.db.close();
            }

            localStorage.clear();

            const req = indexedDB.deleteDatabase(DB_NAME);
            try {
            indexedDB.deleteDatabase('NomiArchChatDB');
            } catch {}
            req.onsuccess = () => {
                alert("Reset Complete. The application will now reload.");
                window.location.reload();
            };

            req.onerror = (e) => {
                console.error("Delete Error:", e);
                alert("Error deleting database. Please manually clear site data in browser settings.");
            };

            req.onblocked = () => {
                alert("Deletion blocked! You have Nomi Manager open in another tab. Please close it and try again.");
            };
        } else if (confirmation !== null) {
            alert("Confirmation phrase did not match. Data was NOT deleted.");
        }
    }
    // --- LEGACY WRAPPERS (Fixes HTML Buttons) ---
    addNomiSection() { this.addSection(); }
    addGroupSection() { this.addSection(); }
    setNomiPhoto(b64, id) { this.setContextPhoto(b64, id); }
    setGroupPhoto(b64, id) { this.setContextPhoto(b64, id); }
    autoSaveNomi() { this.saveCurrentContext(); }
    autoSaveGroup() { this.saveCurrentContext(); }
    updateGroupSectionContent(id, val) { this.handleInput(id, id === 'backstory' ? 1000 : 5000, id !== 'backstory'); }
    copyText(id) { navigator.clipboard.writeText(document.getElementById(id).value).then(()=>this.showToast("Copied!")); }
    showToast(message, variant = null, duration = 2200) {
        const t = document.getElementById('toast');
        if (!t) return;

        const msg = String(message ?? "").trim();

        // Auto-pick a style if caller didn't specify one (keeps your existing calls working nicely)
        if (!variant) {
            const m = msg.toLowerCase();
            if (m.includes("failed") || m.includes("error") || m.includes("https required") || m.includes("invalid")) variant = "error";
            else if (m.includes("delete") || m.includes("removed")) variant = "warning";
            else if (m.includes("saved") || m.includes("copied") || m.includes("updated") || m.includes("created") || m.includes("done")) variant = "success";
            else variant = "info";
        }

        // Cancel any pending hide from a previous toast
        clearTimeout(this._toastTimer);

        t.textContent = msg;
        t.dataset.variant = variant;

        // Restart animation cleanly even when spammed quickly
        t.classList.remove('show');
        void t.offsetWidth; // force reflow
        t.classList.add('show');

        // duration = 0 (or null/Infinity) => keep on screen until another toast replaces it
        if (duration === 0 || duration === null || duration === Infinity) {
            this._toastSticky = true;
            return;
        }

        this._toastSticky = false;
        this._toastTimer = setTimeout(() => {
            t.classList.remove('show');
        }, duration);
    }

    hideToast() {
        const t = document.getElementById('toast');
        if (!t) return;
        clearTimeout(this._toastTimer);
        t.classList.remove('show');
        this._toastSticky = false;
    }
openLightbox(s) { if(!s)return; document.getElementById('lightboxImg').src=s; document.getElementById('lightbox').classList.add('active'); history.pushState({ view: 'lightbox' }, '', '#lightbox');}
    closeLightbox() { document.getElementById('lightbox').classList.remove('active'); if(history.state && history.state.view === 'lightbox') { history.back(); } }
}

const app = new NomiApp(); 
window.app = app; // Explicitly make app globally accessible
window.onload = () => app.init();