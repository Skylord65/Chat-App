const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

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
        const userMessages = messages.private[username] || {};
        socket.emit('load messages', { general: messages.general, private: userMessages });

        // Envoyer la liste des utilisateurs connectés
        io.emit('user list', Object.keys(users));
    });

    // Gestion des messages dans le chat général
    socket.on('general message', (text) => {
        const fullMessage = { from: socket.username, text, timestamp: new Date().toISOString() };
        messages.general.push(fullMessage);
        io.emit('general message', fullMessage);
    });

    // Gestion des messages privés
    socket.on('private message', ({ to, text }) => {
        const fullMessage = { from: socket.username, to, text, timestamp: new Date().toISOString() };

        // Enregistrer le message
        if (!messages.private[to]) messages.private[to] = [];
        messages.private[to].push(fullMessage);

        if (!messages.private[socket.username]) messages.private[socket.username] = [];
        messages.private[socket.username].push(fullMessage);

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

