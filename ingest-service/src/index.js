require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { createServer } = require('http');
const socketLib = require('./socket');
const telemetryRoutes = require('./routes/telemetry');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cognitive-load';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// DB Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Socket.IO Init
socketLib.init(httpServer);

// Routes
app.use('/api/telemetry', telemetryRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ingest-service' });
});

// Start Server
httpServer.listen(PORT, () => {
    console.log(`🚀 Ingest Service running on port ${PORT}`);
});
