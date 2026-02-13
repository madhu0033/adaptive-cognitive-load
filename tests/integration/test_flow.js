const axios = require('axios');
const io = require('socket.io-client');

// Configuration
const INGEST_URL = 'http://localhost:3000';
const STUDENT_ID = 'test_student_integration';
const SESSION_ID = 'test_session_integration';

console.log('🚀 Starting Integration Test Flow...');

// 1. Connect to Socket.IO to listen for ML results
const socket = io(`${INGEST_URL}/live`, {
    transports: ['websocket'],
    reconnection: false
});

let socketReceived = false;

socket.on('connect', () => {
    console.log('✅ Connected to Socket.IO /live namespace');
    startDataFlow();
});

socket.on('connect_error', (err) => {
    console.error('❌ Socket Connection Error:', err.message);
    process.exit(1);
});

socket.on('load_update', (data) => {
    console.log('🎉 Received load_update event from Socket.IO:');
    console.log(JSON.stringify(data, null, 2));

    if (data.student_id === STUDENT_ID) {
        console.log('✅ Verification Successful: End-to-end flow complete.');
        socketReceived = true;
        socket.disconnect();
        process.exit(0);
    }
});

async function startDataFlow() {
    try {
        const timestamp = Date.now();

        // 2. Send Synthetic Mouse Data
        console.log('📤 Sending synthetic Mouse Data...');
        await axios.post(`${INGEST_URL}/api/telemetry/mouse`, {
            student_id: STUDENT_ID,
            session_id: SESSION_ID,
            events: [
                { ts: timestamp, x: 100, y: 100, dx: 0, dy: 0, speed: 0 },
                { ts: timestamp + 20, x: 120, y: 120, dx: 20, dy: 20, speed: 1.0 },
                { ts: timestamp + 40, x: 140, y: 140, dx: 20, dy: 20, speed: 1.0 },
                { ts: timestamp + 60, x: 140, y: 140, dx: 0, dy: 0, speed: 0 } // Pause
            ]
        });
        console.log('✅ Mouse Data sent.');

        // 3. Send Synthetic Eye Data
        console.log('📤 Sending synthetic Eye Data...');
        await axios.post(`${INGEST_URL}/api/telemetry/eye`, {
            student_id: STUDENT_ID,
            session_id: SESSION_ID,
            window_start: timestamp,
            window_end: timestamp + 5000,
            features: {
                blink_count: 5,
                avg_ear: 0.25,
                gaze_off_frac: 0.3,
                head_movement_std: 0.1
            }
        });
        console.log('✅ Eye Data sent.');

        console.log('⏳ Waiting for socket event (ML prediction)...');

        // Timeout if no event received
        setTimeout(() => {
            if (!socketReceived) {
                console.error('❌ Timeout: Did not receive load_update event within 10 seconds.');
                process.exit(1);
            }
        }, 10000);

    } catch (err) {
        console.error('❌ HTTP Request Failed:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}
