import React from 'react';

const API_URL = 'http://localhost:3000/api/telemetry/label';

export default function SelfReportModal({ isOpen, onClose, studentId, sessionId }) {
    if (!isOpen) return null;

    const handleRate = async (label) => {
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    session_id: sessionId,
                    label: label
                })
            });
            alert('Rating submitted! Thank you.');
            onClose();
        } catch (err) {
            console.error('Rating failed:', err);
            alert('Failed to save rating.');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div className="card" style={{
                padding: '2.5rem', textAlign: 'center', maxWidth: '450px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #fff'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                <h2 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>Session Complete</h2>
                <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                    Your feedback helps calibrate the AI. How was the difficulty of the task you just finished?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={() => handleRate('Low')}
                        style={{ backgroundColor: 'var(--status-low)', color: 'var(--status-low-text)', border: '1px solid #dcfce7' }}
                    >
                        Easy & Comfortable
                    </button>

                    <button
                        onClick={() => handleRate('Medium')}
                        style={{ backgroundColor: 'var(--status-med)', color: 'var(--status-med-text)', border: '1px solid #fef9c3' }}
                    >
                        Challenging but Manageable
                    </button>

                    <button
                        onClick={() => handleRate('High')}
                        style={{ backgroundColor: 'var(--status-high)', color: 'var(--status-high-text)', border: '1px solid #fee2e2' }}
                    >
                        Very Difficult / High Load
                    </button>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', boxShadow: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                    >
                        Skip for now
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
