"serviceWorker" in navigator && window.addEventListener("load", () => {
  navigator.serviceWorker.register("./sw.js").then(reg => console.log("Service Worker registered")).catch(err => console.log("Service Worker failed", err));
});

const DB_NAME = "NomiArchDB_v22", DB_VERSION = 1, DEFAULT_SECTIONS = [ {
  id: "backstory",
  label: "Backstory",
  limit: 2e3
}, {
  id: "inclination",
  label: "Inclination",
  limit: 150
}, {
  id: "current_roleplay",
  label: "Current Roleplay",
  limit: 750
}, {
  id: "your_appearance",
  label: "Your Appearance",
  limit: 200
}, {
  id: "nomi_appearance",
  label: "Nomi's Appearance",
  limit: 500
}, {
  id: "appearance_tendencies",
  label: "Appearance Tendencies",
  limit: 200
}, {
  id: "nicknames",
  label: "Nicknames",
  limit: 250
}, {
  id: "preferences",
  label: "Preferences",
  limit: 500
}, {
  id: "desires",
  label: "Desires",
  limit: 500
}, {
  id: "boundaries",
  label: "Boundaries",
  limit: 500
} ], cropper = {
  active: !1,
  img: null,
  scale: 1,
  posX: 0,
  posY: 0,
  isDragging: !1,
  startX: 0,
  startY: 0,
  targetType: null,
  contextId: null,
  init(input, type) {
    if (!input.files[0]) return;
    this.targetType = type;
    const reader = new FileReader;
    reader.onload = e => {
      this.openCropModal(e.target.result);
    }, reader.readAsDataURL(input.files[0]);
  },
  setContextId(id) {
    this.contextId = id;
  },
  initFromUrl(url, type) {
    this.targetType = type, this.openCropModal(url);
  },
  openCropModal(src) {
    document.getElementById("cropModal").classList.add("active");
    const img = document.getElementById("cropTarget");
    img.src = src, img.onload = () => {
      const container = document.getElementById("cropContainer"), cw = container.offsetWidth, ch = container.offsetHeight, iw = img.naturalWidth, ih = img.naturalHeight;
      this.scale = Math.max(cw / iw, ch / ih), this.posX = (cw - iw * this.scale) / 2, 
      this.posY = (ch - ih * this.scale) / 2, this.updateTransform(), document.getElementById("cropZoom").value = this.scale;
    };
  },
  setZoom(val) {
    const oldScale = this.scale;
    this.scale = parseFloat(val);
    const container = document.getElementById("cropContainer"), cx = container.offsetWidth / 2, cy = container.offsetHeight / 2, centerX = (cx - this.posX) / oldScale, centerY = (cy - this.posY) / oldScale;
    this.posX = cx - centerX * this.scale, this.posY = cy - centerY * this.scale, this.updateTransform();
  },
  handleWheel(e) {
    e.preventDefault();
    const slider = document.getElementById("cropZoom"), delta = .02 * -Math.sign(e.deltaY);
    let newScale = this.scale + delta;
    const min = parseFloat(slider.min), max = parseFloat(slider.max);
    newScale = Math.max(min, Math.min(newScale, max)), slider.value = newScale, this.setZoom(newScale);
  },
  startDrag(e) {
    e.preventDefault(), this.isDragging = !0;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX, clientY = e.touches ? e.touches[0].clientY : e.clientY;
    this.startX = clientX - this.posX, this.startY = clientY - this.posY;
    const moveHandler = ev => {
      if (!this.isDragging) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX, cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      this.posX = cx - this.startX, this.posY = cy - this.startY, this.updateTransform();
    }, endHandler = () => {
      this.isDragging = !1, document.removeEventListener("mousemove", moveHandler), document.removeEventListener("mouseup", endHandler), 
      document.removeEventListener("touchmove", moveHandler), document.removeEventListener("touchend", endHandler);
    };
    document.addEventListener("mousemove", moveHandler), document.addEventListener("mouseup", endHandler), 
    document.addEventListener("touchmove", moveHandler), document.addEventListener("touchend", endHandler);
  },
  updateTransform() {
    document.getElementById("cropTarget").style.transform = `translate(${this.posX}px, ${this.posY}px) scale(${this.scale})`;
  },
  save() {
    const guide = document.getElementById("cropGuide"), img = document.getElementById("cropTarget"), container = document.getElementById("cropContainer"), guideRect = guide.getBoundingClientRect(), containerRect = container.getBoundingClientRect(), offsetLeft = guideRect.left - containerRect.left, offsetTop = guideRect.top - containerRect.top, width = guideRect.width, height = guideRect.height, canvas = document.createElement("canvas");
    canvas.width = width, canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000", ctx.fillRect(0, 0, width, height), ctx.translate(-offsetLeft, -offsetTop), 
    ctx.translate(this.posX, this.posY), ctx.scale(this.scale, this.scale), ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/webp", .8);
    if ("nomi" === this.targetType) app.setNomiPhoto(dataUrl, this.contextId); else if ("group" === this.targetType) app.setGroupPhoto(dataUrl, this.contextId); else if ("context" === this.targetType) {
      app.data.groups.find(g => g.id === this.contextId) ? app.setGroupPhoto(dataUrl, this.contextId) : app.setNomiPhoto(dataUrl, this.contextId);
    }
    this.cancel();
  },
  cancel() {
    document.getElementById("cropModal").classList.remove("active");
    const n = document.getElementById("nomiPhotoInput");
    n && (n.value = "");
    const g = document.getElementById("groupPhotoInput");
    g && (g.value = "");
    const c = document.getElementById("contextUpload");
    c && (c.value = ""), this.contextId = null;
  }
};

class NomiApp {
  constructor() {
    this.db = null, this.data = {
      nomis: [],
      groups: [],
      settings: {
        theme: "cyber",
        startView: "home",
        lastNomi: null,
        apiKey: "",
        lastState: null,
        dashboardOrder: {
          nomis: [],
          groups: []
        }
      }
    }, this.currentNomiId = null, this.currentGroupId = null, this.contextMenuTarget = null, 
    this.contextMenuType = null, this.isSyncing = !1, this.isReordering = !1, this.touchDragItem = null, 
    this.resizeDebounce = null, this.dragSrcEl = null, this.isBatchMode = !1, this.selectedImages = new Set, 
    this.currentEditingImageId = null, this.gallerySort = "newest", this.gallerySize = "medium", 
    this.galleryShowPrompts = !1, this.dashboardView = "grid", this.isDashboardReordering = !1, 
    this._dashDragEl = null, this._dashDragType = null, this._dashDndSetup = !1;
  }
  async init() {
    await this.openDB(), await this.loadData(), this.migrateData(), this.data.settings.theme && localStorage.setItem("nomi_theme", this.data.settings.theme), 
    this.applyTheme(this.data.settings?.theme || "midnight"), this.initStartView();
    const savedSize = localStorage.getItem("nomi_gallery_size") || "medium";
    let sizeIdx = [ "small", "medium", "large", "xlarge" ].indexOf(savedSize);
    -1 === sizeIdx && (sizeIdx = 1), this.setGallerySize(sizeIdx);
    const savedDash = localStorage.getItem("nomi_dashboard_view") || "grid";
    if (this.setDashboardView(savedDash, !1), this.renderGallery(), this.setupDashboardDnD(), 
    this.updateDashboardArrangeButtons(), document.getElementById("traitInput").addEventListener("keydown", e => {
      "Enter" === e.key && (this.addTrait(e.target.value), e.target.value = "", document.getElementById("traitInput").style.display = "none");
    }), document.addEventListener("click", e => {
      e.target.closest("#memberDropdownWrapper") || document.getElementById("memberOptions").classList.remove("open"), 
      this.hideContextMenu();
    }), document.addEventListener("paste", e => this.handleGlobalPaste(e)), window.addEventListener("popstate", event => {
      document.getElementById("lightbox").classList.remove("active"), event.state && ("home" === event.state.view ? this.goHome(!1) : "nomi" === event.state.view ? this.editNomi(event.state.id, !1, event.state.tab || "profile") : "group" === event.state.view && this.editGroup(event.state.id, !1, event.state.tab || "profile"));
    }), history.replaceState({
      view: "home"
    }, "", ""), setTimeout(() => document.body.style.opacity = "1", 50), this.data.settings.autoDownload) {
      const t = localStorage.getItem("nomi_gh_token"), g = localStorage.getItem("nomi_gist_id");
      t && g && this.cloudDownload(!0);
    }
    setInterval(() => {
      this.data.settings.autoUpload && (console.log("15-minute Interval: Triggering Auto-Sync..."), 
      this.cloudUpload(!0));
    }, 9e5);
  }
  async fetchProxy(url, apiKeyOverride = null) {
    let key = apiKeyOverride || this.data.settings.apiKey;
    if (!key) throw new Error("API Key missing");
    const res = await fetch("https://nomi-proxy.nickszumila.workers.dev/?url=" + encodeURIComponent(url), {
      headers: {
        Authorization: key
      }
    });
    if (401 === res.status || 403 === res.status) throw new Error("Invalid API Key");
    if (!res.ok) throw new Error(`API Error ${res.status}`);
    return res;
  }
  getCurrentContext() {
    const isGroup = "block" === document.getElementById("viewGroup").style.display;
    return {
      type: isGroup ? "group" : "nomi",
      id: isGroup ? this.currentGroupId : this.currentNomiId,
      target: isGroup ? this.data.groups.find(g => g.id === this.currentGroupId) : this.data.nomis.find(n => n.id === this.currentNomiId)
    };
  }
  _getVisibleViewportBox() {
    const vv = window.visualViewport;
    return vv ? {
      left: vv.offsetLeft || 0,
      top: vv.offsetTop || 0,
      width: vv.width || window.innerWidth,
      height: vv.height || window.innerHeight
    } : {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
  _getEventClientPoint(e) {
    const t = e?.touches?.[0] || e?.changedTouches?.[0];
    return {
      x: "number" == typeof e?.clientX ? e.clientX : t ? t.clientX : 0,
      y: "number" == typeof e?.clientY ? e.clientY : t ? t.clientY : 0
    };
  }
  _positionContextMenuAtEvent(menu, e) {
    const vv = window.visualViewport, {x: clientX, y: clientY} = this._getEventClientPoint(e), baseX = clientX + (vv?.offsetLeft || 0), baseY = clientY + (vv?.offsetTop || 0), prev = {
      visibility: menu.style.visibility,
      animation: menu.style.animation,
      transform: menu.style.transform,
      left: menu.style.left,
      top: menu.style.top
    };
    menu.style.visibility = "hidden", menu.style.left = "0px", menu.style.top = "0px", 
    menu.style.animation = "none", menu.style.transform = "none";
    const box = this._getVisibleViewportBox();
    menu.style.maxWidth = `calc(${box.width}px - 20px)`, menu.style.maxHeight = `calc(${box.height}px - 20px)`, 
    menu.style.overflow = "auto", menu.offsetWidth;
    const rect = menu.getBoundingClientRect();
    let left = baseX, top = baseY;
    const minLeft = box.left + 10, minTop = box.top + 10, maxLeft = box.left + box.width - 10 - rect.width, maxTop = box.top + box.height - 10 - rect.height;
    left > maxLeft && (left = maxLeft), top > maxTop && (top = maxTop), left < minLeft && (left = minLeft), 
    top < minTop && (top = minTop), menu.style.left = `${Math.round(left)}px`, menu.style.top = `${Math.round(top)}px`, 
    menu.offsetWidth, menu.style.visibility = prev.visibility || "", menu.style.animation = prev.animation || "", 
    menu.style.transform = prev.transform || "", requestAnimationFrame(() => {
      const box2 = this._getVisibleViewportBox(), r2 = menu.getBoundingClientRect();
      let l2 = parseFloat(menu.style.left) || 0, t2 = parseFloat(menu.style.top) || 0;
      const minL = box2.left + 10, minT = box2.top + 10, maxL = box2.left + box2.width - 10 - r2.width, maxT = box2.top + box2.height - 10 - r2.height;
      l2 > maxL && (l2 = maxL), t2 > maxT && (t2 = maxT), l2 < minL && (l2 = minL), t2 < minT && (t2 = minT), 
      menu.style.left = `${Math.round(l2)}px`, menu.style.top = `${Math.round(t2)}px`;
    });
  }
  showContextMenu(e, id, type) {
    e.preventDefault(), e.stopPropagation(), this.contextMenuTarget = id, this.contextMenuType = type;
    const menu = document.getElementById("contextMenu"), targetObj = "nomi" === type ? this.data.nomis.find(n => n.id === id) : this.data.groups.find(g => g.id === id), close = "app.hideContextMenu()";
    let html = `<div style="padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.85rem; color:var(--accent); font-weight:bold; opacity:0.8;">${targetObj?.name || ""}</div>`;
    html += `<div class="context-item" onclick="${close}; app.openRenamePopup()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Rename</div>`, 
    html += `<div class="context-item" onclick="${close}; app.triggerContextUpload()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Change Photo</div>`, 
    html += `<div class="context-item" onclick="${close}; app.copyProfilePicture()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy PFP</div>`, 
    "nomi" === type && (html += `<div class="context-item" onclick="${close}; app.duplicateNomi(${id})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>Duplicate</div>`), 
    html += `<div class="context-item danger" onclick="${close}; app.deleteFromContext()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete</div>`, 
    menu.innerHTML = html, menu.classList.add("active"), this.toggleMobileBackdrop(!0, 99998), 
    this._positionContextMenuAtEvent(menu, e);
  }
  showGalleryContextMenu(e, id) {
    e.preventDefault(), e.stopPropagation(), this.contextMenuTarget = id, this.contextMenuType = "gallery";
    const imgObj = ("block" === document.getElementById("viewGroup").style.display ? this.data.groups.find(g => g.id === this.currentGroupId) : this.data.nomis.find(n => n.id === this.currentNomiId)).gallery.find(i => i.id === id);
    if (!imgObj) return;
    const menu = document.getElementById("contextMenu"), close = "app.hideContextMenu()";
    let html = '<div style="padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.85rem; color:var(--accent); font-weight:bold; opacity:0.8;">Image Options</div>';
    html += `<div class="context-item" onclick="${close}; app.selectGalleryImageOptions('${imgObj.img}', ${id})">\n            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>\n            Set as Avatar\n        </div>`, 
    html += `<div class="context-item" onclick="${close}; app.openPromptPopup(${id})">\n            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path stroke-linecap="round" stroke-linejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>\n            Edit Prompt\n        </div>`, 
    html += `<div class="context-item" onclick="${close}; app.copyGalleryImage()">\n            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>\n            Copy Image\n        </div>`, 
    
html += `<div class="context-item" onclick="${close}; app.sendGalleryImageToChatGPT()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13"></path>
              <path stroke-linecap="round" stroke-linejoin="round" d="M22 2l-7 20-4-9-9-4 20-7z"></path>
            </svg>
            Send to ChatGPT
        </div>`, 
html += '<div style="border-top:1px solid var(--border); margin:5px 0;"></div>';
    const saveIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
    html += `<div class="context-item" onclick="${close}; app.downloadGalleryImage('webp')">${saveIcon} Save as WebP <span style="opacity:0.5; font-size:0.7em; margin-left:auto;">(Small)</span></div>`, 
    html += `<div class="context-item" onclick="${close}; app.downloadGalleryImage('png')">${saveIcon} Save as PNG <span style="opacity:0.5; font-size:0.7em; margin-left:auto;">(HQ)</span></div>`, 
    html += `<div class="context-item" onclick="${close}; app.downloadGalleryImage('jpg')">${saveIcon} Save as JPG <span style="opacity:0.5; font-size:0.7em; margin-left:auto;">(Compat)</span></div>`, 
    html += '<div style="border-top:1px solid var(--border); margin:5px 0;"></div>', 
    html += `<div class="context-item danger" onclick="${close}; app.deleteGalleryItem(${id})">\n            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path stroke-linecap="round" stroke-linejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>\n            Delete\n        </div>`, 
    menu.innerHTML = html, menu.classList.add("active"), this.toggleMobileBackdrop(!0, 99998), 
    this._positionContextMenuAtEvent(menu, e);
  }
  async copyGalleryImage() {
    const imgObj = ("block" === document.getElementById("viewGroup").style.display ? this.data.groups.find(g => g.id === this.currentGroupId) : this.data.nomis.find(n => n.id === this.currentNomiId)).gallery.find(i => i.id === this.contextMenuTarget);
    if (imgObj) try {
      if (this.showToast("Copying..."), !navigator.clipboard || !window.ClipboardItem) return void this.showToast("Clipboard not supported — use Save as PNG");
      const img = new Image;
      img.src = imgObj.img, img.decode ? await img.decode() : await new Promise((res, rej) => {
        img.onload = res, img.onerror = rej;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth, canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!pngBlob) throw new Error("PNG conversion failed");
      await navigator.clipboard.write([ new ClipboardItem({
        "image/png": pngBlob
      }) ]), this.showToast("Copied to Clipboard!");
    } catch (err) {
      console.error(err), this.showToast("Copy failed — try Save as PNG");
    }
  }

  async sendGalleryImageToChatGPT() {
  const imgObj = ("block" === document.getElementById("viewGroup").style.display
    ? this.data.groups.find(g => g.id === this.currentGroupId)
    : this.data.nomis.find(n => n.id === this.currentNomiId)
  ).gallery.find(i => i.id === this.contextMenuTarget);
  if (!imgObj) return;

  const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

  // 1) Copy as PNG (same conversion approach as Copy Image).
  let copied = false;
  try {
    this.showToast("Copying...");
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error("Clipboard not supported");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgObj.img;

    if (img.decode) {
      await img.decode();
    } else {
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) throw new Error("PNG conversion failed");

    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
    copied = true;
    this.showToast("Copied! Opening ChatGPT…");
  } catch (err) {
    console.error(err);
    this.showToast("Copy failed — opening ChatGPT anyway");
  }

  // 2) Open ChatGPT in the browser (note: may be blocked by popup blockers if the browser decides the click context was lost).
  const w = window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
  if (!w) {
    // Popup blocked: give the user a clear next step.
    this.showToast("Popup blocked — allow popups, then tap again");
  }
}

  downloadGalleryImage(format = "webp") {
    const target = "block" === document.getElementById("viewGroup").style.display ? this.data.groups.find(g => g.id === this.currentGroupId) : this.data.nomis.find(n => n.id === this.currentNomiId), imgObj = target.gallery.find(i => i.id === this.contextMenuTarget);
    if (!imgObj) return;
    const mime = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp"
    }[format], img = new Image;
    img.src = imgObj.img, img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth, canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      "jpg" === format && (ctx.fillStyle = "#FFFFFF", ctx.fillRect(0, 0, canvas.width, canvas.height)), 
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL(mime, .9), a = document.createElement("a");
      a.href = dataUrl;
      const dateStr = (new Date).toISOString().slice(0, 10);
      a.download = `${target.name.replace(/\s+/g, "_")}_${dateStr}_${imgObj.id}.${format}`, 
      document.body.appendChild(a), a.click(), document.body.removeChild(a);
    };
  }
  hideContextMenu() {
    document.getElementById("contextMenu").classList.remove("active"), this.toggleMobileBackdrop(!1);
  }
  toggleMobileBackdrop(active, zIndex = 90) {
    const bd = document.getElementById("mobileBackdrop");
    active ? (bd.style.zIndex = zIndex, bd.classList.add("active")) : bd.classList.remove("active");
  }
  closeAllMenus() {
    document.querySelectorAll(".grid-menu.active").forEach(el => el.classList.remove("active")), 
    this.hideContextMenu(), this.toggleMobileBackdrop(!1);
  }
  async copyProfilePicture() {
    this.hideContextMenu();
    const id = this.contextMenuTarget, target = "nomi" === this.contextMenuType ? this.data.nomis.find(n => n.id === id) : this.data.groups.find(g => g.id === id);
    if (!target || !target.photo) return this.showToast("No photo available");
    try {
      this.showToast("Copying...");
      const img = new Image;
      img.src = target.photo, await new Promise((resolve, reject) => {
        img.onload = resolve, img.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth, canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0), canvas.toBlob(async blob => {
        try {
          await navigator.clipboard.write([ new ClipboardItem({
            "image/png": blob
          }) ]), this.showToast("Profile Picture Copied!");
        } catch (err) {
          this.showToast("Clipboard Write Failed (HTTPS required)");
        }
      }, "image/png");
    } catch (err) {
      this.showToast("Failed to process image");
    }
  }
  triggerContextUpload() {
    cropper.setContextId(this.contextMenuTarget), document.getElementById("contextUpload").click();
  }
  openRenamePopup() {
    const id = this.contextMenuTarget, target = "nomi" === this.contextMenuType ? this.data.nomis.find(n => n.id === id) : this.data.groups.find(g => g.id === id);
    document.getElementById("globalRenameInput").value = target.name, document.getElementById("globalInputPopup").classList.add("active"), 
    setTimeout(() => document.getElementById("globalRenameInput").focus(), 50);
  }
  confirmRename() {
    const val = document.getElementById("globalRenameInput").value;
    if (!val.trim()) return;
    const id = this.contextMenuTarget;
    ("nomi" === this.contextMenuType ? this.data.nomis.find(n => n.id === id) : this.data.groups.find(g => g.id === id)).name = val, 
    this.saveToDB(), this.renderGallery(), document.getElementById("globalInputPopup").classList.remove("active"), 
    this.showToast("Renamed!");
  }
  duplicateNomi(id) {
    if (!confirm("Duplicate this Nomi?")) return;
    const original = this.data.nomis.find(n => n.id === id);
    if (!original) return;
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = Date.now(), clone.name = clone.name + " (Copy)", clone.uuid = null, clone.gallery && clone.gallery.forEach(img => img.id = Date.now() + Math.random()), 
    this.data.nomis.push(clone), this.saveToDB(), this.renderGallery(), this.showToast("Nomi Duplicated!");
  }
  deleteFromContext() {
    const id = this.contextMenuTarget;
    "nomi" === this.contextMenuType ? confirm("Delete this Nomi permanently?") && (this.data.nomis = this.data.nomis.filter(n => n.id !== id), 
    this.saveToDB(), this.renderGallery(), this.showToast("Deleted")) : confirm("Delete this Group?") && (this.data.groups = this.data.groups.filter(g => g.id !== id), 
    this.saveToDB(), this.renderGallery(), this.showToast("Deleted"));
  }
  setDashboardView(mode, render = !0) {
    if (this.isDashboardReordering) return void this.showToast("Exit arrange mode to switch layouts");
    this.dashboardView = mode, localStorage.setItem("nomi_dashboard_view", mode);
    const btnGrid = document.getElementById("btnViewGrid"), btnList = document.getElementById("btnViewList");
    btnGrid && btnList && ("grid" === mode ? (btnGrid.classList.add("active"), btnList.classList.remove("active")) : (btnList.classList.add("active"), 
    btnGrid.classList.remove("active"))), render && this.renderGallery();
  }
  updateDashboardArrangeButtons() {
    const btn = document.getElementById("btnDashboardArrange"), rst = document.getElementById("btnDashboardReset");
    btn && btn.classList.toggle("active", !!this.isDashboardReordering), rst && (rst.style.display = this.isDashboardReordering ? "flex" : "none");
    const ng = document.getElementById("nomiGallery"), gg = document.getElementById("groupGallery");
    ng && ng.classList.toggle("dash-reorder", !!this.isDashboardReordering), gg && gg.classList.toggle("dash-reorder", !!this.isDashboardReordering);
  }
  onDashboardCardClick(type, id) {
    this.isDashboardReordering || ("group" === type ? this.editGroup(id) : this.editNomi(id));
  }
  toggleDashboardReorder() {
    const term = (document.getElementById("searchInput")?.value || "").trim();
    this.isDashboardReordering || !term ? (this.isDashboardReordering = !this.isDashboardReordering, 
    this.isDashboardReordering ? this.showToast("Arrange mode: drag cards to reorder") : (this.saveDashboardOrderFromDOM(), 
    this.saveToDB(!0), this.showToast("Order saved")), this.refreshDashboardDraggables(), 
    this.updateDashboardArrangeButtons()) : this.showToast("Clear search to reorder");
  }
  resetDashboardOrder() {
    confirm("Reset dashboard order back to default sorting?") && (this.data.settings.dashboardOrder || (this.data.settings.dashboardOrder = {
      nomis: [],
      groups: []
    }), this.data.settings.dashboardOrder.nomis = [], this.data.settings.dashboardOrder.groups = [], 
    this.saveToDB(!0), this.renderGallery(!1), this.showToast("Order reset"));
  }
  saveDashboardOrderFromDOM() {
    this.data.settings.dashboardOrder || (this.data.settings.dashboardOrder = {
      nomis: [],
      groups: []
    });
    const ng = document.getElementById("nomiGallery"), gg = document.getElementById("groupGallery"), getOrderFromContainer = container => {
      if (!container) return [];
      if (container.classList.contains("list-mode")) {
        const col0 = container.querySelector('.list-col[data-col="0"]'), col1 = container.querySelector('.list-col[data-col="1"]'), isMobileList = !(!window.matchMedia || !window.matchMedia("(max-width: 768px)").matches);
        if (!col0) return [];
        if (isMobileList || !col1) return [ ...col0.querySelectorAll(".nomi-card") ].map(el => Number(el.dataset.id)).filter(Boolean);
        const items0 = [ ...col0.querySelectorAll(".nomi-card") ], items1 = [ ...col1.querySelectorAll(".nomi-card") ], interleaved = [], maxLen = Math.max(items0.length, items1.length);
        for (let i = 0; i < maxLen; i++) items0[i] && interleaved.push(Number(items0[i].dataset.id)), 
        items1[i] && interleaved.push(Number(items1[i].dataset.id));
        return interleaved.filter(Boolean);
      }
      return [ ...container.querySelectorAll(".nomi-card") ].map(el => Number(el.dataset.id)).filter(Boolean);
    };
    ng && (this.data.settings.dashboardOrder.nomis = getOrderFromContainer(ng)), gg && (this.data.settings.dashboardOrder.groups = getOrderFromContainer(gg));
  }
  setupDashboardDnD() {
    if (this._dashDndSetup) return;
    this._dashDndSetup = !0;
    const ng = document.getElementById("nomiGallery"), gg = document.getElementById("groupGallery"), bindContainer = container => {
      if (!container) return;
      let _rafPending = !1, _lastX = 0, _lastY = 0, _lastTarget = null, _lastRefEl = null, _lastListKey = null, _lockedCol = null, _listOrderIds = null, _listDraggingId = null, _lastInsertIdx = null;
      container.addEventListener("dragover", e => {
        if (!this.isDashboardReordering) return;
        e.preventDefault();
        const dragging = document.querySelector(".nomi-card.dragging");
        if (!dragging) return;
        const t = dragging.dataset.type;
        "nomiGallery" === container.id && "nomi" !== t || "groupGallery" === container.id && "group" !== t || (_lastX = e.clientX, 
        _lastY = e.clientY, _lastTarget = e.target, _rafPending || (_rafPending = !0, requestAnimationFrame(() => {
          _rafPending = !1;
          if (container.classList.contains("list-mode")) {
            if (!(!window.matchMedia || !window.matchMedia("(max-width: 768px)").matches)) {
              const targetCol = container.querySelector('.list-col[data-col="0"]') || container, colItems = [ ...targetCol.querySelectorAll(".nomi-card:not(.dragging)") ];
              let refEl = null;
              for (const item of colItems) {
                const rect = item.getBoundingClientRect(), midY = rect.top + rect.height / 2;
                if (_lastY < midY) {
                  refEl = item;
                  break;
                }
              }
              if (refEl === _lastRefEl && dragging.parentElement === targetCol) return;
              return _lastRefEl = refEl, void (null == refEl ? targetCol.appendChild(dragging) : targetCol.insertBefore(dragging, refEl));
            }
            const col0 = container.querySelector('.list-col[data-col="0"]'), col1 = container.querySelector('.list-col[data-col="1"]');
            if (!col0 || !col1) return;
            const draggingId = dragging?.dataset?.id;
            if (!draggingId) return;
            const ensureColumnOrder = (col, desiredEls) => {
              for (let i = 0; i < desiredEls.length; i++) {
                const el = desiredEls[i];
                if (!el) continue;
                const cur = col.children[i];
                cur !== el && col.insertBefore(el, cur || null);
              }
              for (;col.children.length > desiredEls.length; ) col.removeChild(col.lastChild);
            };
            _listOrderIds && _listDraggingId === draggingId || (_listDraggingId = draggingId, 
            _listOrderIds = (() => {
              const kids0 = [ ...col0.querySelectorAll(".nomi-card") ], kids1 = [ ...col1.querySelectorAll(".nomi-card") ], ids = [], maxLen = Math.max(kids0.length, kids1.length);
              for (let i = 0; i < maxLen; i++) kids0[i]?.dataset?.id && ids.push(String(kids0[i].dataset.id)), 
              kids1[i]?.dataset?.id && ids.push(String(kids1[i].dataset.id));
              return ids;
            })(), _lastInsertIdx = null, _lastListKey = null, _lockedCol = null);
            const hoveredColEl = _lastTarget?.closest?.(".list-col[data-col]");
            let desiredCol = hoveredColEl?.dataset?.col;
            if ("0" !== desiredCol && "1" !== desiredCol) {
              const rect = container.getBoundingClientRect(), midX = rect.left + rect.width / 2;
              desiredCol = _lastX < midX ? "0" : "1";
            }
            if (null == _lockedCol) _lockedCol = desiredCol; else if (desiredCol !== _lockedCol) if (hoveredColEl) _lockedCol = desiredCol; else {
              const rect = container.getBoundingClientRect(), midX = rect.left + rect.width / 2, dead = Math.max(18, .06 * rect.width);
              ("0" === _lockedCol && _lastX > midX + dead || "1" === _lockedCol && _lastX < midX - dead) && (_lockedCol = desiredCol);
            }
            const colItems = [ ...("1" === _lockedCol ? col1 : col0).querySelectorAll(".nomi-card") ].filter(el => el !== dragging);
            let refEl = null;
            for (const item of colItems) {
              const r = item.getBoundingClientRect(), midY = r.top + r.height / 2;
              if (_lastY < midY) {
                refEl = item;
                break;
              }
            }
            let insertIdx = 2 * (refEl ? colItems.indexOf(refEl) : colItems.length) + ("1" === _lockedCol ? 1 : 0);
            const nextOrder = _listOrderIds.slice(), curIdx = nextOrder.indexOf(String(draggingId));
            -1 !== curIdx && nextOrder.splice(curIdx, 1), insertIdx = Math.max(0, Math.min(insertIdx, nextOrder.length)), 
            nextOrder.splice(insertIdx, 0, String(draggingId));
            const nextKey = nextOrder.join(",");
            if (nextKey === _lastListKey && insertIdx === _lastInsertIdx) return;
            _lastListKey = nextKey, _lastInsertIdx = insertIdx, _listOrderIds = nextOrder;
            const elById = {};
            container.querySelectorAll(".nomi-card").forEach(el => {
              const id = el?.dataset?.id;
              id && (elById[String(id)] = el);
            });
            const desired0 = [], desired1 = [];
            for (let i = 0; i < _listOrderIds.length; i++) {
              const el = elById[_listOrderIds[i]];
              el && (i % 2 == 0 ? desired0 : desired1).push(el);
            }
            ensureColumnOrder(col0, desired0), ensureColumnOrder(col1, desired1);
          } else {
            const refEl = this.getDashboardDragAfterElement(container, _lastX, _lastY);
            if (refEl === _lastRefEl) return;
            _lastRefEl = refEl, null == refEl ? container.appendChild(dragging) : container.insertBefore(dragging, refEl);
          }
        })));
      }), container.addEventListener("drop", e => {
        if (!this.isDashboardReordering) return;
        e.preventDefault();
        const dragging = document.querySelector(".nomi-card.dragging");
        if (dragging) {
          const t = dragging.dataset.type;
          if ("nomiGallery" === container.id && "nomi" !== t || "groupGallery" === container.id && "group" !== t) return;
        }
        container.classList.contains("list-mode") && this.rebalanceListColumns(container), 
        this.saveDashboardOrderFromDOM(), this.saveToDB(!0);
      });
    };
    bindContainer(ng), bindContainer(gg);
  }
  refreshDashboardDraggables() {
    const apply = container => {
      container && (container.classList.toggle("dash-reorder", !!this.isDashboardReordering), 
      container.querySelectorAll(".nomi-card").forEach(card => {
        card.draggable = !!this.isDashboardReordering, card.classList.toggle("dash-reorder", !!this.isDashboardReordering), 
        card.querySelectorAll("img").forEach(img => {
          img.draggable = !1, img.ondragstart = ev => {
            this.isDashboardReordering && ev.preventDefault();
          };
        });
        card.querySelectorAll("button, a, input, textarea, select, label").forEach(el => {
          el.style.pointerEvents = this.isDashboardReordering ? "none" : "";
        }), card.ondragstart = e => this.handleDashboardDragStart(e), card.ondragend = e => this.handleDashboardDragEnd(e);
      }));
    };
    apply(document.getElementById("nomiGallery")), apply(document.getElementById("groupGallery"));
  }
  handleDashboardDragStart(e) {
    if (this._dashLockedCol = null, !this.isDashboardReordering) return;
    const el = e.currentTarget;
    this._dashDragEl = el, this._dashDragType = el?.dataset?.type || null, e.dataTransfer && (e.dataTransfer.effectAllowed = "move", 
    e.dataTransfer.setData("text/plain", "reorder")), el.classList.add("dragging");
  }
  handleDashboardDragEnd(e) {
    this._dashLockedCol = null;
    const el = e.currentTarget;
    if (el && el.classList.remove("dragging"), this.isDashboardReordering) {
      const container = el?.closest(".gallery-grid");
      container && container.classList.contains("list-mode") && this.rebalanceListColumns(container), 
      this.saveDashboardOrderFromDOM(), this.saveToDB(!0);
    }
    this._dashDragEl = null, this._dashDragType = null;
  }
  rebalanceListColumns(container) {
    if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) return;
    const col0 = container.querySelector('.list-col[data-col="0"]'), col1 = container.querySelector('.list-col[data-col="1"]');
    if (!col0 || !col1) return;
    const items0 = [ ...col0.querySelectorAll(".nomi-card") ], items1 = [ ...col1.querySelectorAll(".nomi-card") ], allItems = [], maxLen = Math.max(items0.length, items1.length);
    for (let i = 0; i < maxLen; i++) items0[i] && allItems.push(items0[i]), items1[i] && allItems.push(items1[i]);
    col0.innerHTML = "", col1.innerHTML = "", allItems.forEach((item, index) => {
      (index % 2 == 0 ? col0 : col1).appendChild(item);
    });
  }
  getDashboardDragAfterElement(container, x, y) {
    const items = [ ...container.querySelectorAll(".nomi-card:not(.dragging)") ];
    if (!items.length) return null;
    if (container.classList.contains("list-mode")) {
      if (!(!window.matchMedia || !window.matchMedia("(max-width: 768px)").matches)) {
        const colItems = [ ...(container.querySelector('.list-col[data-col="0"]') || container).querySelectorAll(".nomi-card:not(.dragging)") ];
        if (!colItems.length) return null;
        for (const item of colItems) {
          const rect = item.getBoundingClientRect(), midY = rect.top + rect.height / 2;
          if (y < midY) return item;
        }
        return null;
      }
      const cols = [ ...container.querySelectorAll(".list-col") ];
      let targetCol = null;
      for (const col of cols) {
        const rect = col.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right) {
          targetCol = col;
          break;
        }
      }
      if (!targetCol) return null;
      const colItems = [ ...targetCol.querySelectorAll(".nomi-card:not(.dragging)") ];
      if (!colItems.length) return null;
      for (const item of colItems) {
        const rect = item.getBoundingClientRect(), midY = rect.top + rect.height / 2;
        if (y < midY) return item;
      }
      return null;
    }
    const cRect = container.getBoundingClientRect();
    let hover = document.elementFromPoint(x, y);
    hover = hover?.closest?.(".nomi-card"), !hover || container.contains(hover) && !hover.classList.contains("dragging") || (hover = null);
    const rects = items.map(el => ({
      el: el,
      r: el.getBoundingClientRect()
    })).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left), last = rects[rects.length - 1].r, pastLastRow = y > last.bottom - 16, pastLastCol = x > last.right - 16, belowGrid = y > cRect.bottom - 16;
    if (pastLastRow && pastLastCol || belowGrid) return null;
    const decideRefFromRect = (r, el) => {
      const midY = r.top + r.height / 2, midX = r.left + r.width / 2, yBand = .22 * r.height;
      return y < midY - yBand ? el : y > midY + yBand ? el.nextElementSibling : x < midX ? el : el.nextElementSibling;
    };
    if (hover) {
      return decideRefFromRect(hover.getBoundingClientRect(), hover);
    }
    let closest = null, best = 1 / 0;
    for (const {el: el, r: r} of rects) {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      d < best && (best = d, closest = {
        el: el,
        r: r
      });
    }
    return closest ? decideRefFromRect(closest.r, closest.el) : null;
  }
  toggleGallerySort() {
    this.gallerySort = "newest" === this.gallerySort ? "oldest" : "newest", this.showToast("Sorting: " + ("newest" === this.gallerySort ? "Newest First" : "Oldest First"));
    const searchInputId = "block" === document.getElementById("viewGroup").style.display ? "groupGallerySearch" : "nomiGallerySearch";
    this.filterGallery(document.getElementById(searchInputId).value);
  }
  toggleGridMenu(btn) {
    document.querySelectorAll(".grid-menu").forEach(el => {
      el !== btn.nextElementSibling && el.classList.remove("active");
    });
    const menu = btn.nextElementSibling;
    menu.classList.toggle("active"), this.toggleMobileBackdrop(menu.classList.contains("active"), 90);
    const val = [ "small", "medium", "large", "xlarge" ].indexOf(this.gallerySize), currentVal = -1 === val ? 1 : val, slider = menu.querySelector("input");
    if (slider && (slider.value = currentVal), this.updateGridIcons(menu, currentVal), 
    menu.classList.contains("active")) {
      const closeFn = e => {
        menu.contains(e.target) || e.target === btn || btn.contains(e.target) || (menu.classList.remove("active"), 
        this.toggleMobileBackdrop(!1), document.removeEventListener("click", closeFn));
      };
      setTimeout(() => document.addEventListener("click", closeFn), 0);
    }
  }
  setGallerySize(val) {
    this.gallerySize = [ "small", "medium", "large", "xlarge" ][val], localStorage.setItem("nomi_gallery_size", this.gallerySize);
    const sizeMap = {
      small: "100px",
      medium: "160px",
      large: "260px",
      xlarge: "360px"
    };
    [ "promptGalleryGrid", "groupPromptGalleryGrid" ].forEach(id => {
      const el = document.getElementById(id);
      el && el.style.setProperty("--grid-min", sizeMap[this.gallerySize]);
    }), document.querySelectorAll(".custom-slider").forEach(el => el.value = val), document.querySelectorAll(".grid-menu").forEach(menu => this.updateGridIcons(menu, val));
  }
  updateGridIcons(menu, val) {
    menu.querySelectorAll(".grid-slider-row svg").forEach((svg, i) => {
      i == val ? svg.classList.add("selected") : svg.classList.remove("selected");
    });
  }
  toggleShowPrompts() {
    this.galleryShowPrompts = !this.galleryShowPrompts;
    const searchInputId = "block" === document.getElementById("viewGroup").style.display ? "groupGallerySearch" : "nomiGallerySearch";
    this.filterGallery(document.getElementById(searchInputId).value);
  }
  handleGlobalPaste(e) {
    const isNomiGallery = "block" === document.getElementById("viewNomi").style.display && document.getElementById("tabGallery").classList.contains("active"), isGroupGallery = "block" === document.getElementById("viewGroup").style.display && document.getElementById("tabGroupGallery").classList.contains("active");
    if (isNomiGallery || isGroupGallery) {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      let found = !1;
      for (let i = 0; i < items.length; i++) if (-1 !== items[i].type.indexOf("image")) {
        const blob = items[i].getAsFile();
        this.addBlobToGallery(blob), found = !0;
      }
      found && (e.preventDefault(), this.showToast("Pasted from clipboard!"));
    }
  }
  async pasteGalleryImage() {
    try {
      const items = await navigator.clipboard.read();
      let found = !1;
      for (const item of items) {
        const type = item.types.find(t => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          this.addBlobToGallery(blob), found = !0;
        }
      }
      found ? this.showToast("Pasted from clipboard!") : this.showToast("No image found on clipboard");
    } catch (err) {
      console.error(err), alert("Clipboard access blocked. Please use Ctrl+V (Cmd+V) to paste directly.");
    }
  }
  async pasteText(id) {
    try {
      const text = await navigator.clipboard.readText(), el = document.getElementById(id);
      if (el) {
        if ("number" == typeof el.selectionStart && "number" == typeof el.selectionEnd) {
          const start = el.selectionStart, end = el.selectionEnd, val = el.value;
          el.value = val.substring(0, start) + text + val.substring(end), el.selectionStart = el.selectionEnd = start + text.length;
        } else el.value += text;
        el.dispatchEvent(new Event("input", {
          bubbles: !0
        })), this.showToast("Pasted!");
      }
    } catch (err) {
      console.error(err), alert("Clipboard permission denied. Please paste manually.");
    }
  }
  addBlobToGallery(blob) {
    this.processImage(blob, 1024, b64 => {
      const {target: target, type: type} = this.getCurrentContext();
      target.gallery || (target.gallery = []), target.gallery.push({
        id: Date.now() + Math.random(),
        img: b64,
        prompt: ""
      }), this.saveToDB().then(() => this.renderPromptGallery());
    });
  }
  migrateData() {
    this.data.nomis.forEach(n => {
      void 0 === n.isFavorite && (n.isFavorite = !1), n.custom_sections || (n.custom_sections = []), 
      n.sectionOrder || (n.sectionOrder = DEFAULT_SECTIONS.map(s => s.id), n.custom_sections.forEach(cs => n.sectionOrder.push(cs.id))), 
      n.banner || (n.banner = null);
    }), this.data.groups.forEach(g => {
      !g.sectionOrder && g.custom_sections && (g.sectionOrder = [ "backstory" ], g.custom_sections.forEach(cs => g.sectionOrder.push(cs.id))), 
      g.banner || (g.banner = null), g.gallery || (g.gallery = []), g.members && g.members.length > 0 && "object" != typeof g.members[0] && (g.members = g.members.map(id => ({
        id: id,
        role: ""
      })));
    });
  }
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = e => {
        const db = e.target.result;
        db.objectStoreNames.contains("data") || db.createObjectStore("data", {
          keyPath: "id"
        });
      }, request.onsuccess = e => {
        this.db = e.target.result, resolve();
      }, request.onerror = e => reject(e);
    });
  }
  saveToDB(skipAutoUpload = !1) {
    return new Promise((resolve, reject) => {
      const t = this.db.transaction([ "data" ], "readwrite");
      t.objectStore("data").put({
        id: "root",
        nomis: this.data.nomis,
        groups: this.data.groups,
        settings: this.data.settings
      }), t.oncomplete = () => {
        this.data.settings.autoUpload && !skipAutoUpload && this.triggerAutoUpload(), resolve();
      }, t.onerror = reject;
    });
  }
  loadData() {
    return new Promise((resolve, reject) => {
      this.db.transaction([ "data" ], "readonly").objectStore("data").get("root").onsuccess = e => {
        e.target.result && (this.data = e.target.result), this.data.nomis || (this.data.nomis = []), 
        this.data.groups || (this.data.groups = []), this.data.settings || (this.data.settings = {}), 
        this.data.settings.theme || (this.data.settings.theme = "midnight"), this.data.settings.syncCache || (this.data.settings.syncCache = {}), 
        this.data.settings.dashboardOrder || (this.data.settings.dashboardOrder = {
          nomis: [],
          groups: []
        }), Array.isArray(this.data.settings.dashboardOrder.nomis) || (this.data.settings.dashboardOrder.nomis = []), 
        Array.isArray(this.data.settings.dashboardOrder.groups) || (this.data.settings.dashboardOrder.groups = []), 
        resolve();
      };
    });
  }
  setupSyncMenu() {
    this._syncMenuSetup || (this._syncMenuSetup = !0, document.addEventListener("click", e => {
      const fab = document.getElementById("fabGroup");
      fab && fab.classList.contains("sync-open") && (fab.contains(e.target) || this.closeSyncMenu());
    }), document.addEventListener("keydown", e => {
      "Escape" === e.key && this.closeSyncMenu();
    }));
  }
  toggleSyncMenu(ev) {
    this.setupSyncMenu();
    try {
      ev?.stopPropagation?.();
    } catch {}
    const fab = document.getElementById("fabGroup"), btn = document.getElementById("syncBtn"), menu = document.getElementById("syncMenu"), icon = document.getElementById("syncIcon");
    if (!fab || !btn) return;
    if (icon && icon.classList.contains("spin")) return;
    const isOpen = fab.classList.toggle("sync-open");
    btn.setAttribute("aria-expanded", isOpen ? "true" : "false"), menu && menu.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }
  closeSyncMenu() {
    const fab = document.getElementById("fabGroup"), btn = document.getElementById("syncBtn"), menu = document.getElementById("syncMenu");
    fab && fab.classList.remove("sync-open"), btn && btn.setAttribute("aria-expanded", "false"), 
    menu && menu.setAttribute("aria-hidden", "true");
  }
  startCloudDownload() {
    return this.closeSyncMenu(), this.cloudDownload(!1);
  }
  startCloudUpload() {
    return this.closeSyncMenu(), this.cloudUpload(!1);
  }
  toggleCloudSync(checked) {
    this.data.settings.autoUpload = checked, this.data.settings.autoDownload = checked, 
    this.saveToDB();
  }
  triggerAutoUpload() {
    console.log("triggerAutoUpload: Called"), this.data?.settings?.autoUpload ? (this.uploadTimer && clearTimeout(this.uploadTimer), 
    this.uploadTimer = setTimeout(() => {
      console.log("triggerAutoUpload: Debounced call to cloudUpload(true)"), this.cloudUpload(!0);
    }, 1500)) : console.log("triggerAutoUpload: autoUpload disabled; skipping.");
  }
  toggleSettings() {
    const m = document.getElementById("settingsModal");
    m.classList.toggle("active"), m.classList.contains("active") && (document.getElementById("themeSelect").value = this.data.settings.theme || "midnight", 
    document.getElementById("startUpSelect").value = this.data.settings.startView || "home", 
    document.getElementById("apiKeyInput").value = this.data.settings.apiKey || "", 
    document.getElementById("ghTokenInput").value = localStorage.getItem("nomi_gh_token") || "", 
    document.getElementById("gistIdInput").value = localStorage.getItem("nomi_gist_id") || "", 
    [ "apiKeyInput", "ghTokenInput", "gistIdInput" ].forEach(id => {
      document.getElementById(id).readOnly = !0;
      const btn = document.getElementById(id).nextElementSibling;
      btn && (btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>'), 
      btn && btn.classList.remove("active");
    }), document.getElementById("cloudSyncCheck").checked = this.data.settings.autoUpload || !1, 
    this.renderStorageDashboard());
  }
  async renderStorageDashboard() {
    const getSize = obj => new Blob([ JSON.stringify(obj) ]).size;
    let nomiTotal = 0, groupTotal = 0, totalImgCount = 0, allItems = [];
    this.data.nomis.forEach(n => {
      const size = getSize(n);
      nomiTotal += size;
      const imgCount = (n.gallery ? n.gallery.length : 0) + (n.photo ? 1 : 0);
      totalImgCount += imgCount, allItems.push({
        name: n.name,
        size: size,
        type: "nomi"
      });
    }), this.data.groups.forEach(g => {
      const size = getSize(g);
      groupTotal += size;
      const imgCount = (g.gallery ? g.gallery.length : 0) + (g.photo ? 1 : 0);
      totalImgCount += imgCount, allItems.push({
        name: g.name,
        size: size,
        type: "group"
      });
    });
    const totalUsed = nomiTotal + groupTotal, pNomis = totalUsed > 0 ? nomiTotal / totalUsed * 100 : 0, pGroups = totalUsed > 0 ? groupTotal / totalUsed * 100 : 0;
    document.getElementById("barNomis").style.width = pNomis + "%", document.getElementById("barGroups").style.width = pGroups + "%", 
    document.getElementById("statTotalImages").innerText = totalImgCount, document.getElementById("statTotalNomis").innerText = this.data.nomis.length;
    const mbUsed = (totalUsed / 1024 / 1024).toFixed(2), elUsed = document.getElementById("statStorageUsed");
    elUsed && (elUsed.innerText = `${mbUsed} MB`), allItems.sort((a, b) => b.size - a.size);
    const top3 = allItems.slice(0, 3), listEl = document.getElementById("storageTopList");
    listEl.innerHTML = "", 0 === top3.length ? listEl.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-muted); font-size:0.8rem;">No Data</div>' : top3.forEach(item => {
      const mb = (item.size / 1024 / 1024).toFixed(2), dotClass = "nomi" === item.type ? "nomi" : "group";
      listEl.innerHTML += `\n                    <div class="storage-list-item">\n                        <div class="list-name"><div class="legend-dot ${dotClass}"></div>${item.name}</div>\n                        <div class="list-size">${mb} MB</div>\n                    </div>`;
    });
  }
  toggleEdit(inputId, btn, type) {
    const input = document.getElementById(inputId);
    if (input.readOnly) input.readOnly = !1, input.focus(), btn.classList.add("active"), 
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'; else {
      input.readOnly = !0, btn.classList.remove("active"), btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
      const val = input.value;
      "apiKey" === type ? this.saveSetting("apiKey", val) : "ghToken" === type ? localStorage.setItem("nomi_gh_token", val) : "gistId" === type && localStorage.setItem("nomi_gist_id", val), 
      this.showToast("Saved!");
    }
  }
  setTheme(name) {
    this.data.settings.theme = name, localStorage.setItem("nomi_theme", name), this.applyTheme(name), 
    this.saveToDB(!0);
  }
  applyTheme(name) {
    if (window.Theme && "function" == typeof window.Theme.applyThemeVars) window.Theme.applyThemeVars(name); else {
      console.warn("Theme.js missing. Applying fallback styles.");
      const root = document.documentElement;
      root.style.setProperty("--bg-body", "#0f1115"), root.style.setProperty("--bg-card", "#181b21"), 
      root.style.setProperty("--text-main", "#e4e4e7"), root.style.setProperty("--accent", "#c084fc");
    }
    const gallery = document.getElementById("nomiGallery");
    gallery && "" !== gallery.innerHTML && this.renderGallery();
  }
  saveSetting(k, v) {
    this.data.settings[k] = v;
    const isLocal = "theme" === k || "startView" === k || "apiKey" === k;
    this.saveToDB(isLocal);
  }
  saveState(viewType, id = null) {
    this.data.settings.lastState = {
      view: viewType,
      id: id
    }, this.saveToDB(!0);
  }
  flashSyncSuccess() {
    const pill = document.getElementById("syncBtn");
    pill.classList.add("success"), setTimeout(() => {
      pill.classList.remove("success");
    }, 1500);
  }
  async uploadFileBatch(filesObj, token, gistId) {
    return fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: filesObj
      })
    });
  }
  simpleHash(str) {
    let hash = 0;
    if (0 === str.length) return hash;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i), hash &= hash;
    }
    return hash;
  }
  async cloudUpload(silent = !1) {
    console.log("cloudUpload: Called with silent =", silent);
    const token = localStorage.getItem("nomi_gh_token"), gistId = localStorage.getItem("nomi_gist_id");
    if (console.log("cloudUpload: token exists?", !!token, "gistId exists?", !!gistId), 
    !token || !gistId) return console.warn("cloudUpload: Missing credentials, returning"), 
    void (silent || alert("Please enter both a GitHub Token and Gist ID."));
    if (!silent && !confirm("Overwrite Cloud Save with current data?")) return;
    const pill = document.getElementById("syncBtn"), icon = document.getElementById("syncIcon"), text = document.getElementById("syncText");
    silent ? (pill.classList.add("expanded"), icon.classList.add("spin"), text.innerText = "Checking...") : this.showToast("Analyzing changes...", "info", 0);
    try {
      const currentGistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "GET",
        headers: {
          Authorization: `token ${token}`
        }
      });
      if (!currentGistRes.ok) throw new Error("Could not access Gist.");
      const currentFiles = (await currentGistRes.json()).files || {};
      let syncCache = this.data.settings.syncCache || {}, filesToUpload = {}, uploadCount = 0;
      const localNomiIds = new Set(this.data.nomis.map(n => `n_${n.id}.json`)), localGroupIds = new Set(this.data.groups.map(g => `g_${g.id}.json`));
      Object.keys(currentFiles).forEach(filename => {
        "nomi-data.json" === filename && (filesToUpload[filename] = null, uploadCount++), 
        filename.startsWith("n_") && filename.endsWith(".json") && (localNomiIds.has(filename) || (filesToUpload[filename] = null, 
        delete syncCache[filename], uploadCount++)), filename.startsWith("g_") && filename.endsWith(".json") && (localGroupIds.has(filename) || (filesToUpload[filename] = null, 
        delete syncCache[filename], uploadCount++));
      });
      const checkAndQueue = (filename, dataObj) => {
        const content = JSON.stringify(dataObj), hash = this.simpleHash(content);
        return (syncCache[filename] !== hash || !currentFiles[filename]) && (filesToUpload[filename] = {
          content: content
        }, syncCache[filename] = hash, uploadCount++, !0);
      };
      for (const n of this.data.nomis) checkAndQueue(`n_${n.id}.json`, n);
      for (const g of this.data.groups) checkAndQueue(`g_${g.id}.json`, g);
      const metaSettings = {
        ...this.data.settings
      };
      delete metaSettings.theme, delete metaSettings.startView, delete metaSettings.syncCache, 
      checkAndQueue("settings.json", metaSettings), checkAndQueue("index.json", {
        nomis: this.data.nomis.map(n => ({
          id: n.id,
          name: n.name
        })),
        groups: this.data.groups.map(g => ({
          id: g.id,
          name: g.name
        }))
      });
      let chatRooms = [], chatMsgs = {};
      if (console.log("cloudUpload: Loading chat data..."), console.log("cloudUpload: window.chatManager exists?", !!window.chatManager), 
      window.chatManager && "function" == typeof chatManager.whenReady) try {
        await chatManager.whenReady(), "function" == typeof chatManager._flushKVWrites && await chatManager._flushKVWrites(), 
        chatRooms = Array.isArray(chatManager.rooms) ? chatManager.rooms : [], chatMsgs = chatManager.messages && "object" == typeof chatManager.messages ? chatManager.messages : {}, 
        console.log("cloudUpload: Loaded from chatManager - rooms:", chatRooms.length, "message keys:", Object.keys(chatMsgs).length);
      } catch (e) {
        console.warn("cloudUpload: chatManager not ready, falling back to localStorage.", e);
      }
      if (!chatRooms.length && localStorage.getItem("nomi_chat_rooms")) try {
        chatRooms = JSON.parse(localStorage.getItem("nomi_chat_rooms") || "[]"), console.log("cloudUpload: Loaded rooms from localStorage:", chatRooms.length);
      } catch (e) {
        console.warn("cloudUpload: Failed to parse rooms from localStorage", e), chatRooms = [];
      }
      if (0 === Object.keys(chatMsgs).length && localStorage.getItem("nomi_chat_messages")) try {
        chatMsgs = JSON.parse(localStorage.getItem("nomi_chat_messages") || "{}"), console.log("cloudUpload: Loaded messages from localStorage:", Object.keys(chatMsgs).length);
      } catch (e) {
        console.warn("cloudUpload: Failed to parse messages from localStorage", e), chatMsgs = {};
      }
      console.log("cloudUpload: Final chat data - rooms:", chatRooms.length, "message keys:", Object.keys(chatMsgs).length);
      const normalizedMsgs = {};
      for (const [k, v] of Object.entries(chatMsgs || {})) if ("string" == typeof k && k.startsWith("room_")) {
        const r = chatRooms.find(rr => rr.id === k);
        normalizedMsgs[r && r.cloudId ? r.cloudId : k] = v;
      } else normalizedMsgs[k] = v;
      console.log("cloudUpload: Normalized messages - keys:", Object.keys(normalizedMsgs).length), 
      console.log("cloudUpload: About to checkAndQueue chat files...");
      const roomsQueued = checkAndQueue("chat_rooms.json", chatRooms), msgsQueued = checkAndQueue("chat_messages.json", normalizedMsgs);
      if (console.log("cloudUpload: chat_rooms.json queued?", roomsQueued), console.log("cloudUpload: chat_messages.json queued?", msgsQueued), 
      console.log("cloudUpload: Upload count:", uploadCount, "Files to upload:", Object.keys(filesToUpload)), 
      0 === uploadCount) return console.log("cloudUpload: No changes detected, skipping upload"), 
      silent ? (text.innerText = "Up to Date", setTimeout(() => {
        pill.classList.remove("expanded"), icon.classList.remove("spin");
      }, 2e3)) : this.showToast("Already up to date!"), this.data.settings.syncCache = syncCache, 
      void this.saveToDB(!0);
      silent ? text.innerText = `Syncing ${uploadCount} files...` : this.showToast(`Uploading ${uploadCount} changes...`, "info", 0), 
      await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: filesToUpload
        })
      }), this.data.settings.syncCache = syncCache, await this.saveToDB(!0), silent ? (text.innerText = "Synced", 
      this.flashSyncSuccess(), setTimeout(() => {
        pill.classList.remove("expanded"), icon.classList.remove("spin");
      }, 2e3)) : (this.showToast("Cloud Upload Complete!", "success", 2400), this.flashSyncSuccess());
    } catch (e) {
      console.error(e), alert("SYNC FAILED: " + e.message), silent || this.showToast("Sync failed: " + e.message, "error", 6e3), 
      silent && (pill.classList.remove("expanded"), icon.classList.remove("spin"));
    }
  }
  mergeChatData(localData, cloudData, type) {
    if (localData = localData ?? ("rooms" === type ? [] : {}), cloudData = cloudData ?? ("rooms" === type ? [] : {}), 
    "rooms" === type) {
      const localArr = Array.isArray(localData) ? localData : [], cloudArr = Array.isArray(cloudData) ? cloudData : [], keyForRoom = r => r && (r.cloudId || r.id) || null, merged = new Map;
      for (const r of localArr) {
        const k = keyForRoom(r);
        k && merged.set(k, r);
      }
      for (const r of cloudArr) {
        const k = keyForRoom(r);
        if (!k) continue;
        const existing = merged.get(k);
        existing ? merged.set(k, {
          ...existing,
          ...r,
          id: r.id ?? existing.id
        }) : merged.set(k, r);
      }
      return Array.from(merged.values());
    }
    const localObj = localData && "object" == typeof localData && !Array.isArray(localData) ? localData : {}, cloudObj = cloudData && "object" == typeof cloudData && !Array.isArray(cloudData) ? cloudData : {}, out = {
      ...localObj
    }, getMsgTs = m => m?.timestamp ?? m?.ts ?? m?.time ?? m?.createdAt ?? 0, getMsgSender = m => m?.sender ?? m?.role ?? m?.author ?? "", getMsgText = m => m?.text ?? m?.content ?? m?.message ?? "";
    for (const key of Object.keys(cloudObj)) {
      const l = Array.isArray(out[key]) ? out[key] : [], c = Array.isArray(cloudObj[key]) ? cloudObj[key] : [], seen = new Set, merged = [], add = msg => {
        if (!msg || "object" != typeof msg) return;
        const id = (m = msg, m?.id ?? m?.message_id ?? m?.msgId ?? null);
        var m;
        const ts = getMsgTs(msg), sender = getMsgSender(msg), text = getMsgText(msg), dedupeKey = id ? `id:${id}` : `${ts}|${sender}|${text}`;
        seen.has(dedupeKey) || (seen.add(dedupeKey), merged.push(msg));
      };
      l.forEach(add), c.forEach(add), merged.sort((a, b) => getMsgTs(a) - getMsgTs(b)), 
      out[key] = merged;
    }
    return out;
  }
  async cloudDownload(silent = !1) {
    const token = localStorage.getItem("nomi_gh_token"), gistId = localStorage.getItem("nomi_gist_id");
    if (!token || !gistId) return void (silent || alert("Please enter keys."));
    const pill = document.getElementById("syncBtn"), icon = document.getElementById("syncIcon"), text = document.getElementById("syncText"), setSyncUi = label => {
      if (silent) {
        try {
          pill?.classList.add("expanded");
        } catch {}
        try {
          icon?.classList.add("spin");
        } catch {}
        text && (text.innerText = label);
      } else this.showToast(label);
    }, clearSyncUi = () => {
      if (silent) {
        try {
          pill?.classList.remove("expanded");
        } catch {}
        try {
          icon?.classList.remove("spin");
        } catch {}
      }
    }, safeParse = s => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    }, readFileJson = async (fileObj, filename, fallback = null) => {
      try {
        if (!fileObj) return fallback;
        if ("string" == typeof fileObj.content && !fileObj.truncated) {
          return safeParse(fileObj.content) ?? fallback;
        }
        if (fileObj.raw_url) {
          const bustUrl = `${fileObj.raw_url}${fileObj.raw_url.includes("?") ? "&" : "?"}t=${Date.now()}`, r = await fetch(bustUrl, {
            cache: "no-store"
          });
          if (!r.ok) return fallback;
          const txt = await r.text();
          return safeParse(txt) ?? fallback;
        }
        return fallback;
      } catch {
        return fallback;
      }
    }, normalizeRooms = rooms => Array.isArray(rooms) ? rooms : [], normalizeMsgs = msgs => msgs && "object" == typeof msgs && !Array.isArray(msgs) ? msgs : {}, safeLoadJson = (key, fallback) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    };
    try {
      setSyncUi("Downloading...");
      const gist = await (async () => {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `token ${token}`
          }
        });
        if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
        return await res.json();
      })(), files = gist?.files || {}, indexData = await readFileJson(files["index.json"], 0, {
        nomis: [],
        groups: []
      }), settingsData = await readFileJson(files["settings.json"], 0, {}), nomiFileNames = [], groupFileNames = [];
      if (indexData && Array.isArray(indexData.nomis) && indexData.nomis.length) for (const n of indexData.nomis) n && void 0 !== n.id && null !== n.id && nomiFileNames.push(`n_${n.id}.json`); else for (const name of Object.keys(files)) name.startsWith("n_") && name.endsWith(".json") && nomiFileNames.push(name);
      if (indexData && Array.isArray(indexData.groups) && indexData.groups.length) for (const g of indexData.groups) g && void 0 !== g.id && null !== g.id && groupFileNames.push(`g_${g.id}.json`); else for (const name of Object.keys(files)) name.startsWith("g_") && name.endsWith(".json") && groupFileNames.push(name);
      setSyncUi("Downloading nomis/groups...");
      const nomiPromises = nomiFileNames.filter(fn => files[fn]).map(fn => readFileJson(files[fn], 0, null)), groupPromises = groupFileNames.filter(fn => files[fn]).map(fn => readFileJson(files[fn], 0, null)), [cloudNomisRaw, cloudGroupsRaw] = await Promise.all([ Promise.all(nomiPromises), Promise.all(groupPromises) ]), cloudNomis = (cloudNomisRaw || []).filter(Boolean), cloudGroups = (cloudGroupsRaw || []).filter(Boolean);
      setSyncUi("Downloading chats...");
      let cloudChatRooms = await readFileJson(files["chat_rooms.json"], 0, []), cloudChatMsgs = await readFileJson(files["chat_messages.json"], 0, {});
      if (cloudChatRooms = normalizeRooms(cloudChatRooms), cloudChatMsgs = normalizeMsgs(cloudChatMsgs), 
      window.chatManager && "function" == typeof chatManager.whenReady) try {
        await chatManager.whenReady();
      } catch {}
      const localChatRooms = window.chatManager && Array.isArray(chatManager.rooms) && chatManager.rooms.length ? normalizeRooms(chatManager.rooms) : normalizeRooms(safeLoadJson("nomi_chat_rooms", [])), localChatMsgs = window.chatManager && chatManager.messages && "object" == typeof chatManager.messages && Object.keys(chatManager.messages).length ? normalizeMsgs(chatManager.messages) : normalizeMsgs(safeLoadJson("nomi_chat_messages", {}));
      let finalRooms = this.mergeChatData(localChatRooms, cloudChatRooms, "rooms"), finalMsgs = this.mergeChatData(localChatMsgs, cloudChatMsgs, "messages");
      if (settingsData?.apiKey && Array.isArray(finalRooms) && finalRooms.length > 0) try {
        const apiRes = await this.fetchProxy("https://api.nomi.ai/v1/rooms", settingsData.apiKey), apiData = await apiRes.json();
        if (apiData && (apiData.rooms || Array.isArray(apiData))) {
          const liveRoomUuids = (apiData.rooms || apiData).map(r => r.uuid);
          finalRooms = finalRooms.filter(r => liveRoomUuids.includes(r.cloudId));
          const validNomiUuids = cloudNomis.map(n => n.uuid).filter(Boolean), validRoomIds = finalRooms.map(r => r.id), validRoomCloudIds = finalRooms.map(r => r.cloudId).filter(Boolean), cleanedMsgs = {};
          Object.keys(finalMsgs || {}).forEach(key => {
            (validRoomIds.includes(key) || validRoomCloudIds.includes(key) || validNomiUuids.includes(key)) && (cleanedMsgs[key] = finalMsgs[key]);
          }), finalMsgs = cleanedMsgs;
        }
      } catch (e) {
        console.warn("API Verification failed, preserving history.");
      }
      const cloudIdToLocalId = new Map(finalRooms.filter(r => r && r.cloudId && r.id).map(r => [ r.cloudId, r.id ])), remappedMsgs = {};
      for (const [key, arr] of Object.entries(finalMsgs || {})) {
        const targetKey = cloudIdToLocalId.get(key) || key, list = Array.isArray(arr) ? arr : [];
        remappedMsgs[targetKey] || (remappedMsgs[targetKey] = []), remappedMsgs[targetKey].push(...list);
      }
      for (const k of Object.keys(remappedMsgs)) {
        const seen = new Set, merged = [];
        for (const msg of remappedMsgs[k]) {
          if (!msg || "object" != typeof msg) continue;
          const msgId = msg.id ?? msg.message_id ?? msg.msgId, msgTs = msg.timestamp ?? msg.ts ?? msg.time ?? msg.createdAt ?? 0, msgSender = msg.sender ?? msg.role ?? msg.author ?? "", msgText = msg.text ?? msg.content ?? msg.message ?? "", dedupeKey = msgId ? `id:${msgId}` : `${msgTs}|${msgSender}|${msgText}`;
          seen.has(dedupeKey) || (seen.add(dedupeKey), merged.push(msg));
        }
        merged.sort((a, b) => (a.timestamp ?? a.ts ?? 0) - (b.timestamp ?? b.ts ?? 0)), 
        remappedMsgs[k] = merged;
      }
      if (finalMsgs = remappedMsgs, localStorage.setItem("nomi_chat_rooms", JSON.stringify(finalRooms || [])), 
      localStorage.setItem("nomi_chat_messages", JSON.stringify(finalMsgs || {})), window.chatManager) try {
        "function" == typeof chatManager.whenReady && await chatManager.whenReady(), chatManager.rooms = finalRooms || [], 
        chatManager.messages = finalMsgs || {}, "function" == typeof chatManager.saveRooms && chatManager.saveRooms(), 
        "function" == typeof chatManager.saveMessages && chatManager.saveMessages(), "function" == typeof chatManager._flushKVWrites && await chatManager._flushKVWrites(), 
        "function" == typeof chatManager.updateGlobalBadge && chatManager.updateGlobalBadge();
      } catch (e) {
        console.warn("Failed to push downloaded chat data into chatManager:", e);
      }
      const prev = this.data || {
        settings: {},
        nomis: [],
        groups: []
      }, themeKeep = prev?.settings?.theme, mergedSettings = {
        ...prev.settings || {},
        ...settingsData || {}
      };
      themeKeep && (mergedSettings.theme = themeKeep), this.data = {
        ...prev,
        settings: mergedSettings,
        nomis: Array.isArray(cloudNomis) ? cloudNomis : [],
        groups: Array.isArray(cloudGroups) ? cloudGroups : []
      }, "function" == typeof this.applyTheme && this.applyTheme(this.data.settings.theme || "cyber"), 
      await this.saveToDB(!0);
      const debugInfo = {
        timestamp: (new Date).toISOString(),
        nomis: this.data.nomis.length,
        groups: this.data.groups.length,
        cloudRooms: cloudChatRooms.length,
        cloudMsgKeys: Object.keys(cloudChatMsgs).length,
        finalRooms: finalRooms.length,
        finalMsgKeys: Object.keys(finalMsgs).length,
        nomiFiles: nomiFileNames,
        groupFiles: groupFileNames
      };
      if (localStorage.setItem("nomi_last_download_debug", JSON.stringify(debugInfo, null, 2)), 
      silent) text && (text.innerText = "Synced"), "function" == typeof this.flashSyncSuccess && this.flashSyncSuccess(), 
      "function" == typeof this.renderGallery && this.renderGallery(), setTimeout(() => clearSyncUi(), 2e3); else {
        let totalMsgCount = 0;
        for (const msgs of Object.values(finalMsgs || {})) Array.isArray(msgs) && (totalMsgCount += msgs.length);
        alert(`Download Complete!\n\nNomis: ${this.data.nomis.length}\nGroups: ${this.data.groups.length}\nRooms: ${finalRooms.length}\nChat conversations: ${Object.keys(finalMsgs || {}).length}\nTotal messages: ${totalMsgCount}\n\nThe page will now reload to apply changes.`);
        try {
          window.chatManager && "function" == typeof chatManager._flushKVWrites && await chatManager._flushKVWrites();
        } catch {}
        location.reload();
      }
    } catch (e) {
      console.error(e), silent || alert("Sync Error: " + e.message), clearSyncUi();
    }
  }
  toggleCloudHelp() {
    document.getElementById("cloudHelpModal").classList.toggle("active");
  }
  exportCloudCreds() {
    const token = localStorage.getItem("nomi_gh_token"), gistId = localStorage.getItem("nomi_gist_id");
    if (!token || !gistId) return alert("No Cloud Keys found to export.");
    const keys = {
      token: token,
      gistId: gistId
    }, s = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keys)), a = document.createElement("a");
    a.href = s, a.download = "nomi_cloud_keys.json", document.body.appendChild(a), a.click(), 
    a.remove();
  }
  importCloudCreds(input) {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader;
    r.onload = e => {
      try {
        const j = JSON.parse(e.target.result);
        j.token && j.gistId ? (localStorage.setItem("nomi_gh_token", j.token), localStorage.setItem("nomi_gist_id", j.gistId), 
        document.getElementById("ghTokenInput").value = j.token, document.getElementById("gistIdInput").value = j.gistId, 
        alert("✅ Keys Imported Successfully!")) : alert("Invalid Key File.");
      } catch (err) {
        alert("Error reading file.");
      }
      input.value = "";
    }, r.readAsText(f);
  }
  async syncFromApi() {
    if (this.isSyncing) return;
    if (!this.data.settings.apiKey) return alert("Please go to Settings and enter your Nomi.ai API Key first."), 
    void this.toggleSettings();
    this.isSyncing = !0;
    const pill = document.getElementById("syncBtn"), icon = document.getElementById("syncIcon"), text = document.getElementById("syncText");
    pill.classList.add("expanded"), icon.classList.add("spin"), text.innerText = "Connecting...";
    try {
      const listRes = await this.fetchProxy("https://api.nomi.ai/v1/nomis"), listData = await listRes.json();
      if (!listData || !listData.nomis) throw new Error("Invalid data received from API.");
      let added = 0, updated = 0;
      text.innerText = "Importing...";
      for (const r of listData.nomis) {
        let l = this.data.nomis.find(n => n.uuid === r.uuid || n.name === r.name);
        if (l ? (l.uuid !== r.uuid && (l.uuid = r.uuid), updated++) : (l = {
          id: Date.now() + Math.random(),
          uuid: r.uuid,
          name: r.name,
          photo: null,
          banner: null,
          data: {
            key_traits: []
          },
          gallery: [],
          custom_sections: [],
          sectionOrder: DEFAULT_SECTIONS.map(s => s.id),
          isFavorite: !1
        }, this.data.nomis.push(l), added++), !l.photo) try {
          const avRes = await this.fetchProxy(`https://api.nomi.ai/v1/nomis/${r.uuid}/avatar`), b = await avRes.blob();
          l.photo = await new Promise(resolve => {
            const fr = new FileReader;
            fr.onloadend = () => resolve(fr.result), fr.readAsDataURL(b);
          }), l.gallery || (l.gallery = []), l.gallery.unshift({
            id: Date.now() + Math.random(),
            img: l.photo,
            prompt: "Imported from Nomi.ai"
          });
        } catch (e) {
          console.warn(`Failed to load avatar for ${l.name}`, e);
        }
      }
      await this.saveToDB(), this.renderGallery(!1), this.flashSyncSuccess(), alert(`Import Complete:\n• ${added} New Nomis\n• ${updated} Updated`);
    } catch (e) {
      console.error(e), alert("Error: " + e.message);
    } finally {
      this.isSyncing = !1, pill.classList.remove("expanded"), icon.classList.remove("spin");
    }
  }
  initStartView() {
    if ("last" === this.data.settings.startView && this.data.settings.lastState) {
      const state = this.data.settings.lastState;
      if ("nomi" === state.view && state.id) {
        if (this.data.nomis.find(n => n.id === state.id)) return this.editNomi(state.id);
      } else if ("group" === state.view && state.id) {
        if (this.data.groups.find(g => g.id === state.id)) return this.editGroup(state.id);
      }
    }
    this.goHome();
  }
  goHome(pushHistory = !0) {
    this.isReordering = !1, this.isBatchMode = !1, this.selectedImages.clear(), document.getElementById("viewHome").style.display = "block", 
    document.getElementById("viewNomi").style.display = "none", document.getElementById("viewGroup").style.display = "none", 
    document.getElementById("heroBackground").style.backgroundImage = "none", this.currentNomiId = null, 
    this.currentGroupId = null, this.renderGallery(!1), this.saveState("home"), pushHistory && history.pushState({
      view: "home"
    }, "", "#home");
  }
  switchTab(t) {
    this.currentNomiId && history.replaceState({
      view: "nomi",
      id: this.currentNomiId,
      tab: t
    }, "", "#nomi/" + this.currentNomiId), document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active")), 
    document.getElementById("tab" + (t.charAt(0).toUpperCase() + t.slice(1))).classList.add("active"), 
    this.isReordering = !1;
    const btnNomi = document.getElementById("btnSortNomi");
    btnNomi && btnNomi.classList.remove("active");
    const rstNomi = document.getElementById("btnResetNomi");
    rstNomi && (rstNomi.style.visibility = "hidden"), "profile" === t ? (document.getElementById("contentProfile").style.display = "block", 
    document.getElementById("contentGallery").style.display = "none", this.renderFormGrid()) : (document.getElementById("contentProfile").style.display = "none", 
    document.getElementById("contentGallery").style.display = "block", this.renderPromptGallery());
  }
  switchGroupTab(t) {
    this.currentGroupId && history.replaceState({
      view: "group",
      id: this.currentGroupId,
      tab: t
    }, "", "#group/" + this.currentGroupId), document.querySelectorAll("#viewGroup .tab-btn").forEach(b => b.classList.remove("active")), 
    document.getElementById("tabGroup" + (t.charAt(0).toUpperCase() + t.slice(1))).classList.add("active"), 
    this.isReordering = !1;
    const btnGroup = document.getElementById("btnSortGroup");
    btnGroup && btnGroup.classList.remove("active");
    const rstGroup = document.getElementById("btnResetGroup");
    rstGroup && (rstGroup.style.visibility = "hidden"), document.getElementById("contentGroupProfile").style.display = "none", 
    document.getElementById("contentGroupGallery").style.display = "none", document.getElementById("contentGroupMembers").style.display = "none", 
    "profile" === t ? (document.getElementById("contentGroupProfile").style.display = "block", 
    this.renderGroupSections()) : "gallery" === t ? (document.getElementById("contentGroupGallery").style.display = "block", 
    this.renderPromptGallery()) : "members" === t && (document.getElementById("contentGroupMembers").style.display = "block", 
    this.renderGroupMembers());
  }
  createNomi() {
    this.createContext("nomi");
  }
  editNomi(id, pushHistory = !0, initialTab = "profile") {
    this.editContext(id, "nomi", pushHistory, initialTab);
  }
  createContext(type) {
    const id = Date.now(), isGroup = "group" === type, newObj = {
      id: id,
      name: isGroup ? "New Group" : "New Nomi",
      photo: null,
      banner: null,
      gallery: [],
      custom_sections: [],
      sectionOrder: isGroup ? [ "backstory" ] : DEFAULT_SECTIONS.map(s => s.id),
      ...isGroup ? {
        members: []
      } : {
        data: {},
        isFavorite: !1
      }
    };
    isGroup ? this.data.groups.push(newObj) : this.data.nomis.push(newObj), this.saveToDB().then(() => this.editContext(id, type));
  }
  editContext(id, type, pushHistory = !0, initialTab = "profile") {
    "group" === type ? this.currentGroupId = id : this.currentNomiId = id, this.saveState(type, id), 
    this.isReordering = !1, this.isBatchMode = !1, this.selectedImages.clear();
    const suffix = "group" === type ? "Group" : "Nomi", btnSort = document.getElementById("btnSort" + suffix), btnReset = document.getElementById("btnReset" + suffix);
    btnSort && btnSort.classList.remove("active"), btnReset && (btnReset.style.visibility = "hidden"), 
    pushHistory && history.pushState({
      view: type,
      id: id,
      tab: initialTab
    }, "", `#${type}/${id}`);
    const target = "group" === type ? this.data.groups.find(x => x.id === id) : this.data.nomis.find(x => x.id === id);
    target.sectionOrder || (target.sectionOrder = "group" === type ? [ "backstory" ] : DEFAULT_SECTIONS.map(s => s.id), 
    target.custom_sections && target.custom_sections.forEach(cs => target.sectionOrder.push(cs.id))), 
    document.getElementById("viewHome").style.display = "none", document.getElementById("viewNomi").style.display = "nomi" === type ? "block" : "none", 
    document.getElementById("viewGroup").style.display = "group" === type ? "block" : "none", 
    document.getElementById("heroBackground").style.backgroundImage = "none", window.scrollTo(0, 0), 
    this.toggleNameEdit(type, !1), document.getElementById(type + "NameDisplay").innerText = target.name, 
    document.getElementById(type + "Name").value = target.name;
    const disp = document.getElementById(type + "ImageDisplay"), plac = document.getElementById(type + "ImagePlaceholder");
    target.photo ? (disp.src = target.photo, disp.style.display = "block", plac.style.display = "none") : (disp.style.display = "none", 
    plac.style.display = "flex", plac.innerText = target.name ? target.name.charAt(0) : "?"), 
    "group" === type ? this.switchGroupTab(initialTab) : (this.switchTab(initialTab), 
    this.renderTraits(), this.renderFormGrid());
  }
  selectGalleryImageOptions(imgUrl, imgId) {
    cropper.initFromUrl(imgUrl, this.currentNomiId ? "nomi" : "group");
  }
  toggleFavorite(e, id) {
    e.stopPropagation();
    const n = this.data.nomis.find(x => x.id === id);
    n.isFavorite = !n.isFavorite, this.saveToDB(), this.renderGallery(!1);
  }
  renderGallery(animate = !1) {
    const isList = "list" === this.dashboardView, isMobile = window.innerWidth <= 768, g = document.getElementById("nomiGallery"), gg = document.getElementById("groupGallery");
    g && (g.innerHTML = "", isList ? (g.classList.add("list-mode"), g.innerHTML = '<div class="list-col" data-col="0"></div><div class="list-col" data-col="1"></div>') : g.classList.remove("list-mode")), 
    gg && (gg.innerHTML = "", isList ? (gg.classList.add("list-mode"), gg.innerHTML = '<div class="list-col" data-col="0"></div><div class="list-col" data-col="1"></div>') : gg.classList.remove("list-mode"));
    const term = (document.getElementById("searchInput").value || "").toLowerCase(), order = this.data?.settings?.dashboardOrder || {
      nomis: [],
      groups: []
    }, nomiOrder = Array.isArray(order.nomis) ? order.nomis : [], groupOrder = Array.isArray(order.groups) ? order.groups : [], sortByManualOrder = (items, orderArr, fallbackCmp) => {
      const idxMap = (arr => {
        const map = new Map;
        return arr.forEach((id, idx) => map.set(Number(id), idx)), map;
      })(orderArr);
      return items.slice().sort((a, b) => {
        const ai = idxMap.has(a.id) ? idxMap.get(a.id) : 1 / 0, bi = idxMap.has(b.id) ? idxMap.get(b.id) : 1 / 0;
        return ai !== bi ? ai - bi : fallbackCmp(a, b);
      });
    }, nomiFallbackCmp = (a, b) => a.isFavorite !== b.isFavorite ? (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) : (a.name || "").localeCompare(b.name || "", void 0, {
      sensitivity: "base"
    }), groupFallbackCmp = (a, b) => (a.name || "").localeCompare(b.name || "", void 0, {
      sensitivity: "base"
    }), nomisFiltered = this.data.nomis.filter(n => (n.name || "").toLowerCase().includes(term));
    (nomiOrder.length ? sortByManualOrder(nomisFiltered, nomiOrder, nomiFallbackCmp) : nomisFiltered.slice().sort(nomiFallbackCmp)).forEach((n, index) => {
      const favClass = n.isFavorite ? "active" : "", animClass = animate ? "pop-in" : "", letter = n.name ? n.name.charAt(0) : "?", imgHtml = n.photo ? `<img src="${n.photo}" loading="lazy">` : `<div class="card-placeholder">${letter}</div>`, html = `\n                <div class="nomi-card ${animClass}" data-type="nomi" data-id="${n.id}" onclick="app.onDashboardCardClick('nomi', ${n.id})" oncontextmenu="app.showContextMenu(event, ${n.id}, 'nomi')">\n                    ${imgHtml}\n                    <button class="fav-btn ${favClass}" onclick="app.toggleFavorite(event, ${n.id})">\n                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>\n                    </button>\n                    <div class="nomi-card-info">${n.name}</div>\n                </div>`;
      if (isList) {
        const colIndex = isMobile ? 0 : index % 2;
        g.children[colIndex].insertAdjacentHTML("beforeend", html);
      } else g.insertAdjacentHTML("beforeend", html);
    });
    const groupsFiltered = this.data.groups.filter(gr => (gr.name || "").toLowerCase().includes(term));
    (groupOrder.length ? sortByManualOrder(groupsFiltered, groupOrder, groupFallbackCmp) : groupsFiltered.slice().sort(groupFallbackCmp)).forEach((gr, index) => {
      const animClass = animate ? "pop-in" : "", letter = gr.name ? gr.name.charAt(0) : "?", imgHtml = gr.photo ? `<img src="${gr.photo}" loading="lazy">` : `<div class="card-placeholder">${letter}</div>`, html = `\n                <div class="nomi-card ${animClass}" data-type="group" data-id="${gr.id}" onclick="app.onDashboardCardClick('group', ${gr.id})" oncontextmenu="app.showContextMenu(event, ${gr.id}, 'group')">\n                    ${imgHtml}\n                    <div class="nomi-card-info">${gr.name}</div>\n                </div>`;
      if (isList) {
        const colIndex = isMobile ? 0 : index % 2;
        gg.children[colIndex].insertAdjacentHTML("beforeend", html);
      } else gg.insertAdjacentHTML("beforeend", html);
    }), this.refreshDashboardDraggables(), this.updateDashboardArrangeButtons();
  }
  toggleNameEdit(type, isEditing) {
    const display = document.getElementById(type + "NameDisplay"), btn = document.getElementById(type + "EditBtn"), editor = document.getElementById(type + "NameEdit");
    isEditing ? ("nomi" === type ? document.getElementById("nomiName").value = this.data.nomis.find(n => n.id === this.currentNomiId).name : document.getElementById("groupName").value = this.data.groups.find(g => g.id === this.currentGroupId).name, 
    display.style.display = "none", btn.style.display = "none", editor.classList.add("active"), 
    document.getElementById(type + "Name").focus()) : (display.style.display = "block", 
    btn.style.display = "flex", editor.classList.remove("active"));
  }
  cancelNameEdit(type) {
    let currentName = "";
    if ("nomi" === type) {
      currentName = this.data.nomis.find(x => x.id === this.currentNomiId).name;
    } else {
      currentName = this.data.groups.find(x => x.id === this.currentGroupId).name;
    }
    document.getElementById(type + "Name").value = currentName, this.toggleNameEdit(type, !1);
  }
  cancelSection(id, isGroup) {
    if (isGroup) {
      const g = this.data.groups.find(x => x.id === this.currentGroupId);
      let val = "";
      if ("backstory" === id) val = g.backstory || ""; else {
        const s = g.custom_sections.find(cs => cs.id === id);
        val = s ? s.content : "";
      }
      document.getElementById(`group_sec_${id}`).value = val, this.updateGroupSectionContent(id, val);
    } else {
      const n = this.data.nomis.find(x => x.id === this.currentNomiId);
      let val = "";
      const def = DEFAULT_SECTIONS.find(d => d.id === id);
      if (def) val = n.data[id] || ""; else {
        const s = n.custom_sections.find(cs => cs.id === id);
        val = s ? s.content : "";
      }
      document.getElementById(`field_${id}`).value = val, this.handleInput(id, 5e3, !def);
    }
    this.showToast("Changes Reverted");
  }
  saveName(type) {
    const val = document.getElementById(type + "Name").value;
    if ("nomi" === type) {
      this.data.nomis.find(x => x.id === this.currentNomiId).name = val, document.getElementById("nomiNameDisplay").innerText = val, 
      this.autoSaveNomi();
    } else {
      this.data.groups.find(x => x.id === this.currentGroupId).name = val, document.getElementById("groupNameDisplay").innerText = val, 
      this.autoSaveGroup();
    }
    this.toggleNameEdit(type, !1);
  }
  setAllSections(collapsed) {
    document.querySelectorAll(".glass-card").forEach(card => {
      if (collapsed) card.classList.add("collapsed"); else {
        card.classList.remove("collapsed");
        const ta = card.querySelector("textarea");
        this.autoResize(ta);
      }
    });
  }
  copyAllSections(isGroup) {
    let text = "", count = 0;
    if (isGroup) {
      const g = this.data.groups.find(x => x.id === this.currentGroupId);
      g.sectionOrder.forEach(sid => {
        const isBackstory = "backstory" === sid, cust = g.custom_sections ? g.custom_sections.find(cs => cs.id === sid) : null;
        if (!isBackstory && !cust) return;
        const title = isBackstory ? "Group Backstory" : cust.title, content = isBackstory ? g.backstory || "" : cust.content;
        content.trim() && (text += `## ${title}\n${content}\n\n`, count++);
      });
    } else {
      const n = this.data.nomis.find(x => x.id === this.currentNomiId);
      n.sectionOrder.forEach(sid => {
        const def = DEFAULT_SECTIONS.find(d => d.id === sid), cust = n.custom_sections ? n.custom_sections.find(cs => cs.id === sid) : null;
        if (!def && !cust) return;
        const title = def ? def.label : cust.title, val = def ? n.data[sid] || "" : cust.content;
        val && val.trim() && (text += `## ${title}\n${val}\n\n`, count++);
      });
    }
    count > 0 ? navigator.clipboard.writeText(text).then(() => this.showToast(`Copied ${count} sections!`)) : this.showToast("Nothing to copy!");
  }
  toggleReorderMode() {
    this.isReordering = !this.isReordering;
    const btnNomi = document.getElementById("btnSortNomi"), btnGroup = document.getElementById("btnSortGroup"), rstNomi = document.getElementById("btnResetNomi"), rstGroup = document.getElementById("btnResetGroup");
    this.isReordering ? (btnNomi && btnNomi.classList.add("active"), btnGroup && btnGroup.classList.add("active"), 
    rstNomi && (rstNomi.style.visibility = "visible"), rstGroup && (rstGroup.style.visibility = "visible")) : (btnNomi && btnNomi.classList.remove("active"), 
    btnGroup && btnGroup.classList.remove("active"), rstNomi && (rstNomi.style.visibility = "hidden"), 
    rstGroup && (rstGroup.style.visibility = "hidden")), "block" === document.getElementById("viewGroup").style.display ? this.renderGroupSections() : this.renderFormGrid();
  }
  resetSort() {
    if (!confirm("Reset sections to default order?")) return;
    if ("block" === document.getElementById("viewGroup").style.display) {
      const g = this.data.groups.find(x => x.id === this.currentGroupId);
      let newOrder = [ "backstory" ];
      g.custom_sections && g.custom_sections.forEach(cs => {
        newOrder.includes(cs.id) || newOrder.push(cs.id);
      }), g.sectionOrder = newOrder, this.saveToDB(), this.renderGroupSections();
    } else {
      const n = this.data.nomis.find(x => x.id === this.currentNomiId);
      let newOrder = DEFAULT_SECTIONS.map(s => s.id);
      n.custom_sections && n.custom_sections.forEach(cs => {
        newOrder.includes(cs.id) || newOrder.push(cs.id);
      }), n.sectionOrder = newOrder, this.saveToDB(), this.renderFormGrid();
    }
  }
  toggleBatchMode() {
    this.isBatchMode = !this.isBatchMode, this.selectedImages.clear();
    const {type: type} = this.getCurrentContext(), prefix = "group" === type ? "btnGroup" : "btn", btn = document.getElementById(prefix + "BatchMode"), delBtn = document.getElementById(prefix + "BatchDelete");
    this.isBatchMode ? (btn.classList.add("active"), delBtn.style.display = "flex") : (btn.classList.remove("active"), 
    delBtn.style.display = "none");
    const searchInputId = "group" === type ? "groupGallerySearch" : "nomiGallerySearch";
    this.filterGallery(document.getElementById(searchInputId).value);
  }
  toggleGallerySelection(id) {
    this.selectedImages.has(id) ? this.selectedImages.delete(id) : this.selectedImages.add(id);
    const searchInputId = "block" === document.getElementById("viewGroup").style.display ? "groupGallerySearch" : "nomiGallerySearch";
    this.filterGallery(document.getElementById(searchInputId).value);
  }
  deleteBatchImages() {
    if (0 === this.selectedImages.size) return this.showToast("No images selected");
    if (!confirm(`Delete ${this.selectedImages.size} selected images?`)) return;
    const {target: target} = this.getCurrentContext();
    target.gallery = target.gallery.filter(g => !this.selectedImages.has(g.id)), this.saveToDB(), 
    this.toggleBatchMode(), this.showToast("Images Deleted!");
  }
  getDragAfterElement(container, y) {
    return [ ...container.querySelectorAll(".glass-card:not(.dragging)") ].reduce((closest, child) => {
      const box = child.getBoundingClientRect(), offset = y - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset ? {
        offset: offset,
        element: child
      } : closest;
    }, {
      offset: Number.NEGATIVE_INFINITY
    }).element;
  }
  handleDragStart(e, id, isGroup) {
    this.isReordering ? (this.dragSrcEl = e.target.closest(".glass-card"), this.dragSrcEl.classList.add("dragging"), 
    e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("text/plain", id)) : e.preventDefault();
  }
  handleDragOver(e) {
    if (!this.isReordering) return;
    e.preventDefault();
    const container = e.target.closest(".form-column-container") || document.getElementById("groupSectionsContainer");
    if (!container) return;
    const afterElement = this.getDragAfterElement(container, e.clientY), draggable = document.querySelector(".dragging");
    draggable && (null == afterElement ? container.appendChild(draggable) : container.insertBefore(draggable, afterElement));
  }
  handleDragEnd(e) {
    const draggable = document.querySelector(".dragging");
    draggable && draggable.classList.remove("dragging"), this.saveOrderFromDOM();
  }
  handleTouchStart(e) {
    if (!this.isReordering) return;
    e.cancelable && e.preventDefault();
    const card = e.currentTarget.closest(".glass-card");
    this.touchDragItem = card, card.classList.add("dragging");
  }
  handleTouchMove(e) {
    if (!this.isReordering) return;
    if (e.cancelable && e.preventDefault(), !this.touchDragItem) return;
    const touch = e.touches[0], elementUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elementUnderFinger) return;
    const container = elementUnderFinger.closest(".form-column-container") || document.getElementById("groupSectionsContainer");
    if (!container) return;
    const afterElement = this.getDragAfterElement(container, touch.clientY);
    null == afterElement ? container.appendChild(this.touchDragItem) : container.insertBefore(this.touchDragItem, afterElement);
  }
  handleTouchEnd(e) {
    this.touchDragItem && (this.touchDragItem.classList.remove("dragging"), this.touchDragItem = null, 
    this.saveOrderFromDOM());
  }
  saveOrderFromDOM() {
    if ("block" === document.getElementById("viewGroup").style.display) {
      const g = this.data.groups.find(x => x.id === this.currentGroupId), container = document.getElementById("groupSectionsContainer"), newOrder = [];
      Array.from(container.children).forEach(child => {
        const textArea = child.querySelector("textarea");
        if (textArea) {
          const parts = textArea.id.split("group_sec_");
          parts.length > 1 && newOrder.push(parts[1]);
        }
      }), newOrder.length > 0 && (g.sectionOrder = newOrder, this.saveToDB());
    } else {
      const n = this.data.nomis.find(x => x.id === this.currentNomiId), container = document.getElementById("profileGrid"), newOrder = [];
      Array.from(container.children).forEach(child => {
        const textArea = child.querySelector("textarea");
        if (textArea) {
          const parts = textArea.id.split("field_");
          parts.length > 1 && newOrder.push(parts[1]);
        }
      }), newOrder.length > 0 && (n.sectionOrder = newOrder, this.saveToDB());
    }
  }
  renderSectionCard(sid, label, val, limit, isCust, isReordering, isGroup) {
    const cardId = isGroup ? "card_group_" + sid : "card_" + sid, inputId = (isGroup ? "group_sec_" : "field_") + sid, draggableAttr = isReordering ? 'draggable="true"' : 'draggable="false"', handleStyle = isReordering ? "display:block;" : "", isOverLimit = !isCust && val.length > limit, countDisplay = isCust ? "" : `<span id="count_${sid}" style="font-size:0.7rem; opacity:0.6; ${isOverLimit ? "color:#ef4444" : ""}">${val.length}/${limit}</span>`;
    return `\n        <div class="glass-card collapsed ${isOverLimit ? "over-limit" : ""}" id="${cardId}" ${draggableAttr} \n             ondragstart="app.handleDragStart(event, '${sid}', ${isGroup})" ondragend="app.handleDragEnd(event)">\n            \n            <div class="card-header" onclick="app.toggleCard(this.parentNode)">\n                <div class="card-header-left">\n                    <span class="drag-handle" style="${handleStyle}" \n                          onmousedown="event.stopPropagation()" ontouchstart="app.handleTouchStart(event)" \n                          ontouchmove="app.handleTouchMove(event)" ontouchend="app.handleTouchEnd(event)">\n                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>\n                    </span>\n                    ${isCust ? `<input type="text" value="${label}" style="background:transparent;border:none;color:var(--accent);font-weight:700;font-size:0.85rem;width:100%;font-family:inherit;letter-spacing:1px;text-transform:uppercase;padding:0;margin:0;-webkit-user-select:text;user-select:text;" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()" oninput="app.updateSectionTitle('${sid}', this.value)">` : `<span>${label}</span>`}\n                </div>\n                <div class="card-controls">\n                    ${isCust ? `<button class="tool-btn del" style="width:20px;height:20px;" onclick="event.stopPropagation(); app.deleteSection('${sid}')">×</button>` : countDisplay}\n                    <span class="card-arrow">▼</span>\n                </div>\n            </div>\n\n            <div class="card-body">\n                <textarea id="${inputId}" class="ghost-input" oninput="app.handleInput('${sid}', ${limit}, ${isCust})">${val}</textarea>\n                <div class="btn-row">\n                    <div style="display:flex; gap:10px;">\n                        <button class="save-btn" onclick="app.saveCurrentContext(true)">Save</button>\n                        <button class="copy-btn" style="background:rgba(239,68,68,0.2); border-color:rgba(239,68,68,0.3); color:#fca5a5;" onclick="app.cancelSection('${sid}', ${isGroup})">Cancel</button>\n                    </div>\n                    <div style="display:flex; gap:10px;">\n                        <button class="copy-btn" onclick="app.pasteText('${inputId}')">Paste</button>\n                        <button class="copy-btn" onclick="app.copyText('${inputId}')">Copy</button>\n                    </div>\n                </div>\n            </div>\n        </div>`;
  }
  renderFormGrid() {
    const c = document.getElementById("profileGrid");
    c.innerHTML = "";
    const n = this.data.nomis.find(x => x.id === this.currentNomiId);
    n && (n.sectionOrder && 0 !== n.sectionOrder.length || (n.sectionOrder = DEFAULT_SECTIONS.map(s => s.id), 
    n.custom_sections && n.custom_sections.forEach(cs => n.sectionOrder.push(cs.id))), 
    this.isReordering && (c.ondragover = e => app.handleDragOver(e)), n.sectionOrder.forEach(sid => {
      const def = DEFAULT_SECTIONS.find(d => d.id === sid), cust = n.custom_sections ? n.custom_sections.find(cs => cs.id === sid) : null;
      if (!def && !cust) return;
      const label = def ? def.label : cust.title, val = def ? n.data[sid] || "" : cust.content, limit = def ? def.limit : 5e3;
      c.insertAdjacentHTML("beforeend", this.renderSectionCard(sid, label, val, limit, !!cust, this.isReordering, !1));
    }));
  }
  setContextPhoto(b64, optionalId) {
    const targetId = optionalId || this.getCurrentContext().id;
    let target = this.data.nomis.find(x => x.id === targetId);
    if (target || (target = this.data.groups.find(x => x.id === targetId)), target) {
      if (target.photo = b64, this.saveToDB(), this.currentNomiId === targetId) {
        const d = document.getElementById("nomiImageDisplay"), p = document.getElementById("nomiImagePlaceholder");
        d && p && (d.src = b64, d.style.display = "block", p.style.display = "none");
      } else if (this.currentGroupId === targetId) {
        const d = document.getElementById("groupImageDisplay"), p = document.getElementById("groupImagePlaceholder");
        d && p && (d.src = b64, d.style.display = "block", p.style.display = "none");
      }
      this.renderGallery(!1);
    }
  }
  addSection() {
    const {target: target, type: type} = this.getCurrentContext();
    target.custom_sections || (target.custom_sections = []);
    const newId = ("group" === type ? "cs_g_" : "cs_") + Date.now();
    target.custom_sections.push({
      id: newId,
      title: "New Section",
      content: ""
    }), target.sectionOrder.push(newId), this.saveToDB(), "group" === type ? this.renderGroupSections() : this.renderFormGrid();
  }
  updateSectionTitle(id, val) {
    const {target: target} = this.getCurrentContext(), s = target.custom_sections.find(c => c.id === id);
    s && (s.title = val, this.saveToDB());
  }
  deleteSection(id) {
    if (!confirm("Delete this section?")) return;
    const {target: target, type: type} = this.getCurrentContext();
    target.custom_sections = target.custom_sections.filter(c => c.id !== id), target.sectionOrder = target.sectionOrder.filter(o => o !== id), 
    this.saveToDB(), "group" === type ? this.renderGroupSections() : this.renderFormGrid();
  }
  handleInput(id, limit, isCust) {
    const {type: type} = this.getCurrentContext(), inputPrefix = "group" === type ? "group_sec_" : "field_", el = document.getElementById(inputPrefix + id);
    if (!el) return;
    const cardPrefix = "group" === type ? "card_group_" : "card_", card = document.getElementById(cardPrefix + id), count = document.getElementById(`count_${id}`);
    count && (count.innerText = `${el.value.length}/${limit}`), el.value.length > limit ? (card && card.classList.add("over-limit"), 
    count && (count.style.color = "#ef4444")) : (card && card.classList.remove("over-limit"), 
    count && (count.style.color = "inherit")), this.autoResize(el);
  }
  saveCurrentContext(showToast = !0) {
    const {target: target, type: type} = this.getCurrentContext();
    if ("group" === type) {
      const bsEl = document.getElementById("group_sec_backstory");
      bsEl && (target.backstory = bsEl.value);
    } else DEFAULT_SECTIONS.forEach(s => {
      const el = document.getElementById(`field_${s.id}`);
      el && (target.data[s.id] = el.value);
    });
    if (target.custom_sections) {
      const prefix = "group" === type ? "group_sec_" : "field_";
      target.custom_sections.forEach(s => {
        const el = document.getElementById(prefix + s.id);
        el && (s.content = el.value);
      });
    }
    this.saveToDB().then(() => {
      showToast && this.showToast("group" === type ? "Group Saved!" : "Profile Saved!");
    });
  }
  renderTraits() {
    const n = this.data.nomis.find(x => x.id === this.currentNomiId), c = document.getElementById("traitContainer");
    c.innerHTML = "", (n.data.key_traits || []).forEach(t => {
      const d = document.createElement("div");
      d.className = "tag", d.innerText = t + " ×", d.onclick = () => {
        n.data.key_traits = n.data.key_traits.filter(x => x !== t), this.saveToDB(), this.renderTraits();
      }, c.appendChild(d);
    });
  }
  addTrait(t) {
    const n = this.data.nomis.find(x => x.id === this.currentNomiId);
    if (n.data.key_traits || (n.data.key_traits = []), n.data.key_traits.length >= 7) return alert("Max 7 traits");
    t.trim() && (n.data.key_traits.push(t.trim()), this.saveToDB(), this.renderTraits());
  }
  async addGalleryImages(inpt) {
    const files = Array.from(inpt.files);
    if (0 === files.length) return;
    const {target: target} = this.getCurrentContext();
    for (const f of files) await new Promise(r => {
      this.processImage(f, 1024, b64 => {
        target.gallery || (target.gallery = []), target.gallery.push({
          id: Date.now() + Math.random(),
          img: b64,
          prompt: ""
        }), r();
      });
    });
    this.saveToDB().then(() => this.renderPromptGallery());
  }
  filterGallery(term) {
    const {target: target} = this.getCurrentContext();
    let filtered = target.gallery || [];
    if (term && "" !== term.trim()) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(item => (item.prompt || "").toLowerCase().includes(lowerTerm));
    }
    this.renderPromptGallery(filtered);
  }
  renderPromptGallery(filteredList = null) {
    let target, containerId;
    "block" === document.getElementById("viewGroup").style.display ? (target = this.data.groups.find(x => x.id === this.currentGroupId), 
    containerId = "groupPromptGalleryGrid") : (target = this.data.nomis.find(x => x.id === this.currentNomiId), 
    containerId = "promptGalleryGrid");
    const g = document.getElementById(containerId);
    if (!g) return;
    g.innerHTML = "";
    let listToRender = filteredList || target.gallery || [];
    "newest" === this.gallerySort && (listToRender = [ ...listToRender ].reverse());
    g.style.setProperty("--grid-min", {
      small: "100px",
      medium: "160px",
      large: "260px",
      xlarge: "360px"
    }[this.gallerySize]), listToRender.forEach(i => {
      const isSel = this.selectedImages.has(i.id), d = document.createElement("div");
      let clickHandler;
      d.className = "prompt-card " + (isSel ? "selected" : ""), d.id = `card_${i.id}`, 
      d.oncontextmenu = e => app.showGalleryContextMenu(e, i.id), clickHandler = this.isBatchMode ? `onclick="app.toggleGallerySelection(${i.id})"` : `onclick="app.openLightbox('${i.img}')"`;
      const promptText = i.prompt && i.prompt.trim() ? i.prompt : "No prompt", promptOverlay = this.galleryShowPrompts ? `<div class="prompt-preview-text">${promptText}</div>` : "";
      d.innerHTML = `\n                <img src="${i.img}" ${clickHandler}>\n                ${promptOverlay}\n            `, 
      g.appendChild(d);
    });
  }
  openPromptPopup(imgId) {
    this.currentEditingImageId = imgId;
    let target;
    target = "block" === document.getElementById("viewGroup").style.display ? this.data.groups.find(x => x.id === this.currentGroupId) : this.data.nomis.find(x => x.id === this.currentNomiId);
    const i = target.gallery.find(g => g.id === imgId);
    i && (document.getElementById("globalPromptInput").value = i.prompt || "", document.getElementById("globalPromptPopup").classList.add("active"), 
    setTimeout(() => document.getElementById("globalPromptInput").focus(), 50));
  }
  closePromptPopup() {
    document.getElementById("globalPromptPopup").classList.remove("active"), this.currentEditingImageId = null;
  }
  updatePrompt(imgId, text) {
    let target;
    target = "block" === document.getElementById("viewGroup").style.display ? this.data.groups.find(x => x.id === this.currentGroupId) : this.data.nomis.find(x => x.id === this.currentNomiId);
    const i = target.gallery.find(g => g.id === imgId);
    i && (i.prompt = text);
    const globalEl = document.getElementById("globalPromptInput"), localEl = document.getElementById(`inplace_input_${imgId}`);
    globalEl && globalEl.value !== text && (globalEl.value = text), localEl && localEl.value !== text && (localEl.value = text);
  }
  savePromptManual() {
    if (!this.currentEditingImageId) return;
    const val = document.getElementById("globalPromptInput").value, {target: target} = this.getCurrentContext(), i = target.gallery.find(g => g.id === this.currentEditingImageId);
    if (i) {
      i.prompt = val;
      const card = document.getElementById(`card_${this.currentEditingImageId}`);
      if (card) {
        const overlay = card.querySelector(".prompt-preview-text");
        overlay && (overlay.innerText = val);
      }
    }
    this.saveToDB(), this.showToast("Prompt Saved!"), this.closePromptPopup();
  }
  deleteGalleryItem(id) {
    if (!confirm("Remove image?")) return;
    const {target: target} = this.getCurrentContext();
    target.gallery = target.gallery.filter(g => g.id !== id), this.saveToDB(), this.renderPromptGallery();
  }
  editGroup(id, pushHistory = !0, initialTab = "profile") {
    this.editContext(id, "group", pushHistory, initialTab);
  }
  createGroup() {
    this.createContext("group");
  }
  renderGroupMembers() {
    const c = document.getElementById("groupMembersGrid");
    c.innerHTML = "";
    const g = this.data.groups.find(x => x.id === this.currentGroupId);
    0 !== g.members.length ? g.members.forEach(m => {
      const n = this.data.nomis.find(x => x.id === m.id);
      if (n) {
        const d = document.createElement("div");
        d.className = "member-card";
        const roleText = m.role && "" !== m.role.trim() ? m.role : '<em style="opacity:0.5">Add Note...</em>', safeRole = (m.role || "").replace(/"/g, "&quot;");
        d.innerHTML = `\n                    <div class="member-remove" onclick="app.removeMember(${n.id})" title="Remove">✕</div>\n                    <img src="${n.photo || ""}" onerror="this.style.display='none'" onclick="app.editNomi(${n.id})">\n                    <div class="member-name" onclick="app.editNomi(${n.id})">${n.name}</div>\n                    \n                    <div id="role_disp_${n.id}" class="member-role-display" title="${safeRole}" onclick="app.toggleMemberRoleEdit(${n.id}, true)">\n                        <span>${roleText}</span>\n                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5; flex-shrink:0;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>\n                    </div>\n\n                    <div id="role_edit_${n.id}" class="member-role-edit">\n                        <textarea id="role_input_${n.id}" class="member-role-input" placeholder="Role / Note">${m.role || ""}</textarea>\n                        <div style="display:flex; flex-direction:column; gap:5px;">\n                            <div class="role-btn save" onclick="app.saveMemberRole(${n.id})">✓</div>\n                            <div class="role-btn cancel" onclick="app.cancelMemberRole(${n.id})">✕</div>\n                        </div>\n                    </div>\n                `, 
        c.appendChild(d);
      }
    }) : c.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">No members yet. Add one above!</div>';
  }
  toggleMemberDropdown() {
    const d = document.getElementById("memberOptions");
    if (d.classList.contains("open")) return void d.classList.remove("open");
    d.innerHTML = "";
    const g = this.data.groups.find(x => x.id === this.currentGroupId);
    let h = !1;
    this.data.nomis.forEach(n => {
      if (!g.members.find(m => m.id === n.id)) {
        h = !0;
        const dv = document.createElement("div");
        dv.className = "custom-option", dv.innerHTML = `<img src="${n.photo || ""}" onerror="this.style.display='none'"><span>${n.name}</span>`, 
        dv.onclick = () => app.addMember(n.id), d.appendChild(dv);
      }
    }), h || (d.innerHTML = '<div style="padding:10px;color:var(--text-muted);font-size:0.9rem;">No other Nomis available.</div>'), 
    d.classList.add("open");
  }
  addMember(id) {
    this.data.groups.find(x => x.id === this.currentGroupId).members.push({
      id: id,
      role: ""
    }), this.saveToDB(), this.renderGroupMembers(), document.getElementById("memberOptions").classList.remove("open");
  }
  removeMember(id) {
    const g = this.data.groups.find(x => x.id === this.currentGroupId);
    g.members = g.members.filter(m => m.id !== id), this.saveToDB(), this.renderGroupMembers();
  }
  updateMemberRole(id, val) {
    const m = this.data.groups.find(x => x.id === this.currentGroupId).members.find(x => x.id === id);
    m && (m.role = val, this.saveToDB());
  }
  toggleMemberRoleEdit(id, show) {
    if (show) {
      document.querySelectorAll(".member-role-edit.active").forEach(el => {
        const otherId = el.id.split("role_edit_")[1];
        otherId && otherId != id && this.cancelMemberRole(otherId);
      });
    }
    const disp = document.getElementById(`role_disp_${id}`), edit = document.getElementById(`role_edit_${id}`), input = document.getElementById(`role_input_${id}`);
    show ? (disp.style.display = "none", edit.classList.add("active"), setTimeout(() => input.focus(), 50)) : (disp.style.display = "flex", 
    edit.classList.remove("active"));
  }
  saveMemberRole(id) {
    const m = this.data.groups.find(x => x.id === this.currentGroupId).members.find(x => x.id === id), input = document.getElementById(`role_input_${id}`);
    m && (m.role = input.value, this.saveToDB(), this.renderGroupMembers());
  }
  cancelMemberRole(id) {
    const m = this.data.groups.find(x => x.id === this.currentGroupId).members.find(x => x.id === id);
    document.getElementById(`role_input_${id}`).value = m.role || "", this.toggleMemberRoleEdit(id, !1);
  }
  renderGroupSections() {
    const c = document.getElementById("groupSectionsContainer");
    c.innerHTML = "";
    const g = this.data.groups.find(x => x.id === this.currentGroupId);
    g.sectionOrder || (g.sectionOrder = [ "backstory" ], (g.custom_sections || []).forEach(cs => g.sectionOrder.push(cs.id))), 
    this.isReordering && (c.ondragover = e => app.handleDragOver(e)), g.sectionOrder.forEach(sid => {
      const isBackstory = "backstory" === sid, cust = g.custom_sections ? g.custom_sections.find(cs => cs.id === sid) : null;
      if (!isBackstory && !cust) return;
      const title = isBackstory ? "Group Backstory" : cust.title, content = isBackstory ? g.backstory || "" : cust.content, limit = isBackstory ? 1e3 : 5e3;
      c.insertAdjacentHTML("beforeend", this.renderSectionCard(sid, title, content, limit, !isBackstory, this.isReordering, !0));
    });
  }
  autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    const newHeight = el.scrollHeight;
    el.style.height = newHeight + "px", el.style.overflowY = newHeight > 300 ? "auto" : "hidden";
  }
  toggleCard(c) {
    if (c.classList.toggle("collapsed"), !c.classList.contains("collapsed")) {
      const ta = c.querySelector("textarea");
      this.autoResize(ta);
    }
  }
  deleteNomi() {
    confirm("Delete permanently?") && (this.data.nomis = this.data.nomis.filter(n => n.id !== this.currentNomiId), 
    this.saveToDB(), this.goHome());
  }
  deleteGroup() {
    confirm("Delete Group?") && (this.data.groups = this.data.groups.filter(g => g.id !== this.currentGroupId), 
    this.saveToDB(), this.goHome());
  }
  exportData() {
    const s = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data)), a = document.createElement("a");
    a.href = s, a.download = "nomi_backup.json", document.body.appendChild(a), a.click(), 
    a.remove();
  }
  importData(i) {
    const f = i.files[0];
    if (!f) return;
    const r = new FileReader;
    r.onload = e => {
      try {
        const j = JSON.parse(e.target.result);
        confirm("Overwrite data?") && (this.data = j, this.saveToDB().then(() => {
          alert("Done!"), location.reload();
        }));
      } catch (e) {
        alert("Invalid JSON");
      }
    }, r.readAsText(f);
  }
  processImage(f, mw, cb) {
    if (!f) return;
    const r = new FileReader;
    r.onload = e => {
      const i = new Image;
      i.src = e.target.result, i.onload = () => {
        const c = document.createElement("canvas"), s = mw / i.width;
        c.width = mw, c.height = i.height * s;
        c.getContext("2d").drawImage(i, 0, 0, c.width, c.height), cb(c.toDataURL("image/webp", .8));
      };
    }, r.readAsDataURL(f);
  }
  async optimizeStorage() {
    const btn = document.getElementById("btnOptimize"), originalText = btn.innerText;
    btn.innerText = "Processing... (Do not close)", btn.disabled = !0;
    let count = 0;
    const recompress = b64 => new Promise(resolve => {
      if (!b64 || !b64.startsWith("data:image")) return resolve(b64);
      const img = new Image;
      img.src = b64, img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.naturalWidth, height = img.naturalHeight;
        width > 1024 && (height = 1024 * height / width, width = 1024), canvas.width = width, 
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height), resolve(canvas.toDataURL("image/webp", .8));
      }, img.onerror = () => resolve(b64);
    });
    for (let n of this.data.nomis) if (n.photo && (n.photo = await recompress(n.photo), 
    count++), n.gallery) for (let g of n.gallery) g.img && (g.img = await recompress(g.img), 
    count++);
    for (let g of this.data.groups) if (g.photo && (g.photo = await recompress(g.photo), 
    count++), g.gallery) for (let pic of g.gallery) pic.img && (pic.img = await recompress(pic.img), 
    count++);
    await this.saveToDB(), btn.innerText = "Done! Processed " + count + " images.", 
    this.renderStorageDashboard(), setTimeout(() => {
      btn.innerText = originalText, btn.disabled = !1;
    }, 3e3), alert(`Optimization Complete!\nProcessed ${count} images.\nCheck "Local Data" to see how much space you saved.`);
  }
  deleteAllData() {
    const confirmation = prompt("⚠️ DESTRUCTIVE ACTION ⚠️\n\nThis will permanently delete ALL data, including:\n- All Nomis & Backstories\n- All Groups\n- All Gallery Images\n- All App Settings\n\nThis action cannot be undone.\n\nTo confirm, type 'DELETE EVERYTHING' exactly below:");
    if ("DELETE EVERYTHING" === confirmation) {
      this.db && this.db.close(), localStorage.clear();
      const req = indexedDB.deleteDatabase(DB_NAME);
      try {
        indexedDB.deleteDatabase("NomiArchChatDB");
      } catch {}
      req.onsuccess = () => {
        alert("Reset Complete. The application will now reload."), window.location.reload();
      }, req.onerror = e => {
        console.error("Delete Error:", e), alert("Error deleting database. Please manually clear site data in browser settings.");
      }, req.onblocked = () => {
        alert("Deletion blocked! You have Nomi Manager open in another tab. Please close it and try again.");
      };
    } else null !== confirmation && alert("Confirmation phrase did not match. Data was NOT deleted.");
  }
  addNomiSection() {
    this.addSection();
  }
  addGroupSection() {
    this.addSection();
  }
  setNomiPhoto(b64, id) {
    this.setContextPhoto(b64, id);
  }
  setGroupPhoto(b64, id) {
    this.setContextPhoto(b64, id);
  }
  autoSaveNomi() {
    this.saveCurrentContext();
  }
  autoSaveGroup() {
    this.saveCurrentContext();
  }
  updateGroupSectionContent(id, val) {
    this.handleInput(id, "backstory" === id ? 1e3 : 5e3, "backstory" !== id);
  }
  copyText(id) {
    navigator.clipboard.writeText(document.getElementById(id).value).then(() => this.showToast("Copied!"));
  }
  showToast(message, variant = null, duration = 2200) {
    const t = document.getElementById("toast");
    if (!t) return;
    const msg = String(message ?? "").trim();
    if (!variant) {
      const m = msg.toLowerCase();
      variant = m.includes("failed") || m.includes("error") || m.includes("https required") || m.includes("invalid") ? "error" : m.includes("delete") || m.includes("removed") ? "warning" : m.includes("saved") || m.includes("copied") || m.includes("updated") || m.includes("created") || m.includes("done") ? "success" : "info";
    }
    clearTimeout(this._toastTimer), t.textContent = msg, t.dataset.variant = variant, 
    t.classList.remove("show"), t.offsetWidth, t.classList.add("show"), 0 !== duration && null !== duration && duration !== 1 / 0 ? (this._toastSticky = !1, 
    this._toastTimer = setTimeout(() => {
      t.classList.remove("show");
    }, duration)) : this._toastSticky = !0;
  }
  hideToast() {
    const t = document.getElementById("toast");
    t && (clearTimeout(this._toastTimer), t.classList.remove("show"), this._toastSticky = !1);
  }
  openLightbox(s) {
    s && (document.getElementById("lightboxImg").src = s, document.getElementById("lightbox").classList.add("active"), 
    history.pushState({
      view: "lightbox"
    }, "", "#lightbox"));
  }
  closeLightbox() {
    document.getElementById("lightbox").classList.remove("active"), history.state && "lightbox" === history.state.view && history.back();
  }
}

const app = new NomiApp;

window.app = app, window.onload = () => app.init();