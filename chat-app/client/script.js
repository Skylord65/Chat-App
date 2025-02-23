const socket = io();
const conversationList = document.getElementById('conversationList');
const messages = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const h3username = document.getElementById('h3username');
let currentConversation = 'general';
socket.messages = { general: [], private: {} };

// Gestion de l'identification
const username = prompt('Entrez votre nom :');
socket.emit('login', username);
const h3 = document.createElement('h3');
h3username.textContent = username;

// Mise à jour des conversations
socket.on('user list', (users) => {
    conversationList.innerHTML = '<li data-conversation="general" class="active">Chat Général</li>';
    users.forEach(user => {
        if (user !== username) {
            const li = document.createElement('li');
            li.dataset.conversation = user;
            li.textContent = user;
            conversationList.appendChild(li);
        }
    });
});

socket.on('load messages', (data) => {
    socket.messages.general = data.general || [];
    Object.entries(data.private || {}).forEach(([user, msgs]) => {
        socket.messages[user] = msgs;
    });
    updateMessages();
});

// Gestion des messages
socket.on('general message', (msg) => {
    socket.messages.general.push(msg);
    if (currentConversation === 'general') updateMessages();
    //saveMessages();
});

// Gestion des messages privés
socket.on('private message', (msg) => {
    if (!socket.messages[msg.from]) socket.messages[msg.from] = [];
    if (!socket.messages[msg.to]) socket.messages[msg.to] = [];
    socket.messages[msg.from].push(msg);
    socket.messages[msg.to].push(msg);
    if (currentConversation === msg.from || currentConversation === msg.to) updateMessages();
    //saveMessages();
});

function updateMessages() {
    messages.innerHTML = '';
    const conversationMessages = currentConversation === 'general'
        ? socket.messages.general
        : socket.messages[currentConversation] || [];
    conversationMessages.forEach(msg => {
        const li = document.createElement('li');
        li.textContent = `[${msg.timestamp}] ${msg.from}: ${msg.text}`;
        messages.appendChild(li);
    });
}

// Gestion de l'envoi de messages
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value;
    if (text.trim() === '') return;
    const msg = {
        from: username,
        to: currentConversation,
        text,
        timestamp: new Date().toISOString()
    };
    if (currentConversation === 'general') {
        socket.emit('general message', text);
    } else {
        socket.emit('private message', { to: currentConversation, text });
        // Add the message to the conversation immediately
        if (!socket.messages[currentConversation]) socket.messages[currentConversation] = [];
        socket.messages[currentConversation].push(msg);
        updateMessages();
    }
    messageInput.value = '';
});

conversationList.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
        document.querySelectorAll('#conversationList li').forEach(li => li.classList.remove('active'));
        e.target.classList.add('active');
        currentConversation = e.target.dataset.conversation;
        updateMessages();
    }
});

