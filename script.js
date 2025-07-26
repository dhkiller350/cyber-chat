class CyberChat {
    constructor() {
        this.socket = io();
        this.currentUser = '';
        this.currentRoom = '';
        this.messageHistory = [];
        this.startTime = Date.now();
        this.messageCount = 0;
        this.typingUsers = new Set();
        this.isCommandMode = false;
        this.lastPingTime = 0;
        this.latency = 0;

        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketEvents();
        this.startHUDUpdates();
    }

    initializeElements() {
        // Screen elements
        this.loginScreen = document.getElementById('loginScreen');
        this.roomScreen = document.getElementById('roomScreen');
        this.chatScreen = document.getElementById('chatScreen');

        // Login elements
        this.usernameInput = document.getElementById('usernameInput');
        this.enterMatrixBtn = document.getElementById('enterMatrixBtn');

        // Room selection elements
        this.currentUserSpan = document.getElementById('currentUser');
        this.roomInput = document.getElementById('roomInput');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.roomsList = document.getElementById('roomsList');

        // Chat elements
        this.currentRoomSpan = document.getElementById('currentRoom');
        this.userCountSpan = document.getElementById('userCount');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.leaveRoomBtn = document.getElementById('leaveRoomBtn');

        // Audio
        this.notification = document.getElementById('notification');

        // New elements
        this.emojiBtn = document.getElementById('emojiBtn');
        this.commandBtn = document.getElementById('commandBtn');
        this.emojiPicker = document.getElementById('emojiPicker');
        this.closeEmojiBtn = document.getElementById('closeEmojiBtn');
        this.hudOverlay = document.getElementById('hudOverlay');
        this.networkStatus = document.getElementById('networkStatus');
        this.commandSuggestion = document.getElementById('commandSuggestion');
        this.backToMenuBtn = document.getElementById('backToMenuBtn');
        
        // Shop elements
        this.shopBtn = document.getElementById('shopBtn');
        this.effectsShop = document.getElementById('effectsShop');
        this.closeShopBtn = document.getElementById('closeShopBtn');
        this.userCredits = document.getElementById('userCredits');
        this.shopItems = document.getElementById('shopItems');
        this.equippedList = document.getElementById('equippedList');
        this.previewName = document.getElementById('previewName');
        
        // User data
        this.credits = parseInt(localStorage.getItem('cyberCredits') || '100');
        this.ownedEffects = JSON.parse(localStorage.getItem('ownedEffects') || '["default"]');
        this.equippedEffects = JSON.parse(localStorage.getItem('equippedEffects') || '["default"]');
        this.currentCategory = 'effects';
        
        this.shopData = {
            effects: [
                { id: 'default', name: 'DEFAULT', price: 0, description: 'Standard username display', preview: 'USERNAME' },
                { id: 'glow', name: 'CYBER GLOW', price: 50, description: 'Pulsing glow effect around username', preview: 'USERNAME' },
                { id: 'rainbow', name: 'RAINBOW SHIFT', price: 100, description: 'Animated rainbow gradient text', preview: 'USERNAME' },
                { id: 'matrix', name: 'MATRIX CODE', price: 150, description: 'Digital matrix-style flickering', preview: 'USERNAME' },
                { id: 'cyber', name: 'CYBER SCAN', price: 200, description: 'Scanning beam effect with cyan glow', preview: 'USERNAME' },
                { id: 'fire', name: 'FLAME BURST', price: 250, description: 'Flickering fire effect', preview: 'USERNAME' },
                { id: 'ice', name: 'ICE CRYSTAL', price: 300, description: 'Shimmering ice-blue effect', preview: 'USERNAME' }
            ],
            colors: [
                { id: 'green', name: 'MATRIX GREEN', price: 25, description: 'Classic matrix green color', preview: '#00ff00' },
                { id: 'cyan', name: 'CYBER CYAN', price: 25, description: 'Bright cyan color', preview: '#00ffff' },
                { id: 'purple', name: 'NEON PURPLE', price: 50, description: 'Electric purple glow', preview: '#8a2be2' },
                { id: 'gold', name: 'DIGITAL GOLD', price: 75, description: 'Metallic gold shine', preview: '#ffd700' },
                { id: 'red', name: 'DANGER RED', price: 100, description: 'Alert-level red warning', preview: '#ff0040' }
            ],
            animations: [
                { id: 'pulse', name: 'PULSE BEAT', price: 80, description: 'Rhythmic pulsing animation', preview: 'USERNAME' },
                { id: 'shake', name: 'GLITCH SHAKE', price: 120, description: 'Random position glitching', preview: 'USERNAME' },
                { id: 'fade', name: 'PHASE SHIFT', price: 160, description: 'Opacity fading in and out', preview: 'USERNAME' }
            ]
        };
    }

    setupEventListeners() {
        // Login screen
        this.enterMatrixBtn.addEventListener('click', () => this.enterMatrix());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.enterMatrix();
        });

        // Room screen
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        this.backToMenuBtn.addEventListener('click', () => this.backToMainMenu());

        // Chat screen
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());

        // Typing effects
        this.addTypingEffect(this.usernameInput);
        this.addTypingEffect(this.roomInput);
        this.addTypingEffect(this.messageInput);

        // New feature buttons
        this.emojiBtn.addEventListener('click', () => this.toggleEmojiPicker());
        this.commandBtn.addEventListener('click', () => this.toggleHUD());
        this.closeEmojiBtn.addEventListener('click', () => this.hideEmojiPicker());

        // Emoji picker
        document.querySelectorAll('.emoji-item').forEach(btn => {
            btn.addEventListener('click', (e) => this.insertEmoji(e.target.textContent));
        });

        // Shop functionality
        this.shopBtn.addEventListener('click', () => this.openShop());
        this.closeShopBtn.addEventListener('click', () => this.closeShop());
        
        // Shop categories
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchCategory(e.target.dataset.category));
        });
        
        // Username preview update
        this.usernameInput.addEventListener('input', () => this.updatePreview());

        // Command detection
        this.messageInput.addEventListener('input', () => this.handleCommandInput());

        // Typing indicator
        let typingTimer;
        this.messageInput.addEventListener('input', () => {
            if (!this.currentRoom) return;

            this.socket.emit('typing', { room: this.currentRoom, username: this.currentUser });
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                this.socket.emit('stopTyping', { room: this.currentRoom, username: this.currentUser });
            }, 1000);
        });
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('[SYSTEM] Connected to matrix server');
            this.updateNetworkStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('[SYSTEM] Disconnected from matrix server');
            this.updateNetworkStatus(false);
            if (this.currentRoom) {
                this.addSystemMessage('Connection lost. Attempting to reconnect...');
            }
        });

        this.socket.on('connect_error', (error) => {
            console.log('[SYSTEM] Connection error:', error);
            this.addSystemMessage('Connection error. Please check your network.');
        });

        this.socket.on('roomList', (rooms) => {
            this.updateRoomsList(rooms);
        });

        this.socket.on('joinedRoom', (data) => {
            this.currentRoom = data.roomId;
            this.currentRoomSpan.textContent = data.roomId.toUpperCase();
            this.userCountSpan.textContent = `${data.userCount} USERS ONLINE`;
            this.isAdmin = data.isAdmin;
            this.isHost = data.isHost;
            
            if (this.isHost) {
                this.currentRoomSpan.textContent += ' [HOST]';
            } else if (this.isAdmin) {
                this.currentRoomSpan.textContent += ' [ADMIN]';
            }
            
            this.showScreen('chatScreen');
            this.clearMessages();
            this.addSystemMessage(`Connection established. Welcome to the matrix.${this.isHost ? ' You are the server host.' : ''}${this.isAdmin ? ' Admin privileges active.' : ''}`);
        });

        this.socket.on('messageHistory', (messages) => {
            messages.forEach(msg => this.displayMessage(msg, false));
            this.scrollToBottom();
        });

        this.socket.on('newMessage', (message) => {
            this.displayMessage(message, true);
            this.scrollToBottom();
            
            // Award credits for active participation
            if (message.username === this.currentUser && message.type === 'user') {
                this.awardCredits(1);
            }
        });

        this.socket.on('error', (error) => {
            this.addSystemMessage(`ERROR: ${error}`);
        });

        this.socket.on('userTyping', (data) => {
            this.showTypingIndicator(data.username);
        });

        this.socket.on('userStoppedTyping', (data) => {
            this.hideTypingIndicator(data.username);
        });

        this.socket.on('pong', () => {
            this.latency = Date.now() - this.lastPingTime;
        });

        this.socket.on('commandResponse', (response) => {
            const messageClass = response.type === 'error' ? 'error-message' : 
                               response.type === 'success' ? 'success-message' : 
                               'system-message';
            
            const message = {
                type: 'system',
                content: response.content,
                timestamp: new Date(),
                username: response.type.toUpperCase()
            };
            
            this.displayMessage(message);
        });

        this.socket.on('kicked', (data) => {
            if (data.type === 'server_kick') {
                this.addSystemMessage(`KICKED FROM SERVER: ${data.reason}`);
                this.addSystemMessage(`You are temporarily blocked for ${Math.floor(data.cooldown / 60000)} minutes.`);
            } else if (data.type === 'cooldown') {
                this.addSystemMessage(`KICK COOLDOWN ACTIVE: ${data.reason}`);
            } else {
                this.addSystemMessage(`You have been kicked: ${data.reason}`);
            }
            
            setTimeout(() => {
                this.showScreen('loginScreen');
                this.currentUser = '';
                this.currentRoom = '';
            }, 3000);
        });

        this.socket.on('banned', (data) => {
            this.addSystemMessage(`PERMANENTLY BANNED: ${data.reason}`);
            this.addSystemMessage(`This server is no longer accessible to you.`);
            
            // Hide server from room list by clearing it
            this.updateRoomsList([]);
            
            setTimeout(() => {
                this.showScreen('loginScreen');
                this.currentUser = '';
                this.currentRoom = '';
                // Prevent further connection attempts
                this.socket.disconnect();
            }, 5000);
        });

        // Ping every 5 seconds for latency
        setInterval(() => {
            this.lastPingTime = Date.now();
            this.socket.emit('ping');
        }, 5000);
    }

    addTypingEffect(input) {
        input.addEventListener('input', () => {
            input.style.textShadow = '0 0 10px #00ff00';
            setTimeout(() => {
                input.style.textShadow = '';
            }, 200);
        });
    }

    enterMatrix() {
        const username = this.usernameInput.value.trim();

        if (!username) {
            this.showError('Username required for matrix entry');
            return;
        }

        if (username.length < 2) {
            this.showError('Username must be at least 2 characters');
            return;
        }

        this.currentUser = username;
        this.currentUserSpan.textContent = username.toUpperCase();
        this.showScreen('roomScreen');
        this.typewriterEffect(this.currentUserSpan, `${username.toUpperCase()}`);
    }

    joinRoom() {
        const roomId = this.roomInput.value.trim();

        if (!roomId) {
            this.showError('Room ID required');
            return;
        }

        if (roomId.length < 1) {
            this.showError('Room ID must be at least 1 character');
            return;
        }

        this.socket.emit('joinRoom', {
            roomId: roomId,
            username: this.currentUser
        });

        this.roomInput.value = '';
    }

    sendMessage() {
        const message = this.messageInput.value.trim();

        if (!message) return;

        if (!this.socket.connected) {
            this.addSystemMessage('Cannot send message: Not connected to server');
            return;
        }

        if (!this.currentRoom) {
            this.addSystemMessage('Cannot send message: Not in a room');
            return;
        }

        if (message.startsWith('/')) {
            this.processCommand(message);
        } else {
            this.socket.emit('sendMessage', message);
            this.messageCount++;
        }

        this.messageInput.value = '';
        this.messageInput.classList.remove('command-mode');
        this.commandSuggestion.style.display = 'none';
        this.isCommandMode = false;
    }

    leaveRoom() {
        this.currentRoom = '';
        this.showScreen('roomScreen');
    }

    backToMainMenu() {
        this.currentUser = '';
        this.currentRoom = '';
        this.usernameInput.value = '';
        this.roomInput.value = '';
        this.showScreen('loginScreen');
        this.addSystemMessage('Returned to main menu');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    updateRoomsList(rooms) {
        if (!this.roomsList) return;

        if (rooms.length === 0) {
            this.roomsList.innerHTML = '<div class="no-rooms">No active rooms found...</div>';
            return;
        }

        this.roomsList.innerHTML = '';

        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                <div class="room-name">${room.id.toUpperCase()}</div>
                <div class="room-users">${room.userCount} USERS</div>
            `;

            roomElement.addEventListener('click', () => {
                this.roomInput.value = room.id;
                this.joinRoom();
            });

            this.roomsList.appendChild(roomElement);
        });
    }

    displayMessage(message, playSound = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}-message`;

        const timestamp = new Date(message.timestamp).toLocaleTimeString();

        if (message.type === 'system') {
            messageElement.innerHTML = `
                <span class="timestamp">[${timestamp}]</span>
                <span class="content">${message.content}</span>
            `;
        } else {
            const styledUsername = this.applyUsernameEffectsToElement(message.username);
            messageElement.innerHTML = `
                <span class="timestamp">[${timestamp}]</span>
                <span class="username ${this.getUsernameClasses(message.username)}">${message.username}:</span>
                <span class="content">${message.content}</span>
            `;
        }

        this.chatMessages.appendChild(messageElement);

        if (playSound && message.username !== this.currentUser) {
            this.playNotification();
        }
    }

    addSystemMessage(content) {
        const message = {
            type: 'system',
            content: content,
            timestamp: new Date(),
            username: 'SYSTEM'
        };
        this.displayMessage(message);
    }

    clearMessages() {
        this.chatMessages.innerHTML = '';
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    playNotification() {
        try {
            this.notification.currentTime = 0;
            this.notification.play().catch(() => {
                // Ignore audio play errors
            });
        } catch (e) {
            // Ignore audio errors
        }
    }

    showError(message) {
        // Create error flash effect
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 64, 0.9);
            color: white;
            padding: 20px;
            border: 2px solid #ff0040;
            border-radius: 5px;
            font-family: 'Fira Code', monospace;
            z-index: 10000;
            animation: errorPulse 0.5s ease-in-out;
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 3000);
    }

    typewriterEffect(element, text) {
        element.textContent = '';
        let i = 0;
        const timer = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(timer);
            }
        }, 100);
    }

    toggleEmojiPicker() {
        const isVisible = this.emojiPicker.style.display !== 'none';
        this.emojiPicker.style.display = isVisible ? 'none' : 'block';
    }

    hideEmojiPicker() {
        this.emojiPicker.style.display = 'none';
    }

    insertEmoji(emoji) {
        this.messageInput.value += emoji;
        this.messageInput.focus();
        this.hideEmojiPicker();
    }

    toggleHUD() {
        const isVisible = this.hudOverlay.style.display !== 'none';
        this.hudOverlay.style.display = isVisible ? 'none' : 'block';
    }

    handleCommandInput() {
        const value = this.messageInput.value;
        const isCommand = value.startsWith('/');

        if (isCommand !== this.isCommandMode) {
            this.isCommandMode = isCommand;
            this.messageInput.classList.toggle('command-mode', isCommand);
            this.commandSuggestion.style.display = isCommand ? 'block' : 'none';
        }

        if (isCommand) {
            const adminCommands = this.isAdmin ? ' /kick /ban /unban /banlist /mute /users' : '';
            const hostCommands = this.isHost ? ' /shutdown' : '';
            this.commandSuggestion.innerHTML = `
                Available commands: /help /time /clear /status /ping${adminCommands}${hostCommands}
            `;
        }
    }

    processCommand(message) {
        const [command, ...args] = message.slice(1).split(' ');

        switch (command.toLowerCase()) {
            case 'help':
                const adminHelp = this.isAdmin ? ' /kick /ban /unban /banlist /mute /users' : '';
                const hostHelp = this.isHost ? ' /shutdown' : '';
                this.addSystemMessage(`Available commands: /help /time /clear /status /ping${adminHelp}${hostHelp} /matrix`);
                break;
            case 'time':
                this.addSystemMessage(`Current time: ${new Date().toLocaleTimeString()}`);
                break;
            case 'clear':
                this.clearMessages();
                break;
            case 'status':
                this.addSystemMessage(`Room: ${this.currentRoom} | Users: ${this.userCountSpan.textContent} | Messages: ${this.messageCount}`);
                break;
            case 'kick':
            case 'ban':
            case 'unban':
            case 'banlist':
            case 'mute':
            case 'users':
            case 'shutdown':
                // These commands are handled server-side
                this.socket.emit('sendMessage', message);
                break;
            case 'ping':
                this.lastPingTime = Date.now();
                this.socket.emit('ping');
                this.addSystemMessage('Pinging server...');
                break;
            case 'matrix':
                this.addSystemMessage('You are already in the Matrix, Neo.');
                break;
            default:
                this.addSystemMessage(`Unknown command: /${command}`);
        }
    }

    showTypingIndicator(username) {
        if (username === this.currentUser) return;

        this.typingUsers.add(username);
        this.updateTypingIndicator();
    }

    hideTypingIndicator(username) {
        this.typingUsers.delete(username);
        this.updateTypingIndicator();
    }

    updateTypingIndicator() {
        const existing = document.querySelector('.typing-indicator');
        if (existing) existing.remove();

        if (this.typingUsers.size === 0) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';

        const users = Array.from(this.typingUsers);
        const text = users.length === 1 
            ? `${users[0]} is typing` 
            : `${users.slice(0, -1).join(', ')} and ${users[users.length - 1]} are typing`;

        typingDiv.innerHTML = `
            <span class="username">${text}</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    updateNetworkStatus(connected) {
        if (this.networkStatus) {
            this.networkStatus.className = `network-status ${connected ? 'connected' : 'disconnected'}`;
            this.networkStatus.innerHTML = `<span>${connected ? '🔗 MATRIX LINK ACTIVE' : '❌ MATRIX LINK DOWN'}</span>`;
        }
    }

    startHUDUpdates() {
        setInterval(() => {
            // Update uptime
            const uptime = Date.now() - this.startTime;
            const minutes = Math.floor(uptime / 60000);
            const seconds = Math.floor((uptime % 60000) / 1000);
            document.getElementById('uptimeValue').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Update other stats
            document.getElementById('latencyValue').textContent = `${this.latency}ms`;
            document.getElementById('messageCount').textContent = this.messageCount.toString();
            document.getElementById('connectionStatus').textContent = 
                this.socket.connected ? 'SECURE' : 'LOST';
        }, 1000);
        
        // Update credits display
        this.updateCreditsDisplay();
        this.updatePreview();
    }

    openShop() {
        this.effectsShop.style.display = 'flex';
        this.updateCreditsDisplay();
        this.renderShopItems();
        this.updateEquippedList();
    }

    closeShop() {
        this.effectsShop.style.display = 'none';
    }

    switchCategory(category) {
        this.currentCategory = category;
        
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        this.renderShopItems();
    }

    renderShopItems() {
        const items = this.shopData[this.currentCategory];
        this.shopItems.innerHTML = '';

        items.forEach(item => {
            const isOwned = this.ownedEffects.includes(item.id);
            const isEquipped = this.equippedEffects.includes(item.id);
            const canAfford = this.credits >= item.price;

            const itemElement = document.createElement('div');
            itemElement.className = `shop-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`;
            
            let statusText = 'BUY';
            let statusClass = 'status-buy';
            
            if (isEquipped) {
                statusText = 'EQUIPPED';
                statusClass = 'status-equipped';
            } else if (isOwned) {
                statusText = 'EQUIP';
                statusClass = 'status-owned';
            } else if (!canAfford) {
                statusText = 'NO CREDITS';
                statusClass = 'status-buy';
                itemElement.style.opacity = '0.5';
            }

            itemElement.innerHTML = `
                <div class="item-name">${item.name}</div>
                <div class="item-preview ${this.currentCategory === 'effects' ? item.id : ''}" 
                     ${this.currentCategory === 'colors' ? `style="color: ${item.preview}"` : ''}>
                    ${item.preview}
                </div>
                <div class="item-description">${item.description}</div>
                <div class="item-price">
                    <span class="price-amount">${item.price}⚡</span>
                    <span class="item-status ${statusClass}">${statusText}</span>
                </div>
            `;

            itemElement.addEventListener('click', () => this.handleItemClick(item));
            this.shopItems.appendChild(itemElement);
        });
    }

    handleItemClick(item) {
        const isOwned = this.ownedEffects.includes(item.id);
        const isEquipped = this.equippedEffects.includes(item.id);

        if (isEquipped) {
            // Unequip item
            this.equippedEffects = this.equippedEffects.filter(id => id !== item.id);
            if (this.equippedEffects.length === 0) {
                this.equippedEffects.push('default');
            }
        } else if (isOwned) {
            // Equip item
            if (this.currentCategory === 'effects') {
                this.equippedEffects = this.equippedEffects.filter(id => 
                    !this.shopData.effects.some(effect => effect.id === id)
                );
                this.equippedEffects.push(item.id);
            } else {
                this.equippedEffects.push(item.id);
            }
        } else if (this.credits >= item.price) {
            // Buy item
            this.credits -= item.price;
            this.ownedEffects.push(item.id);
            
            // Auto-equip new purchases
            this.equippedEffects.push(item.id);
            if (this.currentCategory === 'effects' && item.id !== 'default') {
                this.equippedEffects = this.equippedEffects.filter(id => id !== 'default');
            }
            
            this.saveUserData();
            this.showPurchaseEffect();
        }

        this.saveUserData();
        this.renderShopItems();
        this.updateEquippedList();
        this.updateCreditsDisplay();
        this.updatePreview();
    }

    updateEquippedList() {
        if (this.equippedEffects.length === 0 || 
            (this.equippedEffects.length === 1 && this.equippedEffects[0] === 'default')) {
            this.equippedList.innerHTML = '<div class="no-effects">No effects equipped</div>';
            return;
        }

        this.equippedList.innerHTML = '';
        this.equippedEffects.forEach(effectId => {
            if (effectId === 'default') return;
            
            const effect = this.findEffectById(effectId);
            if (effect) {
                const effectElement = document.createElement('div');
                effectElement.className = 'equipped-effect';
                effectElement.textContent = effect.name;
                effectElement.addEventListener('click', () => {
                    this.equippedEffects = this.equippedEffects.filter(id => id !== effectId);
                    if (this.equippedEffects.length === 0) {
                        this.equippedEffects.push('default');
                    }
                    this.saveUserData();
                    this.updateEquippedList();
                    this.renderShopItems();
                    this.updatePreview();
                });
                this.equippedList.appendChild(effectElement);
            }
        });
    }

    findEffectById(id) {
        for (const category in this.shopData) {
            const item = this.shopData[category].find(item => item.id === id);
            if (item) return item;
        }
        return null;
    }

    updatePreview() {
        const username = this.usernameInput.value.trim() || 'SAMPLE_USER';
        this.previewName.textContent = username.toUpperCase();
        
        // Apply effects
        this.previewName.className = 'preview-name';
        this.equippedEffects.forEach(effectId => {
            if (effectId !== 'default') {
                this.previewName.classList.add(effectId);
            }
        });
        
        // Apply colors
        const colorEffect = this.equippedEffects.find(id => 
            this.shopData.colors.some(color => color.id === id)
        );
        if (colorEffect) {
            const color = this.shopData.colors.find(c => c.id === colorEffect);
            if (color) {
                this.previewName.style.color = color.preview;
            }
        }
    }

    awardCredits(amount) {
        this.credits += amount;
        this.saveUserData();
        this.updateCreditsDisplay();
        
        // Show credit gain effect
        const creditGain = document.createElement('div');
        creditGain.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            color: #ffff00;
            font-family: 'Fira Code', monospace;
            font-size: 12px;
            z-index: 4000;
            animation: creditFloat 2s ease-out forwards;
            pointer-events: none;
        `;
        creditGain.textContent = `+${amount}⚡`;
        document.body.appendChild(creditGain);
        
        setTimeout(() => {
            if (document.body.contains(creditGain)) {
                document.body.removeChild(creditGain);
            }
        }, 2000);
    }

    updateCreditsDisplay() {
        if (this.userCredits) {
            this.userCredits.textContent = this.credits.toString();
        }
    }

    saveUserData() {
        localStorage.setItem('cyberCredits', this.credits.toString());
        localStorage.setItem('ownedEffects', JSON.stringify(this.ownedEffects));
        localStorage.setItem('equippedEffects', JSON.stringify(this.equippedEffects));
    }

    showPurchaseEffect() {
        const effect = document.createElement('div');
        effect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #00ff00;
            font-family: 'Fira Code', monospace;
            font-size: 24px;
            font-weight: bold;
            z-index: 5000;
            text-shadow: 0 0 20px #00ff00;
            animation: purchaseFlash 1s ease-out forwards;
            pointer-events: none;
        `;
        effect.textContent = 'PURCHASE COMPLETE';
        document.body.appendChild(effect);
        
        setTimeout(() => {
            if (document.body.contains(effect)) {
                document.body.removeChild(effect);
            }
        }, 1000);
    }

    applyUsernameEffectsToElement(username) {
        return username;
    }

    getUsernameClasses(username) {
        // Only apply effects to current user's messages
        if (username !== this.currentUser) {
            return '';
        }
        
        let classes = [];
        this.equippedEffects.forEach(effectId => {
            if (effectId !== 'default') {
                const effect = this.findEffectById(effectId);
                if (effect) {
                    classes.push(effectId);
                }
            }
        });
        
        return classes.join(' ');
    }
}

// Add CSS for error animation
const style = document.createElement('style');
style.textContent = `
    @keyframes errorPulse {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    .cyber-btn.small {
        padding: 8px 12px;
        font-size: 12px;
        margin-right: 10px;
    }

    .header-controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .emoji-item {
        background: rgba(0, 255, 0, 0.1);
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 8px;
        cursor: pointer;
        border-radius: 3px;
        font-size: 16px;
        transition: all 0.3s ease;
    }

    .emoji-item:hover {
        background: rgba(0, 255, 0, 0.2);
        transform: scale(1.2);
    }

    @keyframes creditFloat {
        0% {
            opacity: 1;
            transform: translateY(0);
        }
        100% {
            opacity: 0;
            transform: translateY(-50px);
        }
    }

    @keyframes purchaseFlash {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }
        50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
        }
    }

    @keyframes matrixFlicker {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 0.4; }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }

    .username.pulse {
        animation: pulse 1s ease-in-out infinite;
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
    }

    .username.shake {
        animation: shake 0.5s ease-in-out infinite;
    }

    @keyframes fade {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    .username.fade {
        animation: fade 2s ease-in-out infinite;
    }

    .username.green { color: #00ff00 !important; }
    .username.cyan { color: #00ffff !important; }
    .username.purple { color: #8a2be2 !important; }
    .username.gold { color: #ffd700 !important; }
    .username.red { color: #ff0040 !important; }
`;
document.head.appendChild(style);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CyberChat();
});

// Add matrix rain effect
function createMatrixRain() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-2';
    canvas.style.opacity = '0.1';

    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
    const matrixArray = matrix.split("");

    const fontSize = 10;
    const columns = canvas.width / fontSize;
    const drops = [];

    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }

    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    setInterval(draw, 35);
}

// Start matrix rain effect after a delay
setTimeout(createMatrixRain, 1000);