const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const users = {};

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('new-user', (nickname) => {
        if (!nickname || nickname.trim() === '') {
            socket.emit('invalid-nickname');
            return;
        }

        // Check if nickname is already taken
        const nicknameExists = Object.values(users).some(user => user.nickname === nickname);
        if (nicknameExists) {
            socket.emit('nickname-taken');
            return;
        }

        users[socket.id] = {
            nickname,
            status: 'online',
            lastActive: new Date()
        };

        console.log(`User joined: ${nickname} (${socket.id})`);
        socket.emit('join-success');
        io.emit('user-connected', nickname);
        updateOnlineUsers();
    });

    socket.on('send-chat-message', (message) => {
        const user = users[socket.id];
        if (user) {
            io.emit('chat-message', {
                message,
                nickname: user.nickname,
                timestamp: new Date(),
                isSystem: false
            });
        }
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            user.status = 'offline';
            user.lastActive = new Date();
            io.emit('user-disconnected', user.nickname);
            updateOnlineUsers();
            
            setTimeout(() => {
                if (users[socket.id]?.status === 'offline') {
                    delete users[socket.id];
                    updateOnlineUsers();
                }
            }, 30000);
        }
    });

    function updateOnlineUsers() {
        const onlineUsers = Object.values(users)
            .filter(user => user.status === 'online')
            .map(user => ({
                nickname: user.nickname,
                lastActive: user.lastActive
            }));
        io.emit('update-users', onlineUsers);
    }
});

/* const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
*/

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
    const { address } = server.address();
    console.log(`Server running on http://${address}:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    
    // Get local IP address for network access
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIp = 'localhost';
    
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(interface => {
            if (!interface.internal && interface.family === 'IPv4') {
                localIp = interface.address;
            }
        });
    });
    
    console.log(`Network access: http://${localIp}:${PORT}`);
});
