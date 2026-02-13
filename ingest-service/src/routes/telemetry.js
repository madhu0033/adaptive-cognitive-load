const express = require('express');
const router = express.Router();
const axios = require('axios');
const socket = require('../socket');
const Telemetry = require('../models/telemetry.model');

let ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000/predict';
if (!ML_SERVICE_URL.endsWith('/predict')) {
    ML_SERVICE_URL += '/predict';
}

// -- Data Aggregation Logic --
const aggregateMouseWindow = (events) => {
    if (!events || events.length === 0) return null;

    let totalSpeed = 0;
    let maxSpeed = 0;
    let idlePoints = 0;
    let totalDistance = 0;

    events.forEach(e => {
        const s = e.speed || 0;
        totalSpeed += s;
        if (s > maxSpeed) maxSpeed = s;
        if (s < 0.1) idlePoints++;
        totalDistance += Math.sqrt((e.dx || 0) ** 2 + (e.dy || 0) ** 2);
    });

    const speeds = events.map(e => e.speed || 0);
    const avgSpeed = totalSpeed / events.length;
    const variance = speeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / events.length;
    const stdSpeed = Math.sqrt(variance);

    return {
        mouse_avg_speed: avgSpeed,
        mouse_std_speed: stdSpeed,
        mouse_idle_frac: idlePoints / events.length,
        mouse_total_dist: totalDistance,
        event_count: events.length
    };
};

// -- Temporal Smoothing State --
const studentHealth = {}; // { student_id: { history: [], highCount: 0, latestFeatures: {} } }
const SMOOTHING_WINDOW = 5;
const ALERT_THRESHOLD = parseInt(process.env.ALERT_THRESHOLD) || 3;

const processAndBroadcast = async (student_id, session_id, window_end, features) => {
    try {
        // --- Feature Synchronization ---
        if (!studentHealth[student_id]) {
            studentHealth[student_id] = {
                current_session_id: session_id,
                history: [],
                highCount: 0,
                lastMouseUpdate: Date.now(),
                latestFeatures: {
                    mouse_avg_speed: 0,
                    mouse_std_speed: 0,
                    mouse_idle_frac: 0,
                    blink_count: 0,
                    avg_ear: 0.3,
                    gaze_off_frac: 0,
                    head_movement_std: 0
                }
            };
        }

        const health = studentHealth[student_id];

        // RESET STATE if Session ID changes (Start of new session)
        if (health.current_session_id !== session_id) {
            console.log(`[Ingest] New Session detected for ${student_id}. Resetting state.`);
            health.current_session_id = session_id;
            health.history = [];
            health.highCount = 0;
            health.lastMouseUpdate = Date.now();
            health.latestFeatures = {
                mouse_avg_speed: 0,
                mouse_std_speed: 0,
                mouse_idle_frac: 0,
                blink_count: 0,
                avg_ear: 0.3,
                gaze_off_frac: 0,
                head_movement_std: 0
            };
        }

        // Merge incoming features into sync cache
        const now = Date.now();

        // Update specific feature sets and their timestamps
        if (features.mouse_avg_speed !== undefined) {
            health.latestFeatures = { ...health.latestFeatures, ...features };
            health.lastMouseUpdate = now;
        } else {
            // It's an eye update or other
            health.latestFeatures = { ...health.latestFeatures, ...features };
            // Do not update lastMouseUpdate
        }

        // Check for stale mouse data (older than 5s - one window)
        if (health.lastMouseUpdate && (now - health.lastMouseUpdate > 5000)) {
            health.latestFeatures.mouse_avg_speed = 0;
            health.latestFeatures.mouse_std_speed = 0;
            health.latestFeatures.mouse_total_dist = 0;
        }

        console.log("SENDING TO ML (SYNCED):", JSON.stringify({
            student_id,
            session_id,
            window_end,
            features: health.latestFeatures
        }, null, 2));

        const mlResponse = await axios.post(ML_SERVICE_URL, {
            student_id,
            session_id,
            window_end,
            features: health.latestFeatures
        });
        const { score, label } = mlResponse.data;

        // --- Smoothing Logic ---
        // 1. Moving Average Score
        health.history.push(score);
        if (health.history.length > SMOOTHING_WINDOW) health.history.shift();
        const smoothedScore = health.history.reduce((a, b) => a + b, 0) / health.history.length;

        // 2. Alert Logic (Consecutive Highs)
        if (label === 'High') {
            health.highCount++;
        } else {
            health.highCount = 0; // Reset on any non-high window
        }
        const isAlert = health.highCount >= ALERT_THRESHOLD;

        // 3. Broadcast
        socket.broadcast('load_update', {
            student_id,
            session_id,
            window_ts: window_end,
            score,
            smoothed_score: smoothedScore,
            label,
            is_alert: isAlert
        });

        console.log(`[ML] Student ${student_id}: ${label} (Raw: ${score.toFixed(2)}, Smooth: ${smoothedScore.toFixed(2)})${isAlert ? ' 🚨 ALERT' : ''}`);
    } catch (err) {
        console.warn(`[ML Error] ${err.message}`);
    }
};

// -- Routes --

router.post('/mouse', async (req, res) => {
    try {
        const { student_id, session_id, events } = req.body;
        if (!student_id || !events) return res.status(400).json({ error: 'Missing fields' });

        // 1. Save to MongoDB
        await Telemetry.create({
            type: 'mouse',
            student_id,
            session_id,
            data: { events }
        });

        // 2. Aggregate & Send
        const features = aggregateMouseWindow(events);
        if (features) {
            processAndBroadcast(student_id, session_id, Date.now(), features);
        }

        res.status(200).json({ status: 'saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

router.post('/eye', async (req, res) => {
    try {
        const { student_id, session_id, window_end, features } = req.body;
        console.log(`[Ingest] Received EYE telemetry for ${student_id}. Features:`, features);
        if (!student_id || !features) return res.status(400).json({ error: 'Missing fields' });

        // 1. Save to MongoDB
        await Telemetry.create({
            type: 'eye',
            student_id,
            session_id,
            data: features,
            window_end
        });

        // 2. Send
        processAndBroadcast(student_id, session_id, window_end || Date.now(), features);

        res.status(200).json({ status: 'processed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

router.post('/label', async (req, res) => {
    try {
        const { student_id, session_id, label } = req.body;
        if (!student_id || !label) return res.status(400).json({ error: 'Missing fields' });

        // Save Label to MongoDB
        await Telemetry.create({
            type: 'label',
            student_id,
            session_id,
            data: { label }, // Store simple string or int
            window_end: Date.now() // Timestamp of the report
        });

        console.log(`[LABEL] Student ${student_id} reported: ${label}`);
        res.status(200).json({ status: 'saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

router.post('/session/event', async (req, res) => {
    try {
        const { student_id, session_id, event } = req.body;
        if (!student_id || !session_id || !event) return res.status(400).json({ error: 'Missing fields' });

        await Telemetry.create({
            type: 'session_event',
            student_id,
            session_id,
            data: { event },
            window_end: Date.now()
        });

        console.log(`[SESSION] Student ${student_id} session ${session_id}: ${event.toUpperCase()}`);

        // Notify Dashboard of session state change
        socket.broadcast('session_event', {
            student_id,
            session_id,
            event,
            ts: Date.now()
        });

        res.status(200).json({ status: 'recorded' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
