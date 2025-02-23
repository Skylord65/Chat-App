const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const path = 'messages.json';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Stockage des données en mémoire (ou chargées depuis un fichier)
let users = {}; // { username: socketId }
let messages = {
    general: [],
    private: {} // { username: [ { from, to, text, timestamp } ] }
};

if (fs.existsSync(path)) {
    messages = JSON.parse(fs.readFileSync(path, 'utf8'));
}

function saveMessages() {
    fs.writeFileSync(path, JSON.stringify(messages, null, 2), 'utf8');
}

// Servir les fichiers statiques du client
app.use(express.static('../client'));

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    console.log('Nouvel utilisateur connecté');

    // Gestion de l'identification de l'utilisateur
    socket.on('login', (username) => {
        users[username] = socket.id;
        socket.username = username;

        // Charger l'historique de l'utilisateur
        const userMessages = messages.private[socket.username] || [];
        const privateMessages = Object.keys(messages.private).reduce((acc, user) => {
            if (user === socket.username || messages.private[user].some(msg => msg.to === socket.username)) {
                acc[user] = messages.private[user];
            }
            return acc;
        }, {});
        socket.emit('load messages', { general: messages.general, private: privateMessages });

        // Envoyer la liste des utilisateurs connectés
        io.emit('user list', Object.keys(users));
});

    // Gestion des messages dans le chat général
    socket.on('general message', (text) => {
        const fullMessage = { from: socket.username, text, timestamp: new Date().toISOString() };
        messages.general.push(fullMessage);
        saveMessages();
        io.emit('general message', fullMessage);
    });

    // Gestion des messages privés
    socket.on('private message', ({ to, text }) => {
        const fullMessage = { from: socket.username, to, text, timestamp: new Date().toISOString() };

        // Enregistrer le message
        if (!messages.private[to]) messages.private[to] = [];
        messages.private[to].push(fullMessage);
        saveMessages();
        if (!messages.private[socket.username]) messages.private[socket.username] = [];
        messages.private[socket.username].push(fullMessage);
        saveMessages();
        // Envoyer au destinataire et au sender
        io.to(users[to]).emit('private message', fullMessage);
        socket.emit('private message', fullMessage);
    });

    // Déconnexion
    socket.on('disconnect', () => {
        console.log(`${socket.username} déconnecté`);
        delete users[socket.username];
        io.emit('user list', Object.keys(users));
    });
});

server.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

