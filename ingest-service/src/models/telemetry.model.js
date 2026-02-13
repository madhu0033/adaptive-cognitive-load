const mongoose = require('mongoose');

const RETENTION_SECONDS = parseInt(process.env.DATA_RETENTION_SECONDS) || 60 * 60 * 24 * 7; // Default 7 days

const TelemetrySchema = new mongoose.Schema({
    student_id: { type: String, required: true },
    session_id: { type: String, required: true },
    type: { type: String, required: true, enum: ['mouse', 'eye', 'label', 'session_event'] },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Stores either events or features
    window_start: { type: Number },
    window_end: { type: Number },
    created_at: { type: Date, default: Date.now, expires: RETENTION_SECONDS }
});

module.exports = mongoose.model('Telemetry', TelemetrySchema);
