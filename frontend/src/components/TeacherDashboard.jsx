import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS modules
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const SOCKET_URL = 'http://localhost:3000/live';
const MAX_HISTORY = 20; // Keep last 20 windows (~100 seconds)

// -- SVG Icons --
const IconSync = ({ active }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? 'var(--accent-green)' : 'var(--accent-red)' }}><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
)
const IconUser = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
const IconAlert = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
)
const IconSession = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
const IconWaiting = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" /></svg>
)

export default function TeacherDashboard() {
    const [students, setStudents] = useState({}); // { student_id: { latest, history: [], status: 'active' } }
    const [alerts, setAlerts] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });

        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err);
            setIsConnected(false);
        });

        socket.on('load_update', (data) => {
            if (!data.student_id) return;

            setStudents(prev => {
                const student = prev[data.student_id] || { history: [], status: 'active' };
                const newHistory = [...student.history, {
                    score: data.smoothed_score,
                    time: new Date(data.window_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                }].slice(-MAX_HISTORY);

                return {
                    ...prev,
                    [data.student_id]: {
                        ...prev[data.student_id],
                        latest: data,
                        history: newHistory,
                        status: prev[data.student_id]?.status || 'active'
                    }
                };
            });

            // Alerts logic
            if (data.is_alert) {
                setAlerts(prev => {
                    if (!prev.find(a => a.student_id === data.student_id)) {
                        return [...prev, { student_id: data.student_id, ts: Date.now() }];
                    }
                    return prev;
                });
            } else {
                setAlerts(prev => prev.filter(a => a.student_id !== data.student_id));
            }
        });

        socket.on('session_event', (data) => {
            setStudents(prev => {
                if (!prev[data.student_id]) return prev;
                return {
                    ...prev,
                    [data.student_id]: {
                        ...prev[data.student_id],
                        status: data.event
                    }
                };
            });
        });

        return () => socket.disconnect();
    }, []);

    const getStatusTheme = (label, isAlert, sessionStatus) => {
        if (sessionStatus === 'paused' || sessionStatus === 'ended') return { bg: '#f1f5f9', text: '#64748b', chart: '#94a3b8' };
        if (isAlert) return { bg: 'var(--status-high)', text: 'var(--status-high-text)', chart: 'var(--accent-red)' };
        if (label === 'High') return { bg: 'var(--status-high)', text: 'var(--status-high-text)', chart: 'var(--accent-red)' };
        if (label === 'Medium') return { bg: 'var(--status-med)', text: 'var(--status-med-text)', chart: 'var(--accent-yellow)' };
        return { bg: 'var(--status-low)', text: 'var(--status-low-text)', chart: 'var(--accent-green)' };
    };

    return (
        <div style={{ padding: '0 0 2rem 0', animation: 'fadeIn 0.6s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em' }}>Instructor Command Center</h1>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>Real-time student cognitive engagement monitoring.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                        background: 'white', padding: '0.6rem 1.2rem', borderRadius: '12px',
                        boxShadow: 'var(--shadow-sm)', fontSize: '0.8rem', fontWeight: '700',
                        border: '1px solid #f1f5f9'
                    }}>
                        <IconSync active={isConnected} />
                        <span style={{ color: isConnected ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                            {isConnected ? 'LIVE SYNC' : 'OFFLINE'}
                        </span>
                    </div>
                    <div className="card glass" style={{ padding: '0.6rem 1.2rem', border: '1px solid #fff', fontSize: '0.8rem', fontWeight: '700' }}>
                        <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>ACTIVE:</span>
                        <strong>{Object.values(students).filter(s => s.status === 'active' || s.status === 'paused').length}</strong>
                    </div>
                </div>
            </div>

            {/* Alerts Section (Sleek Professional Alert) */}
            {alerts.length > 0 && (
                <div style={{
                    backgroundColor: '#fff1f2',
                    border: '1px solid #fda4af',
                    padding: '1.25rem 1.75rem',
                    borderRadius: '16px',
                    marginBottom: '2.5rem',
                    boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: '#be123c', marginBottom: '1.25rem' }}>
                        <IconAlert />
                        <h3 style={{ margin: 0, color: 'inherit', fontSize: '1.05rem', fontWeight: '700', letterSpacing: '-0.01em' }}>Sustained High Cognitive Load Detected</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {alerts.map(a => (
                            <div key={a.student_id} className="pulse" style={{
                                background: 'white', color: '#be123c',
                                padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem',
                                fontWeight: '700', border: '1px solid #fecaca',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                Student {a.student_id.split('_')[1]}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
                gap: '2.5rem'
            }}>
                {Object.values(students).map(s => (
                    s.latest && <StudentCard key={s.latest.student_id} student={s} theme={getStatusTheme(s.latest.label, s.latest.is_alert, s.status)} />
                ))}

                {Object.keys(students).length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1', padding: '7rem 2rem', textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.4)',
                        border: '2px dashed #e2e8f0', borderRadius: '24px'
                    }}>
                        <div style={{ marginBottom: '1.5rem' }}><IconWaiting /></div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '700' }}>Waiting for pupil telemetry...</h3>
                        <p style={{ maxWidth: '420px', margin: '0 auto', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Data insights will populate here automatically as students initiate their cognitive tracking sessions.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StudentCard({ student, theme }) {
    const { latest, history, status } = student;

    // -- Chart Logic --
    const chartData = {
        labels: history.map(h => h.time),
        datasets: [
            {
                label: 'Cognitive Load',
                data: history.map(h => h.score),
                borderColor: theme.chart,
                backgroundColor: theme.chart === 'var(--accent-red)' ? 'rgba(239, 68, 68, 0.15)' :
                    theme.chart === 'var(--accent-yellow)' ? 'rgba(245, 158, 11, 0.15)' :
                        'rgba(16, 185, 129, 0.15)',
                borderWidth: 3,
                tension: 0.45,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: theme.chart,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                cornerRadius: 12,
                titleFont: { weight: 'bold', size: 14 },
                bodyFont: { size: 13 }
            }
        },
        scales: {
            y: {
                min: 0,
                max: 1.0,
                grid: { display: true, color: '#f1f5f9', drawTicks: false },
                ticks: {
                    stepSize: 0.5,
                    font: { size: 10 },
                    color: '#94a3b8',
                    callback: (val) => val === 1 ? 'HIGH' : val === 0 ? 'LOW' : ''
                }
            },
            x: {
                display: false,
                grid: { display: false }
            }
        },
        animation: { duration: 600, easing: 'easeOutQuart' }
    };

    // -- Feature Breakdown Logic --
    // We derive these roughly from the weights in the ml-service
    const features = latest.features || {};
    const mouseLoad = Math.min(1.0, (features.mouse_avg_speed || 0) / 1.5 + (features.mouse_std_speed || 0) / 1.0);
    const eyeLoad = Math.min(1.0, (features.blink_count || 0) / 4.0 + (0.3 - (features.avg_ear || 0.3)) / 0.1);
    const distraction = features.gaze_off_frac || 0;

    return (
        <div className="card" style={{
            padding: '1.75rem',
            border: `1px solid ${latest.is_alert ? '#fda4af' : '#f1f5f9'}`,
            boxShadow: latest.is_alert ? '0 25px 50px -12px rgba(225, 29, 72, 0.12)' : '0 15px 35px -5px rgba(0, 0, 0, 0.05)',
            opacity: (status === 'active') ? 1 : 0.7,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '24px',
            background: 'white',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                        width: '48px', height: '48px', background: 'var(--primary-soft)',
                        borderRadius: '14px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'var(--primary)',
                        border: '1px solid #e0e7ff'
                    }}><IconUser /></div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.01em' }}>Student {latest.student_id.split('_')[1]}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <div style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: status === 'active' ? 'var(--accent-green)' : '#94a3b8',
                                boxShadow: status === 'active' ? '0 0 8px var(--accent-green)' : 'none'
                            }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {status === 'active' ? 'LIVE NOW' : status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: theme.bg,
                    color: theme.text,
                    fontWeight: '900',
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    {latest.label.toUpperCase()}
                </div>
            </div>

            {/* Main Load Visualization */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke={theme.chart} strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 42 * latest.smoothed_score} 300`}
                            strokeLinecap="round" transform="rotate(-90 50 50)"
                            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', filter: `drop-shadow(0 0 4px ${theme.chart}44)` }} />
                    </svg>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>
                            {(latest.smoothed_score * 100).toFixed(0)}
                        </span>
                        <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-secondary)', marginTop: '2px' }}>LOAD %</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <FeatureBar label="Interaction" value={mouseLoad} color="var(--primary)" />
                    <FeatureBar label="Biometric" value={eyeLoad} color="var(--accent-purple)" />
                    <FeatureBar label="Gaze Offset" value={distraction} color="var(--accent-yellow)" />
                </div>
            </div>

            {/* Time Series Graph - EXPANDED */}
            <div style={{
                height: '180px',
                background: '#fcfdfe',
                borderRadius: '16px',
                padding: '1rem 0.5rem',
                border: '1px solid #f8fafc',
                position: 'relative'
            }}>
                <div style={{ position: 'absolute', top: '8px', left: '12px', fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', zIndex: 5, letterSpacing: '0.04em' }}>
                    ENGAGEMENT TREND (Last 2m)
                </div>
                <Line data={chartData} options={chartOptions} />
            </div>

            {/* Details Footer */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem',
                color: 'var(--text-secondary)', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem',
                fontWeight: '600'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconSession /> <span>Session: <strong>{latest.session_id.split('_')[1]}</strong></span>
                    </div>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <span>WND: {history.length}</span>
                </div>
                <div style={{
                    padding: '4px 10px', borderRadius: '6px', background: '#f8fafc',
                    color: 'var(--text-secondary)', border: '1px solid #f1f5f9', fontSize: '0.65rem'
                }}>
                    STMT: ACTIVE
                </div>
            </div>
        </div>
    );
}

// Helper for minimal feature bars
function FeatureBar({ label, value, color }) {
    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: '800', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                <span>{label.toUpperCase()}</span>
                <span>{(value * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${value * 100}%`, background: color,
                    borderRadius: '10px', transition: 'width 0.8s ease-out'
                }} />
            </div>
        </div>
    );
}

