import React from 'react'

export default function ConsentCard({ onAccept }) {
    const handleAccept = () => {
        localStorage.setItem('cognitive_load_consent', 'true')
        onAccept()
    }

    return (
        <div className="card" style={{
            maxWidth: '650px',
            margin: '3rem auto',
            textAlign: 'left',
            borderTop: '5px solid var(--primary)',
            animation: 'fadeIn 0.8s ease-out'
        }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Research Participation & Consent</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.7' }}>
                <p>
                    We are conducting a study to advance <strong>Real-time Cognitive Load Estimation</strong>.
                    By participating, you help us refine AI models that can adapt to human learning needs.
                </p>
                <div style={{
                    background: 'var(--bg-main)',
                    padding: '1.5rem',
                    borderRadius: 'var(--rounded-md)',
                    margin: '1.5rem 0'
                }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontWeight: '600', color: 'var(--text-primary)' }}>Telemetry Data Collected:</p>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                        <li><strong>Inertial Tracking:</strong> Mouse speed, precision, and clicking patterns.</li>
                        <li><strong>Behavioral Features:</strong> Eye blink frequency, gaze stability, and head orientation.</li>
                    </ul>
                </div>
                <p style={{ fontSize: '0.9rem', borderLeft: '3px solid var(--accent-blue)', paddingLeft: '1rem' }}>
                    <strong>Privacy Commitment:</strong> We prioritize your data safety. No raw video or identifiable images
                    are ever stored or transmitted. Only encrypted numeric features are processed on our servers.
                </p>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleAccept}
                    style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '1rem 2rem' }}
                >
                    Agree & Start Learning
                </button>
            </div>
        </div>
    )
}
