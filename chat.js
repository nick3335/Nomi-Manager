const chatManager = {
  currentChat: null,
  messages: {},
  rooms: [],
  typingStatus: {},
  activeNudge: {},
  unreads: {},
  tempRoomPhoto: null,
  bgSyncInterval: null,
  activePollers: {},
  ignoreList: new Set,
  CHAT_DB_NAME: "NomiArchChatDB",
  CHAT_DB_VERSION: 1,
  _db: null,
  _ready: null,
  _pendingWrites: new Map,
  _flushTimer: null,
  init() {
    if (this._ready) return this._ready;
    this._ready = this._init();
    return this._ready;
  },
  async _init() {
    await this.openChatDB();
    await this.migrateChatLocalStorageToIDB();
    await this.loadChatFromIDB();
    this.updateGlobalBadge();
    if (this.bgSyncInterval) clearInterval(this.bgSyncInterval);
    this.bgSyncInterval = setInterval(() => this.backgroundSync(), 1e4);
  },
  whenReady() {
    return this._ready || Promise.resolve();
  },
  
pickMostRecentChat() {
  const candidates = [];
  if (Array.isArray(this.rooms)) {
    for (const r of this.rooms) {
      if (!r || !r.id) continue;
      candidates.push({ type: "room", id: r.id, ts: this.getLastTimestamp(r.id) });
    }
  }
  if (typeof app !== "undefined" && app?.data?.nomis) {
    for (const n of app.data.nomis) {
      if (!n || !n.uuid) continue;
      candidates.push({ type: "nomi", id: n.uuid, ts: this.getLastTimestamp(n.uuid) });
    }
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const best = candidates.find(c => (c.ts || 0) > 0) || candidates[0];
  return best ? { type: best.type, id: best.id } : null;
},
async openChat() {
  await this.whenReady();

  const modal = document.getElementById("chatModal");
  if (modal) modal.classList.add("active");

  document.getElementById("chatNotification").classList.remove("active");

  // Always default to the chat/room with the latest reply
  const latest = this.pickMostRecentChat();
  if (latest) this.currentChat = latest;

  this.renderNomisList();
  this.fetchAndRenderRooms();

  if (this.currentChat) {
    this.renderChatWindow();
    this.switchTab(this.currentChat.type === "room" ? "rooms" : "nomis");
    this.syncChatHistory(this.currentChat.id, this.currentChat.type, false);
  } else {
    this.renderWelcome();
  }
},
openFromNotification() {
    const toast = document.getElementById("chatNotification");
    const chatId = toast.dataset.chatId;
    const chatType = toast.dataset.chatType;
    toast.classList.remove("active");
    const modal = document.getElementById("chatModal");
    if (modal) modal.classList.add("active");
    this.renderNomisList();
    this.fetchAndRenderRooms();
    if (chatId) {
      if (chatType === "room") {
        this.openRoomChat(chatId);
      } else {
        this.openNomiChat(chatId);
      }
    }
  },
  closeChat() {
    const modal = document.getElementById("chatModal");
    if (modal) modal.classList.remove("active");
    this.currentChat = null;
    this.renderWelcome();
    console.log("closeChat: Checking if app is available...", typeof app);
    if (typeof app !== "undefined") {
      console.log("closeChat: App is available, checking triggerAutoUpload...", typeof app.triggerAutoUpload);
      if (typeof app.triggerAutoUpload === "function") {
        console.log("closeChat: Calling triggerAutoUpload...");
        app.triggerAutoUpload();
      } else {
        console.warn("closeChat: triggerAutoUpload is not a function");
      }
    } else {
      console.warn("closeChat: app is undefined");
    }
  },
  renderWelcome() {
    const chatMain = document.getElementById("chatMain");
    if (chatMain) {
      chatMain.innerHTML = `\n                <div class="chat-welcome">\n                    <div class="chat-welcome-icon">💬</div>\n                    <h3>Select a chat to start messaging</h3>\n                    <p>Choose a Nomi for 1-on-1 chat or create a room for group conversations</p>\n                </div>\n            `;
    }
  },
  switchTab(tab) {
    document.querySelectorAll(".chat-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
    const nList = document.getElementById("nomisList");
    const rList = document.getElementById("roomsList");
    if (nList) nList.style.display = tab === "nomis" ? "block" : "none";
    if (rList) rList.style.display = tab === "rooms" ? "block" : "none";
  },
  startHighFreqPolling(roomId) {
    if (this.activePollers[roomId]) clearTimeout(this.activePollers[roomId]);
    let attempts = 0;
    const maxAttempts = 25;
    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        delete this.activePollers[roomId];
        return;
      }
      await this.syncChatHistory(roomId, "room", true);
      this.activePollers[roomId] = setTimeout(poll, 2e3);
    };
    poll();
  },
  async backgroundSync() {
    const recentRooms = this.rooms.sort((a, b) => this.getLastTimestamp(b.id) - this.getLastTimestamp(a.id)).slice(0, 3);
    for (const room of recentRooms) {
      if (!this.activePollers[room.id]) await this.syncChatHistory(room.id, "room", true);
    }
    const recentNomis = app.data.nomis.filter(n => n.uuid).sort((a, b) => this.getLastTimestamp(b.uuid) - this.getLastTimestamp(a.uuid)).slice(0, 1);
    for (const nomi of recentNomis) await this.syncChatHistory(nomi.uuid, "nomi", true);
  },
  async syncChatHistory(chatId, type, allowNotify) {
    if (this.ignoreList.has(chatId)) return;
    let apiEndpoint = "";
    let localName = "Nomi";
    let contextRoom = null;
    if (type === "room") {
      const room = this.rooms.find(r => r.id === chatId);
      if (!room || !room.cloudId) return;
      apiEndpoint = `rooms/${room.cloudId}/chat?limit=10`;
      localName = room.name;
      contextRoom = room;
    } else {
      const nomi = app.data.nomis.find(n => n.uuid === chatId);
      if (!nomi) return;
      apiEndpoint = `nomis/${chatId}/chat?limit=5`;
      localName = nomi.name;
    }
    try {
      const res = await this.fetchWithProxy(`https://api.nomi.ai/v1/${apiEndpoint}`);
      const data = await res.json();
      const apiMessages = data.messages || data || [];
      if (Array.isArray(apiMessages) && apiMessages.length > 0) {
        const localMsgs = this.messages[chatId] || [];
        const recentLocals = localMsgs.slice(-30);
        let newMessagesFound = false;
        let shouldUpdateNudgeUI = false;
        apiMessages.sort((a, b) => new Date(a.sent).getTime() - new Date(b.sent).getTime());
        apiMessages.forEach(msg => {
          const msgText = msg.messageText || msg.text;
          const msgSender = msg.senderUuid || (type === "nomi" ? chatId : "unknown");
          const msgTime = new Date(msg.sent).getTime();
          const isDuplicate = recentLocals.some(local => local.text === msgText && local.sender === msgSender);
          if (!isDuplicate) {
            this.addMessage(chatId, {
              sender: msgSender,
              text: msgText,
              timestamp: msgTime
            });
            if (type === "room" && this.activeNudge[chatId] === msgSender) {
              delete this.activeNudge[chatId];
              shouldUpdateNudgeUI = true;
            }
            if (allowNotify && msg.senderUuid) {
              let senderName = localName;
              if (type === "room" && contextRoom) {
                const sender = this.getNomiDetails(msg.senderUuid, contextRoom);
                if (sender) senderName = sender.name;
              }
              this.handleIncomingMessage(chatId, senderName, msgText);
            }
            newMessagesFound = true;
          }
        });
        if (newMessagesFound || shouldUpdateNudgeUI) {
          if (this.currentChat && this.currentChat.id === chatId) {
            if (newMessagesFound) this.updateMessagesDisplay();
            if (shouldUpdateNudgeUI) this.updateNudgeBar();
            this.clearUnread(chatId);
          }
          if (type === "room") this.renderRoomsList(); else this.renderNomisList();
        }
      }
    } catch (e) {
      if (e.message && e.message.includes("404")) {
        console.warn(`Blocking broken Chat ID: ${chatId}`);
        this.ignoreList.add(chatId);
      }
    }
  },
  getLastTimestamp(id) {
    const msgs = this.messages[id];
    return msgs && msgs.length > 0 ? msgs[msgs.length - 1].timestamp : 0;
  },
  renderNomisList() {
    const container = document.getElementById("nomisList");
    if (!container) return;
    let nomis = app.data.nomis.filter(n => n.uuid);
    nomis.sort((a, b) => this.getLastTimestamp(b.uuid) - this.getLastTimestamp(a.uuid));
    if (nomis.length === 0) return container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);"><p>No Nomis with API keys found.</p></div>`;
    container.innerHTML = nomis.map(nomi => {
      const lastMsg = this.getLastMessage(nomi.uuid);
      const isActive = this.currentChat?.type === "nomi" && this.currentChat?.id === nomi.uuid;
      const isTyping = this.typingStatus[nomi.uuid];
      const unreadCount = this.unreads[nomi.uuid] || 0;
      return `\n                <div class="chat-list-item ${isActive ? "active" : ""}" onclick="chatManager.openNomiChat('${nomi.uuid}')">\n                    <img src="${nomi.photo || "logo.svg"}" class="chat-list-item-avatar">\n                    <div class="chat-list-item-info">\n                        <div class="chat-list-item-name">${nomi.name}</div>\n                        <div class="chat-list-item-preview" style="${isTyping ? "color:var(--accent); font-style:italic;" : unreadCount > 0 ? "font-weight:bold; color:var(--text-main);" : ""}">\n                            ${isTyping ? "Typing..." : lastMsg ? this.truncate(lastMsg.text, 40) : "Start a conversation..."}\n                        </div>\n                    </div>\n                    ${unreadCount > 0 ? `<div class="unread-dot"></div>` : ""}\n                </div>`;
    }).join("");
  },
  async fetchAndRenderRooms() {
    const apiKey = app.data.settings.apiKey;
    if (!apiKey) {
      this.renderRoomsList();
      return;
    }
    try {
      const response = await this.fetchWithProxy("https://api.nomi.ai/v1/rooms");
      const data = await response.json();
      const apiRooms = data.rooms || data || [];
      if (Array.isArray(apiRooms)) {
        const apiRoomIds = new Set(apiRooms.map(r => r.uuid));
        let dataChanged = false;
        const initialCount = this.rooms.length;
        this.rooms = this.rooms.filter(localRoom => {
          if (localRoom.cloudId && !apiRoomIds.has(localRoom.cloudId)) return false;
          return true;
        });
        if (this.rooms.length !== initialCount) {
          this.saveRooms();
          dataChanged = true;
        }
        apiRooms.forEach(apiRoom => {
          const existingRoom = this.rooms.find(r => r.cloudId === apiRoom.uuid);
          if (apiRoom.nomis && Array.isArray(apiRoom.nomis)) {
            apiRoom.nomis.forEach(member => {
              const localMatch = app.data.nomis.find(n => n.name.trim().toLowerCase() === member.name.trim().toLowerCase());
              if (localMatch && (!localMatch.uuid || localMatch.uuid !== member.uuid)) {
                localMatch.uuid = member.uuid;
                dataChanged = true;
              }
            });
          }
          const membersCache = (apiRoom.nomis || []).map(n => ({
            uuid: n.uuid,
            name: n.name,
            gender: n.gender
          }));
          const memberIds = membersCache.map(m => m.uuid);
          if (!existingRoom) {
            this.rooms.push({
              id: "room_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
              cloudId: apiRoom.uuid,
              name: apiRoom.name,
              note: apiRoom.note || "",
              photo: null,
              backchannelingEnabled: apiRoom.backchannelingEnabled ?? true,
              nomiIds: memberIds,
              membersCache: membersCache,
              created: Date.now()
            });
            dataChanged = true;
          } else {
            if (JSON.stringify(existingRoom.membersCache) !== JSON.stringify(membersCache)) {
              existingRoom.membersCache = membersCache;
              dataChanged = true;
            }
            existingRoom.name = apiRoom.name;
            existingRoom.note = apiRoom.note || "";
            existingRoom.backchannelingEnabled = apiRoom.backchannelingEnabled ?? true;
            existingRoom.nomiIds = memberIds;
          }
        });
        this.saveRooms();
        if (dataChanged) {
          app.saveToDB();
          if (this.currentChat) this.renderChatWindow();
          this.renderRoomsList();
        }
      }
    } catch (error) {
      console.warn("Failed to fetch rooms:", error);
    }
    this.renderRoomsList();
  },
  renderRoomsList() {
    const container = document.getElementById("roomsList");
    if (!container) return;
    this.rooms.sort((a, b) => this.getLastTimestamp(b.id) - this.getLastTimestamp(a.id));
    if (this.rooms.length === 0) return container.innerHTML = `<button class="chat-new-room-btn" onclick="chatManager.showNewRoomModal()">+ New Room</button><div style="padding:20px;text-align:center;color:var(--text-muted);"><p>No rooms found.</p></div>`;
    container.innerHTML = `<button class="chat-new-room-btn" onclick="chatManager.showNewRoomModal()">+ New Room</button>` + this.rooms.map(room => {
      const lastMsg = this.getLastMessage(room.id);
      const isActive = this.currentChat?.type === "room" && this.currentChat?.id === room.id;
      const isTyping = this.typingStatus[room.id];
      const unreadCount = this.unreads[room.id] || 0;
      let avatarHtml;
      if (room.photo) avatarHtml = `<img src="${room.photo}" class="chat-list-item-avatar">`; else avatarHtml = `<div class="letter-avatar">${room.name ? room.name.charAt(0) : "?"}</div>`;
      return `\n                <div class="chat-list-item ${isActive ? "active" : ""}" onclick="chatManager.openRoomChat('${room.id}')">\n                    ${avatarHtml}\n                    <div class="chat-list-item-info">\n                        <div class="chat-list-item-name">${room.name}</div>\n                        <div class="chat-list-item-preview" style="${isTyping ? "color:var(--accent); font-style:italic;" : unreadCount > 0 ? "font-weight:bold; color:var(--text-main);" : ""}">\n                            ${isTyping ? "Typing..." : lastMsg ? this.truncate(lastMsg.text, 40) : `${room.nomiIds.length} members`}\n                        </div>\n                    </div>\n                    ${unreadCount > 0 ? `<div class="unread-dot"></div>` : ""}\n                </div>`;
    }).join("");
  },
  openNomiChat(id) {
    this.currentChat = {
      type: "nomi",
      id: id
    };
    this.clearUnread(id);
    this.renderChatWindow();
    this.renderNomisList();
    this.renderRoomsList();
    this.switchTab("nomis");
    if (window.innerWidth <= 768) document.getElementById("chatSidebar").classList.add("hidden");
    this.syncChatHistory(id, "nomi", false);
  },
  openRoomChat(id) {
    this.currentChat = {
      type: "room",
      id: id
    };
    this.clearUnread(id);
    this.renderChatWindow();
    this.renderRoomsList();
    this.renderNomisList();
    this.switchTab("rooms");
    if (window.innerWidth <= 768) document.getElementById("chatSidebar").classList.add("hidden");
    this.syncChatHistory(id, "room", false);
  },
  getNomiDetails(uuidOrName, currentRoom) {
    if (!uuidOrName) return null;
    const query = uuidOrName.toLowerCase().trim();
    let match = app.data.nomis.find(n => n.uuid && n.uuid.toLowerCase() === query);
    if (match) return match;
    match = app.data.nomis.find(n => n.name.toLowerCase() === query);
    if (match) return match;
    if (currentRoom && currentRoom.membersCache) {
      let cached = currentRoom.membersCache.find(m => m.uuid.toLowerCase() === query);
      if (!cached) cached = currentRoom.membersCache.find(m => m.name.toLowerCase() === query);
      if (cached) {
        const globalMatch = app.data.nomis.find(n => n.name.toLowerCase() === cached.name.toLowerCase());
        if (globalMatch) return globalMatch;
        return {
          name: cached.name,
          photo: null
        };
      }
    }
    return null;
  },
  buildNudgeItemsHTML(roomId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return "";
    const nudgingNomiId = this.activeNudge[roomId];
    return room.nomiIds.map(nid => {
      const n = this.getNomiDetails(nid, room);
      if (!n) return "";
      let picHtml;
      if (n.photo) picHtml = `<img src="${n.photo}">`; else picHtml = `<div class="nudge-letter-avatar">${n.name[0]}</div>`;
      let itemClass = "chat-nudge-item";
      if (nudgingNomiId) {
        if (nid === nudgingNomiId) itemClass += " active"; else itemClass += " blurred";
      }
      return `\n                <div class="${itemClass}" onclick="chatManager.nudgeNomi('${roomId}', '${nid}')" title="Nudge ${n.name}">\n                    <div class="nudge-avatar-wrapper">${picHtml}</div>\n                    <div class="chat-nudge-name">${n.name}</div>\n                </div>`;
    }).join("");
  },
  updateNudgeBar() {
    const container = document.querySelector(".chat-nudge-bar");
    if (container && this.currentChat && this.currentChat.type === "room") {
      container.innerHTML = this.buildNudgeItemsHTML(this.currentChat.id);
    }
  },
  renderChatWindow() {
    const chatMain = document.getElementById("chatMain");
    if (!this.currentChat || !chatMain) return this.renderWelcome();
    const {type: type, id: id} = this.currentChat;
    let headerTitle = "", headerSub = "", avatarSrc = "", actionsHtml = "", nudgeBarHtml = "";
    if (type === "nomi") {
      const nomi = app.data.nomis.find(n => n.uuid === id);
      if (!nomi) return;
      headerTitle = nomi.name;
      headerSub = "1-on-1 Chat";
      avatarSrc = `<img src="${nomi.photo || "logo.svg"}" class="chat-header-avatar">`;
    } else {
      const room = this.rooms.find(r => r.id === id);
      if (!room) return;
      headerTitle = room.name;
      headerSub = `${room.nomiIds.length} members`;
      if (room.photo) avatarSrc = `<img src="${room.photo}" class="chat-header-avatar">`; else avatarSrc = `<div class="header-letter-avatar">${room.name ? room.name.charAt(0) : "?"}</div>`;
      actionsHtml = `<button class="chat-header-btn" onclick="chatManager.showEditRoomModal('${id}')">⚙️</button>`;
      nudgeBarHtml = `<div class="chat-nudge-bar">${this.buildNudgeItemsHTML(id)}</div>`;
    }
    chatMain.innerHTML = `\n            <div class="chat-header">\n                <button class="chat-header-btn chat-back-btn" onclick="document.getElementById('chatSidebar').classList.remove('hidden')" style="display:${window.innerWidth <= 768 ? "flex" : "none"};margin-right:10px;">←</button>\n                <div class="chat-header-left">\n                    ${avatarSrc}\n                    <div class="chat-header-info"><div class="chat-header-name">${headerTitle}</div><div class="chat-header-status">${headerSub}</div></div>\n                </div>\n                <div class="chat-header-actions">${actionsHtml}</div>\n            </div>\n            <div class="chat-messages" id="chatMessages">${this.renderMessages(id)}</div>\n            <div class="chat-input-container">\n                ${nudgeBarHtml}\n                <div class="chat-input-wrapper">\n                    <textarea class="chat-input" id="chatInput" placeholder="Type..." onkeydown="chatManager.handleKeyDown(event)"></textarea>\n                    <button class="chat-send-btn" onclick="chatManager.sendMessage()">➤</button>\n                </div>\n            </div>`;

const ta = document.getElementById("chatInput");
if (ta) ta.addEventListener("input", function() {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 150) + "px";
});

if (!this._renderedMsgCount) this._renderedMsgCount = {};
this._renderedMsgCount[id] = (this.messages[id] || []).length;

// Jump to bottom BEFORE the user sees the top of the thread
const msgEl = document.getElementById("chatMessages");
if (msgEl) {
  msgEl.style.visibility = "hidden";
  msgEl.scrollTop = msgEl.scrollHeight;
  requestAnimationFrame(() => {
    this.scrollToBottom();
    msgEl.style.visibility = "visible";
  });
}
  },
  renderMessages(key) {
    let html = "";
    const msgs = this.messages[key] || [];
    if (msgs.length === 0 && !this.typingStatus[key]) {
      html = `<div style="text-align:center;padding:40px;opacity:0.5;">No messages yet.</div>`;
    } else {
      const currentRoom = this.rooms.find(r => r.id === key);
      const chatPartner = !currentRoom ? app.data.nomis.find(n => n.uuid === key) : null;
      html = msgs.map(msg => {
        const isUser = msg.sender === "user";
        let name = "Nomi";
        let picHtml = `<img src="logo.svg" class="chat-message-avatar">`;
        if (isUser) {
          name = "You";
          picHtml = `<img src="logo.svg" class="chat-message-avatar">`;
        } else {
          let nomi = this.getNomiDetails(msg.sender, currentRoom);
          if (!nomi && chatPartner) nomi = chatPartner;
          if (nomi) {
            name = nomi.name;
            if (nomi.photo) picHtml = `<img src="${nomi.photo}" class="chat-message-avatar">`; else picHtml = `<div class="chat-message-avatar" style="background:var(--accent);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:1.2rem;">${name[0]}</div>`;
          }
        }
        return `<div class="chat-message ${isUser ? "user" : ""}">${picHtml}<div class="chat-message-content"><div class="chat-message-header"><span class="chat-message-name">${name}</span><span class="chat-message-time">${this.formatTime(msg.timestamp)}</span></div><div class="chat-message-bubble">${this.formatMessageText(msg.text)}</div></div></div>`;
      }).join("");
    }
    if (this.typingStatus[key]) {
      html += `<div class="chat-message" id="typingIndicator"><div class="chat-message-content"><div class="typing-indicator-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>`;
    }
    return html;
  },
  async sendMessage() {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text || this.isTyping) return;
    const {type: type, id: id} = this.currentChat;
    this.addMessage(id, {
      sender: "user",
      text: text,
      timestamp: Date.now()
    });
    input.value = "";
    input.style.height = "auto";
    if (type === "nomi") this.setTyping(id, true);
    this.updateMessagesDisplay();
    if (type === "nomi") this.renderNomisList(); else this.renderRoomsList();
    try {
      const endpoint = type === "nomi" ? `nomis/${id}/chat` : `rooms/${this.rooms.find(r => r.id === id).cloudId}/chat`;
      const res = await this.fetchWithProxy(`https://api.nomi.ai/v1/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: app.data.settings.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messageText: text
        })
      });
      const data = await res.json();
      this.setTyping(id, false);
      if (data.replyMessage) {
        const replyText = data.replyMessage.text;
        const senderUuid = data.replyMessage.senderUuid || "unknown";
        this.addMessage(id, {
          sender: senderUuid,
          text: replyText,
          timestamp: Date.now()
        });
        this.updateMessagesDisplay();
        let senderName = "Nomi";
        const senderNomi = this.getNomiDetails(senderUuid, this.rooms.find(r => r.id === id));
        if (!senderNomi && type === "nomi") {
          const partner = app.data.nomis.find(n => n.uuid === id);
          if (partner) senderName = partner.name;
        } else if (senderNomi) {
          senderName = senderNomi.name;
        }
        this.handleIncomingMessage(id, senderName, replyText);
      }
      if (type === "room") this.startHighFreqPolling(id);
    } catch (e) {
      this.setTyping(id, false);
      this.updateMessagesDisplay();
      alert("Send failed: " + e.message);
    }
  },
  async nudgeNomi(roomId, nomiUuid) {
    if (this.typingStatus[roomId]) return;
    this.setTyping(roomId, true);
    this.activeNudge[roomId] = nomiUuid;
    this.updateNudgeBar();
    try {
      const room = this.rooms.find(r => r.id === roomId);
      const res = await this.fetchWithProxy(`https://api.nomi.ai/v1/rooms/${room.cloudId}/chat/request`, {
        method: "POST",
        headers: {
          Authorization: app.data.settings.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nomiUuid: nomiUuid
        })
      });
      const data = await res.json();
      this.setTyping(roomId, false);
      delete this.activeNudge[roomId];
      this.updateNudgeBar();
      if (data.replyMessage) {
        const replyText = data.replyMessage.text;
        const senderUuid = data.replyMessage.senderUuid || nomiUuid;
        this.addMessage(roomId, {
          sender: senderUuid,
          text: replyText,
          timestamp: Date.now()
        });
        this.updateMessagesDisplay();
        let senderName = "Nomi";
        const senderNomi = this.getNomiDetails(senderUuid, room);
        if (senderNomi) senderName = senderNomi.name;
        this.handleIncomingMessage(roomId, senderName, replyText);
      }
      this.startHighFreqPolling(roomId);
    } catch (e) {
      this.setTyping(roomId, false);
      delete this.activeNudge[roomId];
      this.updateNudgeBar();
      console.error(e);
    }
  },
  handleIncomingMessage(chatId, senderName, text) {
    const modal = document.getElementById("chatModal");
    const isVisible = modal && modal.classList.contains("active");
    if (isVisible && this.currentChat && this.currentChat.id === chatId) return;
    this.addUnread(chatId);
    this.showNotification(senderName, text, chatId);
    this.renderNomisList();
    this.renderRoomsList();
  },
  addUnread(id) {
    if (!this.unreads[id]) this.unreads[id] = 0;
    this.unreads[id]++;
    this.saveUnreads();
    this.updateGlobalBadge();
  },
  clearUnread(id) {
    if (this.unreads[id]) {
      delete this.unreads[id];
      this.saveUnreads();
      this.updateGlobalBadge();
      this.renderNomisList();
      this.renderRoomsList();
    }
  },
  updateGlobalBadge() {
    const total = Object.values(this.unreads).reduce((a, b) => a + b, 0);
    const el = document.getElementById("chatTotalBadge");
    if (el) {
      el.textContent = total > 99 ? "99+" : total;
      el.style.display = total > 0 ? "flex" : "none";
    }
  },
  showNotification(title, text, chatId) {
    const toast = document.getElementById("chatNotification");
    const img = document.getElementById("notifAvatar");
    const tTitle = document.getElementById("notifTitle");
    let avatarSrc = "logo.svg";
    const nomi = app.data.nomis.find(n => n.name === title || n.uuid === chatId);
    if (nomi && nomi.photo) avatarSrc = nomi.photo;
    const room = this.rooms.find(r => r.id === chatId);
    if (room && room.photo) avatarSrc = room.photo;
    img.src = avatarSrc;
    tTitle.textContent = title;
    toast.dataset.chatId = chatId;
    toast.dataset.chatType = room ? "room" : "nomi";
    toast.classList.add("active");
    setTimeout(() => {
      toast.classList.remove("active");
    }, 4e3);
  },
  setTyping(id, status) {
    this.typingStatus[id] = status;
    this.renderNomisList();
    this.renderRoomsList();
    if (this.currentChat && this.currentChat.id === id) {
      this.updateMessagesDisplay();
    }
  },
  handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  },
  handleRoomPhoto(input, mode) {
    const file = input.files[0];
    if (!file) return;
    const previewId = mode === "new" ? "newRoomPhotoPreview" : "editRoomPhotoPreview";
    const placeholderId = mode === "new" ? "newRoomPhotoPlaceholder" : "editRoomPhotoPlaceholder";
    const reader = new FileReader;
    reader.onload = e => {
      const img = new Image;
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 150;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const b64 = canvas.toDataURL("image/webp", .8);
        this.tempRoomPhoto = b64;
        const prevEl = document.getElementById(previewId);
        const placeEl = document.getElementById(placeholderId);
        if (prevEl) {
          prevEl.src = b64;
          prevEl.style.display = "block";
        }
        if (placeEl) {
          placeEl.style.display = "none";
        }
      };
    };
    reader.readAsDataURL(file);
  },
  showNewRoomModal() {
    const m = document.getElementById("newRoomModal");
    if (m) m.classList.add("active");
    document.getElementById("newRoomName").value = "";
    document.getElementById("newRoomNote").value = "";
    const bc = document.getElementById("newRoomBackchannel");
    if (bc) bc.checked = true;
    this.renderCheckboxes("newRoomNomisList", []);
    this.tempRoomPhoto = null;
    document.getElementById("newRoomPhotoPreview").style.display = "none";
    document.getElementById("newRoomPhotoPlaceholder").style.display = "block";
    document.getElementById("newRoomPhotoInput").value = "";
  },
  closeNewRoomModal() {
    document.getElementById("newRoomModal").classList.remove("active");
  },
  showEditRoomModal(roomId) {
    const room = this.rooms.find(r => r.id === roomId);
    const modal = document.getElementById("editRoomModal");
    modal.dataset.roomId = roomId;
    modal.classList.add("active");
    document.getElementById("editRoomName").value = room.name;
    document.getElementById("editRoomNote").value = room.note || "";
    const bc = document.getElementById("editRoomBackchannel");
    if (bc) bc.checked = room.backchannelingEnabled !== false;
    this.renderCheckboxes("editRoomNomisList", room.nomiIds);
    this.tempRoomPhoto = room.photo || null;
    const prevEl = document.getElementById("editRoomPhotoPreview");
    const placeEl = document.getElementById("editRoomPhotoPlaceholder");
    const input = document.getElementById("editRoomPhotoInput");
    if (room.photo) {
      prevEl.src = room.photo;
      prevEl.style.display = "block";
      placeEl.style.display = "none";
    } else {
      prevEl.style.display = "none";
      placeEl.style.display = "block";
    }
    input.value = "";
  },
  closeEditRoomModal() {
    document.getElementById("editRoomModal").classList.remove("active");
  },
  renderCheckboxes(containerId, selectedIds) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const nomis = app.data.nomis.filter(n => n.uuid);
    container.innerHTML = nomis.map(n => {
      const isSel = selectedIds.includes(n.uuid);
      return `<div class="new-room-nomi-item ${isSel ? "selected" : ""}" onclick="this.classList.toggle('selected')" data-uuid="${n.uuid}"><div class="new-room-nomi-checkbox"></div><img src="${n.photo || "logo.svg"}" class="new-room-nomi-avatar"><div class="new-room-nomi-name">${n.name}</div></div>`;
    }).join("");
  },
  async createRoom() {
    const name = document.getElementById("newRoomName").value.trim();
    const note = document.getElementById("newRoomNote").value.trim();
    const bcEnabled = document.getElementById("newRoomBackchannel").checked;
    const selectedEls = document.querySelectorAll("#newRoomNomisList .new-room-nomi-item.selected");
    const uuids = Array.from(selectedEls).map(el => el.dataset.uuid);
    if (!name || uuids.length < 1) return alert("Enter name and select 1+ Nomi");
    const payload = {
      name: name,
      nomiUuids: uuids,
      backchannelingEnabled: bcEnabled,
      note: note
    };
    try {
      const res = await this.fetchWithProxy("https://api.nomi.ai/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const createdRoom = data.room || data;
      if (!createdRoom.uuid) throw new Error("Invalid UUID");
      this.rooms.push({
        id: "room_" + Date.now(),
        cloudId: createdRoom.uuid,
        name: createdRoom.name,
        note: createdRoom.note || "",
        photo: this.tempRoomPhoto,
        backchannelingEnabled: createdRoom.backchannelingEnabled ?? bcEnabled,
        nomiIds: uuids,
        created: Date.now()
      });
      this.saveRooms();
      this.renderRoomsList();
      this.closeNewRoomModal();
      app.showToast("Room Created!");
    } catch (e) {
      alert("Create Failed: " + e.message);
    }
  },
  async updateRoom() {
    const modal = document.getElementById("editRoomModal");
    const roomId = modal.dataset.roomId;
    const room = this.rooms.find(r => r.id === roomId);
    const name = document.getElementById("editRoomName").value.trim();
    const note = document.getElementById("editRoomNote").value.trim();
    const bcEnabled = document.getElementById("editRoomBackchannel").checked;
    const selectedEls = document.querySelectorAll("#editRoomNomisList .new-room-nomi-item.selected");
    const uuids = Array.from(selectedEls).map(el => el.dataset.uuid);
    if (!name || uuids.length < 1) return alert("Invalid data");
    const payload = {
      name: name,
      nomiUuids: uuids,
      backchannelingEnabled: bcEnabled
    };
    if (note !== (room.note || "")) payload.note = note;
    try {
      await this.fetchWithProxy(`https://api.nomi.ai/v1/rooms/${room.cloudId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      room.name = name;
      room.note = note;
      room.photo = this.tempRoomPhoto;
      room.nomiIds = uuids;
      room.backchannelingEnabled = bcEnabled;
      this.saveRooms();
      this.renderRoomsList();
      this.closeEditRoomModal();
      if (this.currentChat?.id === roomId) this.renderChatWindow();
      app.showToast("Room Updated!");
    } catch (e) {
      alert("Update Failed: " + e.message);
    }
  },
  async deleteRoom() {
    if (!confirm("Delete this room?")) return;
    const roomId = document.getElementById("editRoomModal").dataset.roomId;
    const room = this.rooms.find(r => r.id === roomId);
    try {
      await this.fetchWithProxy(`https://api.nomi.ai/v1/rooms/${room.cloudId}`, {
        method: "DELETE"
      });
      this.rooms = this.rooms.filter(r => r.id !== roomId);
      this.saveRooms();
      this.renderRoomsList();
      this.closeEditRoomModal();
      if (this.currentChat?.id === roomId) {
        this.currentChat = null;
        this.renderWelcome();
      }
    } catch (e) {
      alert("Delete Failed: " + e.message);
    }
  },
  addMessage(key, msg) {
    if (!this.messages[key]) this.messages[key] = [];
    this.messages[key].push(msg);
    this.saveMessages();
  },
  getLastMessage(key) {
    const m = this.messages[key];
    return m && m.length ? m[m.length - 1] : null;
  },
  updateMessagesDisplay() {
    if (!this.currentChat) return;
    const container = document.getElementById("chatMessages");
    if (!container) return;
    if (!this._renderedMsgCount) this._renderedMsgCount = {};
    const chatId = this.currentChat.id;
    const prevCount = this._renderedMsgCount[chatId] || 0;
    container.innerHTML = this.renderMessages(chatId);
    const msgEls = container.querySelectorAll(".chat-message:not(#typingIndicator)");
    for (let i = prevCount; i < msgEls.length; i++) {
      msgEls[i].classList.add("new");
    }
    this._renderedMsgCount[chatId] = msgEls.length;
    this.scrollToBottom();
  },
  openChatDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.CHAT_DB_NAME, this.CHAT_DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv", {
            keyPath: "key"
          });
        }
      };
      req.onsuccess = () => {
        this._db = req.result;
        resolve(this._db);
      };
      req.onerror = () => reject(req.error);
    });
  },
  _kvGet(key) {
    if (!this._db) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction("kv", "readonly");
      const store = tx.objectStore("kv");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
      req.onerror = () => reject(req.error);
    });
  },
  _queueKVPut(key, value) {
    if (!this._db) {
      try {
        if (key === "rooms") localStorage.setItem("nomi_chat_rooms", JSON.stringify(value));
        if (key === "messages") localStorage.setItem("nomi_chat_messages", JSON.stringify(value));
        if (key === "unreads") localStorage.setItem("nomi_chat_unreads", JSON.stringify(value));
      } catch {}
      return;
    }
    this._pendingWrites.set(key, value);
    clearTimeout(this._flushTimer);
    this._flushTimer = setTimeout(() => void this._flushKVWrites(), 250);
  },
  _flushKVWrites() {
    if (!this._db || this._pendingWrites.size === 0) return Promise.resolve();
    const entries = Array.from(this._pendingWrites.entries());
    this._pendingWrites.clear();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction("kv", "readwrite");
      const store = tx.objectStore("kv");
      for (const [key, value] of entries) {
        store.put({
          key: key,
          value: value
        });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },
  async loadChatFromIDB() {
    const rooms = await this._kvGet("rooms");
    const messages = await this._kvGet("messages");
    const unreads = await this._kvGet("unreads");
    this.rooms = Array.isArray(rooms) ? rooms : [];
    this.messages = messages && typeof messages === "object" ? messages : {};
    this.unreads = unreads && typeof unreads === "object" ? unreads : {};
  },
  async migrateChatLocalStorageToIDB() {
    const migrated = await this._kvGet("migrated_v1");
    if (migrated) return;
    let didMigrate = false;
    try {
      const r = localStorage.getItem("nomi_chat_rooms");
      const m = localStorage.getItem("nomi_chat_messages");
      const u = localStorage.getItem("nomi_chat_unreads");
      if (r) {
        this._queueKVPut("rooms", JSON.parse(r));
        didMigrate = true;
      }
      if (m) {
        this._queueKVPut("messages", JSON.parse(m));
        didMigrate = true;
      }
      if (u) {
        this._queueKVPut("unreads", JSON.parse(u));
        didMigrate = true;
      }
    } catch {}
    this._queueKVPut("migrated_v1", true);
    await this._flushKVWrites();
    if (didMigrate) {
      try {
        localStorage.removeItem("nomi_chat_rooms");
        localStorage.removeItem("nomi_chat_messages");
        localStorage.removeItem("nomi_chat_unreads");
      } catch {}
    }
  },
  saveRooms() {
    this._queueKVPut("rooms", this.rooms);
  },
  loadRooms() {},
  saveMessages() {
    this._queueKVPut("messages", this.messages);
  },
  loadMessages() {},
  saveUnreads() {
    this._queueKVPut("unreads", this.unreads);
  },
  loadUnreads() {},
  scrollToBottom() {
    const d = document.getElementById("chatMessages");
    if (d) d.scrollTop = d.scrollHeight;
  },
  async fetchWithProxy(url, opts = {}) {
    const proxy = "https://nomi-proxy.nickszumila.workers.dev/?url=";
    if (!opts.headers) opts.headers = {};
    if (!opts.headers["Authorization"]) opts.headers["Authorization"] = app.data.settings.apiKey;
    const res = await fetch(proxy + encodeURIComponent(url), opts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    return res;
  },
  formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  },
  formatMessageText(txt) {
    const div = document.createElement("div");
    div.textContent = txt;
    let safe = div.innerHTML;
    safe = safe.replace(/\n/g, "<br>");
    safe = safe.replace(/\*(.*?)\*/g, "<em>*$1*</em>");
    safe = safe.replace(/\((.*?)\)/g, "<em>*$1*</em>");
    return safe;
  },
  truncate(txt, len) {
    return txt.length > len ? txt.substring(0, len) + "..." : txt;
  }
};

window.chatManager = chatManager;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => chatManager.init()); else chatManager.init();