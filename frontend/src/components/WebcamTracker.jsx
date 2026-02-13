import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-cpu'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'

// -- SVG Icons --
const IconVision = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
)
const IconCamera = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
)
const IconLock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)
const IconZap = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
)
const IconRefresh = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
)

// -- Constants --
const AGGREGATION_WINDOW_MS = 5000
const API_URL = 'http://localhost:3000/api/telemetry/eye'

// MediaPipe Face Mesh Indices
const LEFT_EYE = [362, 385, 387, 263, 373, 380]
const RIGHT_EYE = [33, 160, 158, 133, 153, 144]
const LEFT_IRIS = [468, 469, 470, 471, 472]
const RIGHT_IRIS = [473, 474, 475, 476, 477]

export default function WebcamTracker({ studentId, sessionId, isActive = true }) {
    // UI State
    const [model, setModel] = useState(null)
    const [isTracking, setIsTracking] = useState(false)
    const [cameraPermission, setCameraPermission] = useState(false)
    const [statusMessage, setStatusMessage] = useState('Initializing...')
    const [debugInfo, setDebugInfo] = useState({ ear: 0, gaze: 0, blinks: 0, headMove: 0 })
    const [blinkFlash, setBlinkFlash] = useState(false)

    // Refs for logic
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const requestRef = useRef(null)
    const lastDetectionTimeRef = useRef(0)
    const lastNosePosRef = useRef(null) // For velocity calculation

    // Aggregation State
    const windowStartRef = useRef(Date.now())
    const featuresBufferRef = useRef([])
    const blinkStateRef = useRef(false)
    const maxEARRef = useRef(0.28)
    const calibrationFramesRef = useRef(0)
    const missedFramesRef = useRef(0)

    useEffect(() => {
        loadModel('webgl')
    }, [])

    const loadModel = async (backend = 'webgl') => {
        try {
            setStatusMessage('Waking up AI...')
            const detector = await faceLandmarksDetection.createDetector(
                faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
                {
                    runtime: 'mediapipe',
                    refineLandmarks: true,
                    maxFaces: 1
                }
            )
            setModel(detector)
            setStatusMessage('Ready for tracking.')
        } catch (err) {
            console.warn('MediaPipe Load failed, falling back to TFJS:', err)
            try {
                await tf.setBackend(backend)
                await tf.ready()
                const detector = await faceLandmarksDetection.createDetector(
                    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
                    {
                        runtime: 'tfjs',
                        refineLandmarks: true,
                        maxFaces: 1
                    }
                )
                setModel(detector)
                setStatusMessage('Ready (TFJS Mode).')
            } catch (fallbackErr) {
                setStatusMessage('AI Sensor Error')
            }
        }
    }

    const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))

    const calculateEAR = (keypoints, indices) => {
        const p1 = keypoints[indices[0]], p2 = keypoints[indices[1]], p3 = keypoints[indices[2]]
        const p4 = keypoints[indices[3]], p5 = keypoints[indices[4]], p6 = keypoints[indices[5]]
        const v1 = getDistance(p2, p6), v2 = getDistance(p3, p5), h = getDistance(p1, p4)
        return (v1 + v2) / (2 * h)
    }

    const flushWindow = useCallback(async () => {
        const now = Date.now()
        const buffer = featuresBufferRef.current
        if (buffer.length === 0) {
            windowStartRef.current = now
            return
        }

        const numFrames = buffer.length
        const avgEar = buffer.reduce((sum, f) => sum + f.ear, 0) / numFrames
        const blinkCount = buffer.reduce((sum, f) => sum + (f.isBlink ? 1 : 0), 0)
        const gazeOffCount = buffer.reduce((sum, f) => sum + (f.isGazeOff ? 1 : 0), 0)
        const meanNoseX = buffer.reduce((sum, f) => sum + f.noseX, 0) / numFrames
        const varianceX = buffer.reduce((sum, f) => sum + Math.pow(f.noseX - meanNoseX, 2), 0) / numFrames
        const headStd = Math.sqrt(varianceX)

        const payload = {
            student_id: studentId,
            session_id: sessionId,
            window_start: windowStartRef.current,
            window_end: now,
            features: {
                blink_count: blinkCount,
                avg_ear: avgEar,
                gaze_off_frac: gazeOffCount / numFrames,
                head_movement_std: headStd
            }
        }

        windowStartRef.current = now
        featuresBufferRef.current = []

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
        } catch (err) {
            console.warn('Eye telemetry fetch failed:', err)
        }
    }, [studentId, sessionId])

    const detect = useCallback(async () => {
        if (!isActive || !model) return

        try {
            const now = Date.now()
            if (now - lastDetectionTimeRef.current < 100) {
                requestRef.current = requestAnimationFrame(detect)
                return
            }
            lastDetectionTimeRef.current = now

            const video = videoRef.current
            const canvas = canvasRef.current
            if (!video || !canvas || video.readyState < 2) {
                requestRef.current = requestAnimationFrame(detect)
                return
            }

            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
            }

            const faces = await model.estimateFaces(video)
            const ctx = canvas.getContext('2d', { alpha: true })
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)

            if (faces && faces.length > 0) {
                missedFramesRef.current = 0
                const keypoints = faces[0].keypoints

                // 2024 Fix: Check strictly for Iris points availability
                const hasIris = keypoints.length > 468;

                if (ctx) {
                    ctx.fillStyle = '#10b981'
                    const debugPoints = [362, 263, 33, 133, ...(hasIris ? [...LEFT_IRIS, ...RIGHT_IRIS] : [])]
                    debugPoints.forEach(idx => {
                        const pt = keypoints[idx]
                        if (pt) {
                            ctx.beginPath()
                            ctx.arc(pt.x, pt.y, 1.5, 0, 2 * Math.PI)
                            ctx.fill()
                        }
                    })
                }

                const leftRef = calculateEAR(keypoints, LEFT_EYE)
                const rightRef = calculateEAR(keypoints, RIGHT_EYE)
                const avgEAR = (leftRef + rightRef) / 2

                let isGazeOff = false
                let gazeDev = 0

                if (hasIris) {
                    try {
                        const ratioL = getDistance(keypoints[LEFT_IRIS[0]], keypoints[362]) / getDistance(keypoints[362], keypoints[263])
                        const ratioR = getDistance(keypoints[RIGHT_IRIS[0]], keypoints[133]) / getDistance(keypoints[133], keypoints[33])
                        const avgGazeRatio = (ratioL + ratioR) / 2
                        gazeDev = Math.abs(avgGazeRatio - 0.5)
                        isGazeOff = gazeDev > 0.15
                    } catch (e) {
                        // Fallback if keypoints are weirdly undefined despite length check
                        gazeDev = 0;
                    }
                }

                // --- Calculate Head Movement (Velocity) ---
                const nose = keypoints[1] // Node Tip
                let headVelocity = 0
                if (lastNosePosRef.current) {
                    headVelocity = getDistance(nose, lastNosePosRef.current)
                }
                lastNosePosRef.current = nose

                if (calibrationFramesRef.current < 50) {
                    maxEARRef.current = (maxEARRef.current * calibrationFramesRef.current + avgEAR) / (calibrationFramesRef.current + 1)
                    calibrationFramesRef.current++
                    setStatusMessage(`Calibrating... (${Math.round(calibrationFramesRef.current * 2)}%)`)
                }

                const isEyeClosed = avgEAR < (maxEARRef.current * 0.8)
                let isBlinkEvent = isEyeClosed && !blinkStateRef.current
                blinkStateRef.current = isEyeClosed

                featuresBufferRef.current.push({
                    timestamp: Date.now(),
                    ear: avgEAR,
                    noseX: keypoints[1].x,
                    noseY: keypoints[1].y,
                    isGazeOff,
                    isBlink: isBlinkEvent
                })

                setDebugInfo(prev => ({
                    ear: avgEAR,
                    gaze: gazeDev,
                    blinks: prev.blinks + (isBlinkEvent ? 1 : 0),
                    headMove: headVelocity
                }))

                if (isBlinkEvent) {
                    setBlinkFlash(true)
                    setTimeout(() => setBlinkFlash(false), 200)
                }
                setStatusMessage('Tracking Active')
            } else {
                missedFramesRef.current++
                if (missedFramesRef.current > 5) {
                    setStatusMessage('Searching for face...')
                    setDebugInfo(prev => ({ ...prev, ear: 0, gaze: 0, headMove: 0 }))
                }
            }

            // Prevent sending data during calibration (first ~3 seconds)
            if (calibrationFramesRef.current < 60) {
                windowStartRef.current = now;
                featuresBufferRef.current = [];
            }

            if (Date.now() - windowStartRef.current >= AGGREGATION_WINDOW_MS) {
                flushWindow()
            }
        } catch (err) {
            console.error('Detection Loop Error:', err)
            setStatusMessage('AI Error')
        }
        requestRef.current = requestAnimationFrame(detect)
    }, [model, flushWindow, isActive])

    const startTracking = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.onloadedmetadata = () => {
                    const v = videoRef.current
                    v.width = v.videoWidth
                    v.height = v.videoHeight
                    v.play()
                    setIsTracking(true)
                    setCameraPermission(true)
                    setStatusMessage('Tracking Active')
                    requestRef.current = requestAnimationFrame(detect)
                }
            }
        } catch (err) {
            console.error('Camera Error:', err)
            setStatusMessage('Camera access denied.')
            setCameraPermission(false)
        }
    }

    const stopTracking = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
            videoRef.current.srcObject = null
        }
        if (requestRef.current) cancelAnimationFrame(requestRef.current)
        setIsTracking(false)
        setStatusMessage('Tracking Stopped')
    }

    useEffect(() => {
        if (!isActive && isTracking) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current)
            flushWindow()
            setStatusMessage('Session Paused')
        } else if (isActive && isTracking && model) {
            requestRef.current = requestAnimationFrame(detect)
            setStatusMessage('Tracking Active')
        }
    }, [isActive, isTracking, model, detect, flushWindow])

    useEffect(() => () => stopTracking(), [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ color: 'var(--primary)' }}><IconVision /></div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Attention Analysis</h3>
                </div>
                <div className="stat-pill" style={{
                    backgroundColor: isTracking ? 'var(--status-low)' : 'var(--primary-soft)',
                    color: isTracking ? 'var(--status-low-text)' : 'var(--primary)',
                    fontSize: '0.75rem', padding: '0.35rem 0.75rem'
                }}>
                    <span style={{ marginRight: '6px' }}>{isTracking ? '●' : '○'}</span>
                    {isTracking ? 'Live' : 'Standby'}
                </div>
            </div>

            <div style={{
                position: 'relative', width: '100%', aspectRatio: '16/9', maxWidth: '400px',
                height: '240px', background: '#f8fafc', margin: '0 auto', borderRadius: '16px',
                overflow: 'hidden', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0'
            }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', transform: 'scaleX(-1)', objectFit: 'cover', opacity: isTracking ? 1 : 0, transition: 'opacity 0.4s' }} muted playsInline />
                <canvas ref={canvasRef} width="320" height="240" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', pointerEvents: 'none', zIndex: 5 }} />

                {isTracking && (
                    <div className="glass" style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', padding: '10px 14px', borderRadius: '12px', fontSize: '0.7rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, fontWeight: '600' }}>
                        <div style={{ display: 'flex', gap: '1.25rem' }}>
                            <span>EAR <strong>{debugInfo.ear.toFixed(2)}</strong></span>
                            <span>GAZE <strong>{debugInfo.gaze.toFixed(2)}</strong></span>
                            <span>MOVE <strong>{debugInfo.headMove ? debugInfo.headMove.toFixed(1) : '0.0'}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ opacity: 0.7 }}>Blinks</span>
                            <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '6px' }}>{debugInfo.blinks}</span>
                        </div>
                    </div>
                )}

                {blinkFlash && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 15px #10b981', zIndex: 11 }} />
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.8rem', padding: '0.85rem', borderRadius: '12px', background: statusMessage.includes('Active') ? 'var(--status-low)' : '#f1f5f9', color: statusMessage.includes('Active') ? 'var(--status-low-text)' : 'var(--text-secondary)', textAlign: 'center', fontWeight: '600' }}>
                    {statusMessage}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {!isTracking ? (
                        <button onClick={startTracking} disabled={!model} style={{ flex: 1, backgroundColor: !model ? '#cbd5e1' : 'var(--primary)', color: 'white', borderRadius: '12px', padding: '0.85rem' }}>
                            {model ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><IconZap /> Initialize Tracking</div> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><IconRefresh /> Loading AI...</div>}
                        </button>
                    ) : (
                        <button onClick={stopTracking} style={{ flex: 1, backgroundColor: 'white', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: '12px', padding: '0.85rem' }}>
                            Stop Sensor
                        </button>
                    )}
                </div>

                {!cameraPermission && !isTracking && (
                    <div style={{ background: 'var(--primary-soft)', padding: '1rem', borderRadius: '12px', color: 'var(--primary)', fontSize: '0.75rem', border: '1px solid #e0e7ff', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ marginTop: '2px' }}><IconLock /></div>
                        <span><strong>Privacy First:</strong> Facial tracking is performed locally in your browser. No video data is ever stored or uploaded.</span>
                    </div>
                )}
            </div>
        </div>
    )
}
