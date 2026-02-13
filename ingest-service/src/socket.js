const { Server } = require('socket.io');

let io;

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: '*', // Allow all origins for dev simplicity
                methods: ['GET', 'POST']
            }
        });

        const liveNamespace = io.of('/live');

        liveNamespace.on('connection', (socket) => {
            console.log('🔌 Teacher Dashboard connected:', socket.id);

            socket.on('disconnect', () => {
                console.log('Teacher Dashboard disconnected:', socket.id);
            });
        });

        console.log('✅ Socket.IO initialized (Namespace: /live)');
    },

    broadcast: (event, data) => {
        if (!io) return;
        io.of('/live').emit(event, data);
    }
};
