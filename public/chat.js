// DOM Elements
const nicknameModal = document.getElementById('nickname-modal');
const nicknameInput = document.getElementById('nickname-input');
const nicknameSubmit = document.getElementById('nickname-submit');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
const userList = document.getElementById('user-list');
const onlineCount = document.getElementById('online-count');

// Connect to Socket.IO
const socket = io();

// Application State
let nickname = '';

// Event Listeners
nicknameSubmit.addEventListener('click', joinChat);
nicknameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinChat();
});

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Functions
function joinChat() {
    nickname = nicknameInput.value.trim();
    if (nickname) {
        socket.emit('new-user', nickname);
    } else {
        alert('Please enter a valid nickname');
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('send-chat-message', message);
        messageInput.value = '';
    }
    messageInput.focus();
}

function displayMessage(data) {
    const messageDiv = document.createElement('div');
    
    if (data.isSystem) {
        messageDiv.classList.add('message-system');
        messageDiv.textContent = data.message;
    } else {
        const isOwn = data.nickname === nickname;
        messageDiv.classList.add('message', isOwn ? 'message-sent' : 'message-received');
        
        const messageText = document.createElement('div');
        messageText.textContent = data.message;
        
        const messageInfo = document.createElement('div');
        messageInfo.classList.add('message-info');
        
        const timeString = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageInfo.textContent = isOwn 
            ? `You • ${timeString}`
            : `${data.nickname} • ${timeString}`;
        
        messageDiv.appendChild(messageText);
        messageDiv.appendChild(messageInfo);
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateUserList(users) {
    userList.innerHTML = '';
    onlineCount.textContent = `${users.length} online`;
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.classList.add('user-item');
        
        const avatar = document.createElement('div');
        avatar.classList.add('user-avatar');
        avatar.textContent = user.nickname.charAt(0).toUpperCase();
        avatar.style.backgroundColor = getAvatarColor(user.nickname);
        
        const userInfo = document.createElement('div');
        userInfo.classList.add('user-info');
        
        const name = document.createElement('div');
        name.classList.add('user-name');
        name.textContent = user.nickname;
        
        const status = document.createElement('div');
        status.classList.add('user-status');
        status.textContent = `Online • Last active ${formatLastSeen(user.lastActive)}`;
        
        userInfo.appendChild(name);
        userInfo.appendChild(status);
        userItem.appendChild(avatar);
        userItem.appendChild(userInfo);
        userList.appendChild(userItem);
    });
}

function getAvatarColor(name) {
    const colors = [
        '#FF5252', '#FF4081', '#E040FB', '#7C4DFF',
        '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
        '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
        '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

function formatLastSeen(timestamp) {
    if (!timestamp) return 'just now';
    
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) === 1 ? '' : 's'} ago`;
    return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) === 1 ? '' : 's'} ago`;
}

// Socket.IO Events
socket.on('join-success', () => {
    nicknameModal.style.display = 'none';
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
});

socket.on('invalid-nickname', () => {
    alert('Please enter a valid nickname');
});

socket.on('nickname-taken', () => {
    alert('This nickname is already taken. Please choose another one.');
});

socket.on('user-connected', (nickname) => {
    displayMessage({
        message: `${nickname} joined the chat`,
        timestamp: new Date(),
        isSystem: true
    });
});

socket.on('user-disconnected', (nickname) => {
    displayMessage({
        message: `${nickname} left the chat`,
        timestamp: new Date(),
        isSystem: true
    });
});

socket.on('chat-message', (data) => {
    displayMessage(data);
});

socket.on('update-users', (users) => {
    updateUserList(users);
});
