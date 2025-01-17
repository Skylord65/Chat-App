const socket = io();
const conversationList = document.getElementById('conversationList');
const messages = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

let currentConversation = 'general';
socket.messages = { general: [] };

// Gestion de l'identification
const username = prompt('Entrez votre nom :');
socket.emit('login', username);

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

// Gestion des messages
socket.on('general message', (msg) => {
    socket.messages.general.push(msg);
    if (currentConversation === 'general') updateMessages();
});

socket.on('private message', (msg) => {
    if (!socket.messages[msg.from]) socket.messages[msg.from] = [];
    socket.messages[msg.from].push(msg);
    if (currentConversation === msg.from || currentConversation === msg.to) updateMessages();
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
    if (currentConversation === 'general') {
        socket.emit('general message', text);
    } else {
        socket.emit('private message', { to: currentConversation, text });
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

