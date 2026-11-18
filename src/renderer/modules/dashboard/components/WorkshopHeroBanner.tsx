import React, { useState, useEffect } from 'react'

interface WorkshopHeroBannerProps {
  displayName: string
  businessName: string
  activeOngoingCount: number
  pendingCount: number
}

export const WorkshopHeroBanner: React.FC<WorkshopHeroBannerProps> = ({
  displayName,
  businessName,
  activeOngoingCount,
  pendingCount
}) => {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<string>('')

  useEffect(() => {
    const updateDateTime = (): void => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      )
    }

    updateDateTime()
    const timer = setInterval(updateDateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #1e1b4b 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25), 0 8px 10px -6px rgba(15, 23, 42, 0.2)',
        marginBottom: 24
      }}
    >
      {/* Background Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: 120,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -50,
          left: 40,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Left Info Column */}
      <div style={{ zIndex: 1, maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 20,
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              fontSize: 12,
              fontWeight: 600,
              color: '#4ade80'
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 8px #22c55e'
              }}
            />
            Workshop Station Live
          </span>

          <span style={{ fontSize: 13, color: '#94a3b8' }}>•</span>
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            {businessName}
          </span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          Welcome back, <span style={{ color: '#60a5fa' }}>{displayName}</span>!
        </h1>

        <p style={{ color: '#cbd5e1', fontSize: 14, marginTop: 6, marginBottom: 16, lineHeight: 1.5 }}>
          {activeOngoingCount > 0 ? (
            <>
              You have <strong style={{ color: '#38bdf8' }}>{activeOngoingCount} active vehicle(s)</strong> currently on the service floor, and <strong style={{ color: '#fbbf24' }}>{pendingCount} task(s)</strong> yet to be started today.
            </>
          ) : (
            <>Workshop floor is ready. Check-in new arrivals or monitor scheduled appointments below.</>
          )}
        </p>

        {/* Date and Time Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📅</span>
            <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{currentDate || 'Today'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🕒</span>
            <span style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace' }}>
              {currentTime}
            </span>
          </div>
        </div>
      </div>

      {/* Right Charm Isometric SVG Illustration */}
      <div
        style={{
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 20
        }}
      >
        <svg
          width="210"
          height="130"
          viewBox="0 0 210 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.35))' }}
        >
          {/* Hydraulic Service Lift Platform */}
          <ellipse cx="105" cy="115" rx="90" ry="12" fill="#0f172a" opacity="0.6" />
          <path d="M40 108 L170 108 L160 115 L50 115 Z" fill="#334155" />
          <rect x="75" y="80" width="12" height="30" rx="3" fill="#64748b" />
          <rect x="123" y="80" width="12" height="30" rx="3" fill="#64748b" />
          <rect x="50" y="78" width="110" height="6" rx="3" fill="#38bdf8" />

          {/* Isometric Vehicle on Lift */}
          {/* Wheels */}
          <ellipse cx="68" cy="80" rx="10" ry="10" fill="#090d16" />
          <ellipse cx="68" cy="80" rx="6" ry="6" fill="#64748b" />
          <ellipse cx="142" cy="80" rx="10" ry="10" fill="#090d16" />
          <ellipse cx="142" cy="80" rx="6" ry="6" fill="#64748b" />

          {/* Car Body Lower */}
          <path
            d="M52 75 C52 70 56 66 62 66 L148 66 C154 66 158 70 158 75 L158 78 L52 78 Z"
            fill="#2563eb"
          />
          {/* Car Cabin & Windshield */}
          <path
            d="M72 66 L86 46 C88 43 92 42 96 42 L124 42 C128 42 132 44 134 47 L144 66 Z"
            fill="#1d4ed8"
          />
          {/* Windows */}
          <path d="M88 47 L97 47 L97 63 L77 63 Z" fill="#93c5fd" opacity="0.85" />
          <path d="M102 47 L122 47 L132 63 L102 63 Z" fill="#bae6fd" opacity="0.85" />

          {/* Headlights & Tail Lights Glow */}
          <ellipse cx="156" cy="71" rx="3" ry="2" fill="#fef08a" />
          <ellipse cx="54" cy="71" rx="2" ry="2" fill="#ef4444" />

          {/* Wrench & Spark Charm */}
          <g transform="translate(145, 15) rotate(15)">
            <rect x="0" y="8" width="22" height="5" rx="2.5" fill="#f59e0b" />
            <path d="M20 5 C24 5 26 8 26 10 C26 12 24 15 20 15 L18 13 L21 10.5 L18 8 Z" fill="#fbbf24" />
            <circle cx="-2" cy="10.5" r="4" fill="#fbbf24" />
            <circle cx="-2" cy="10.5" r="2" fill="#1e293b" />
          </g>

          {/* Pulse / Sparkle dots */}
          <circle cx="36" cy="38" r="2" fill="#38bdf8" />
          <circle cx="180" cy="52" r="2.5" fill="#34d399" />
          <circle cx="50" cy="22" r="3" fill="#a78bfa" />
        </svg>
      </div>
    </div>
  )
}
