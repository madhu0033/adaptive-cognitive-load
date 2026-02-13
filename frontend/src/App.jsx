import React, { useState, useEffect } from 'react'
import WebcamTracker from './components/WebcamTracker'
import MouseLogger from './components/MouseLogger'
import TeacherDashboard from './components/TeacherDashboard'
import ConsentCard from './components/ConsentCard'
import SelfReportModal from './components/SelfReportModal'

// -- SVG Icons --
const IconStudent = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
)
const IconTeacher = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11h4M12 7h4M10 15h6M2 20V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v15M2 17h20" /></svg>
)
const IconPlay = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
)
const IconPause = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
)
const IconStop = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
)
const IconIdea = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M15.09 11.23a4.5 4.5 0 0 0 1.41-3.73 4.5 4.5 0 1 0-7.39 3.03A7.5 7.5 0 0 1 7 17h10a7.5 7.5 0 0 1-1.91-5.77z" /></svg>
)

function App() {
    const [view, setView] = useState('student') // 'student' or 'teacher'
    const [hasConsent, setHasConsent] = useState(false)
    const [studentId, setStudentId] = useState('')
    const [sessionId, setSessionId] = useState(`session_${Date.now()}`)
    const [showLabelModal, setShowLabelModal] = useState(false)
    const [sessionStatus, setSessionStatus] = useState('inactive') // 'inactive', 'active', 'paused', 'ended'

    // Load consent from local storage
    useEffect(() => {
        const savedConsent = localStorage.getItem('cognitive_load_consent')
        if (savedConsent === 'true') {
            setHasConsent(true)
            // Generate random ID if not exists, or load from storage
            let savedId = localStorage.getItem('student_id')
            if (!savedId) {
                savedId = `student_${Math.floor(Math.random() * 10000)}`
                localStorage.setItem('student_id', savedId)
            }
            setStudentId(savedId)
        }
    }, [])

    const handleConsent = () => {
        localStorage.setItem('cognitive_load_consent', 'true')
        setHasConsent(true)
        const newId = `student_${Math.floor(Math.random() * 10000)}`
        localStorage.setItem('student_id', newId)
        setStudentId(newId)
    }

    const handleSessionEvent = async (event) => {
        setSessionStatus(event)
        try {
            await fetch('http://localhost:3000/api/telemetry/session/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    session_id: sessionId,
                    event: event
                })
            });
            if (event === 'ended') {
                setShowLabelModal(true);
            }
        } catch (err) {
            console.error('Session event failed:', err);
        }
    }

    const startNewSession = () => {
        setSessionId(`session_${Date.now()}`);
        handleSessionEvent('active');
    }

    return (
        <div className="App" style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            {/* Soft Header */}
            <header style={{
                padding: '1.25rem 2rem',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(12px)',
                background: 'rgba(255, 255, 255, 0.85)',
                borderBottom: '1px solid #f1f5f9'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '36px', height: '36px', background: 'var(--primary)',
                        borderRadius: '10px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'white', fontWeight: 'bold',
                        fontSize: '1.1rem'
                    }}>C</div>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', letterSpacing: '-0.025em' }}>CogniTrack AI</h2>
                </div>

                <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    padding: '4px',
                    borderRadius: '12px',
                    gap: '4px'
                }}>
                    <button
                        onClick={() => setView('student')}
                        style={{
                            padding: '6px 16px',
                            fontSize: '0.85rem',
                            backgroundColor: view === 'student' ? 'white' : 'transparent',
                            color: view === 'student' ? 'var(--primary)' : 'var(--text-secondary)',
                            boxShadow: view === 'student' ? 'var(--shadow-sm)' : 'none',
                            border: 'none', gap: '8px'
                        }}
                    >
                        <IconStudent /> Student View
                    </button>
                    <button
                        onClick={() => setView('teacher')}
                        style={{
                            padding: '6px 16px',
                            fontSize: '0.85rem',
                            backgroundColor: view === 'teacher' ? 'white' : 'transparent',
                            color: view === 'teacher' ? 'var(--primary)' : 'var(--text-secondary)',
                            boxShadow: view === 'teacher' ? 'var(--shadow-sm)' : 'none',
                            border: 'none', gap: '8px'
                        }}
                    >
                        <IconTeacher /> Teacher Dashboard
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
                {view === 'teacher' ? (
                    <TeacherDashboard />
                ) : (
                    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <div>
                                <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', letterSpacing: '-0.035em' }}>Welcome back!</h1>
                                <p style={{ margin: 0, fontSize: '1.05rem' }}>Monitor your cognitive load in real-time to optimize your learning flow.</p>
                            </div>

                            <div className="card glass" style={{
                                padding: '1rem 1.25rem', display: 'flex', gap: '2rem',
                                alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                            }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Session ID</label>
                                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{sessionId.split('_')[1]}</span>
                                </div>
                                <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {sessionStatus === 'inactive' || sessionStatus === 'ended' ? (
                                        <button onClick={startNewSession} style={{ backgroundColor: 'var(--accent-green)', color: 'white', fontSize: '0.85rem' }}>
                                            <IconPlay /> Start
                                        </button>
                                    ) : (
                                        <>
                                            {sessionStatus === 'active' ? (
                                                <button onClick={() => handleSessionEvent('paused')} style={{ backgroundColor: 'var(--accent-yellow)', color: 'white', fontSize: '0.85rem' }}>
                                                    <IconPause /> Pause
                                                </button>
                                            ) : (
                                                <button onClick={() => handleSessionEvent('active')} style={{ backgroundColor: 'var(--accent-green)', color: 'white', fontSize: '0.85rem' }}>
                                                    <IconPlay /> Resume
                                                </button>
                                            )}
                                            <button onClick={() => handleSessionEvent('ended')} style={{ backgroundColor: 'var(--accent-red)', color: 'white', fontSize: '0.85rem' }}>
                                                <IconStop /> Stop
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!hasConsent ? (
                            <ConsentCard onAccept={handleConsent} />
                        ) : (
                            <div style={{
                                maxWidth: '600px',
                                margin: '0 auto',
                                opacity: (sessionStatus === 'active') ? 1 : 0.65,
                                pointerEvents: (sessionStatus === 'active') ? 'auto' : 'none',
                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                filter: (sessionStatus === 'active') ? 'none' : 'grayscale(0.4) blur(1px)'
                            }}>
                                {/* Headless MouseLogger */}
                                <MouseLogger
                                    studentId={studentId}
                                    sessionId={sessionId}
                                    isActive={sessionStatus === 'active'}
                                />

                                {/* Eye Tracking Card (Centered) */}
                                <div className="card" style={{
                                    borderTop: '5px solid var(--primary)',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                                }}>
                                    <WebcamTracker
                                        studentId={studentId}
                                        sessionId={sessionId}
                                        isActive={sessionStatus === 'active'}
                                    />
                                </div>
                            </div>
                        )}

                        {sessionStatus !== 'active' && sessionStatus !== 'inactive' && sessionStatus !== 'ended' && (
                            <div className="pulse" style={{
                                textAlign: 'center',
                                marginTop: '3.5rem',
                                padding: '1.25rem',
                                background: 'white',
                                borderRadius: 'var(--rounded-md)',
                                color: 'var(--accent-yellow)',
                                fontWeight: '600',
                                boxShadow: 'var(--shadow-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <IconIdea /> Session is {sessionStatus.toUpperCase()}. Take a short break!
                            </div>
                        )}

                        <SelfReportModal
                            isOpen={showLabelModal}
                            onClose={() => setShowLabelModal(false)}
                            studentId={studentId}
                            sessionId={sessionId}
                        />
                    </div>
                )}
            </main>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}

export default App
