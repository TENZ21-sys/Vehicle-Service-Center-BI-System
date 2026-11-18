import React from 'react'

export const EmptyVehiclesIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 180,
  height = 120
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 180 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', margin: '0 auto' }}
  >
    <defs>
      <linearGradient id="carGrad" x1="20" y1="30" x2="160" y2="90" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="1" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="groundGrad" x1="10" y1="100" x2="170" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#e2e8f0" stopOpacity="0" />
        <stop offset="0.5" stopColor="#cbd5e1" />
        <stop offset="1" stopColor="#e2e8f0" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Shadow / Ground */}
    <ellipse cx="90" cy="102" rx="70" ry="6" fill="url(#groundGrad)" />
    {/* Car Roof & Cabin */}
    <path
      d="M50 62L62 42C64 39 67 38 71 38H115C119 38 123 40 125 44L136 62"
      fill="#93c5fd"
      opacity="0.4"
      stroke="#2563eb"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Car Windows */}
    <path
      d="M66 44H90V58H58L66 44Z"
      fill="#ffffff"
      opacity="0.9"
    />
    <path
      d="M94 44H114L124 58H94V44Z"
      fill="#ffffff"
      opacity="0.9"
    />
    {/* Car Body */}
    <path
      d="M24 72C24 67 28 63 33 63H147C153 63 158 68 158 74V84C158 86 156 88 154 88H142C142 81 136 76 129 76C122 76 116 81 116 88H64C64 81 58 76 51 76C44 76 38 81 38 88H26C24 88 24 86 24 84V72Z"
      fill="url(#carGrad)"
    />
    {/* Headlights */}
    <circle cx="154" cy="73" r="3" fill="#fef08a" />
    <circle cx="26" cy="73" r="3" fill="#f87171" />
    {/* Wheels */}
    <circle cx="51" cy="88" r="12" fill="#1e293b" />
    <circle cx="51" cy="88" r="6" fill="#94a3b8" />
    <circle cx="51" cy="88" r="2.5" fill="#f8fafc" />
    <circle cx="129" cy="88" r="12" fill="#1e293b" />
    <circle cx="129" cy="88" r="6" fill="#94a3b8" />
    <circle cx="129" cy="88" r="2.5" fill="#f8fafc" />
    {/* Sparkle badge */}
    <circle cx="145" cy="30" r="12" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
    <path d="M145 23V37M138 30H152" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const EmptyJobCardsIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 140,
  height = 110
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 140 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', margin: '0 auto' }}
  >
    <defs>
      <linearGradient id="boardGrad" x1="20" y1="10" x2="120" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f8fafc" />
        <stop offset="1" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>
    <rect x="25" y="16" width="90" height="84" rx="10" fill="url(#boardGrad)" stroke="#cbd5e1" strokeWidth="2" />
    <rect x="52" y="8" width="36" height="14" rx="4" fill="#3b82f6" />
    <circle cx="70" cy="15" r="2" fill="#ffffff" />
    {/* Lines */}
    <rect x="38" y="34" width="40" height="5" rx="2.5" fill="#94a3b8" />
    <rect x="38" y="46" width="64" height="4" rx="2" fill="#cbd5e1" />
    <rect x="38" y="56" width="50" height="4" rx="2" fill="#cbd5e1" />
    <rect x="38" y="66" width="58" height="4" rx="2" fill="#cbd5e1" />
    {/* Checklist ticks */}
    <circle cx="106" cy="36" r="6" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
    <path d="M103 36L105 38L109 34" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Wrench overlay */}
    <circle cx="112" cy="84" r="16" fill="#1e293b" />
    <path
      d="M106 80C104 82 104 86 106 88L114 96C116 98 119 98 121 96L123 94C125 92 125 89 123 87L117 81C117 80 118 78 116 77C114 75 111 76 109 77L112 80L110 82L107 79C106 79 106 80 106 80Z"
      fill="#60a5fa"
    />
  </svg>
)

export const EmptyInvoicesIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 140,
  height = 110
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 140 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', margin: '0 auto' }}
  >
    <rect x="35" y="14" width="70" height="84" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
    <path d="M45 28H75M45 38H95M45 48H85M45 58H95M45 68H70" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
    {/* Stamp */}
    <circle cx="85" cy="74" r="14" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 2" />
    <path d="M78 74L83 79L92 70" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const AnalyticsGrowthIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 150,
  height = 100
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 150 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', margin: '0 auto' }}
  >
    <defs>
      <linearGradient id="chartFill" x1="75" y1="30" x2="75" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" stopOpacity="0.3" />
        <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Grid axes */}
    <path d="M20 85H135" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M20 20V85" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
    {/* Trend curve */}
    <path
      d="M25 75C45 70 55 55 75 58C95 62 105 32 130 25"
      stroke="#2563eb"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M25 75C45 70 55 55 75 58C95 62 105 32 130 25V85H25V75Z"
      fill="url(#chartFill)"
    />
    {/* Peak glow dot */}
    <circle cx="130" cy="25" r="5" fill="#2563eb" />
    <circle cx="130" cy="25" r="2" fill="#ffffff" />
  </svg>
)
