import { useEffect, useRef } from 'react'

const BATCH_SIZE_LIMIT = 30
const FLUSH_INTERVAL_MS = 5000
const API_URL = 'http://localhost:3000/api/telemetry/mouse'

export default function MouseLogger({ studentId, sessionId, isActive = true }) {
    // Buffer to store mouse events before sending
    const bufferRef = useRef([])
    // Timer reference for periodic flushing
    const timerRef = useRef(null)
    // Store previous mouse position and timestamp for calculating delta/speed
    const lastPosRef = useRef(null)

    // -- Function to send batched data to the server --
    const flushBuffer = async () => {
        if (bufferRef.current.length === 0) return

        // Create payload from current buffer
        const payload = {
            student_id: studentId,
            session_id: sessionId,
            events: [...bufferRef.current]
        }

        // Clear buffer immediately to prevent duplicate sends
        bufferRef.current = []

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
        } catch (err) {
            // Log failure but do not crash the app (fire and forget strategy)
            console.warn('MouseLogger: Telemetry send failed', err)
        }
    }

    useEffect(() => {
        // Only track if session is active
        if (!isActive) {
            if (timerRef.current) clearInterval(timerRef.current)
            flushBuffer() // Final flush
            return
        }

        const handleMouseMove = (e) => {
            const now = Date.now()
            const { clientX, clientY } = e

            // -- Calculate Derivatives (Speed, Delta) --
            let dx = 0
            let dy = 0
            let speed = 0

            if (lastPosRef.current) {
                const dt = now - lastPosRef.current.t
                // Avoid division by zero if events fire too rapidly
                if (dt > 0) {
                    dx = clientX - lastPosRef.current.x
                    dy = clientY - lastPosRef.current.y
                    // Speed in pixels per millisecond
                    speed = Math.sqrt(dx * dx + dy * dy) / dt
                }
            }

            // Update last position for next event
            lastPosRef.current = { x: clientX, y: clientY, t: now }

            // -- Push to Buffer --
            bufferRef.current.push({
                ts: now,
                x: clientX,
                y: clientY,
                dx,
                dy,
                speed
            })

            // -- Batch Flush Condition --
            if (bufferRef.current.length >= BATCH_SIZE_LIMIT) {
                flushBuffer()
                // Reset the periodic timer so we don't flush again immediately
                if (timerRef.current) {
                    clearInterval(timerRef.current)
                    timerRef.current = setInterval(flushBuffer, FLUSH_INTERVAL_MS)
                }
            }
        }

        // Attach event listener
        window.addEventListener('mousemove', handleMouseMove)

        // Start periodic flush timer
        timerRef.current = setInterval(flushBuffer, FLUSH_INTERVAL_MS)

        // -- Cleanup on Unmount --
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            if (timerRef.current) clearInterval(timerRef.current)
            // Attempt to send any remaining data
            flushBuffer()
        }
    }, [isActive, studentId, sessionId])

    return null // Headless component
}
