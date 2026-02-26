interface LogoProps {
  className?: string;
}

export function Logo({ className = 'w-8 h-8' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cloud shape */}
      <path
        d="M16 46h32a8 8 0 0 0 0-16h-.5a12 12 0 0 0-23-5A10 10 0 0 0 14 34a8 8 0 0 0 2 12Z"
        fill="url(#hCloudGrad)"
        opacity="0.13"
      />
      <path
        d="M16 46h32a8 8 0 0 0 0-16h-.5a12 12 0 0 0-23-5A10 10 0 0 0 14 34a8 8 0 0 0 2 12Z"
        stroke="url(#hCloudStroke)"
        strokeWidth="2"
        fill="none"
      />
      {/* Bar chart bars */}
      <rect x="20" y="36" width="5" height="8" rx="1.2" fill="url(#hBar1)" />
      <rect x="27" y="31" width="5" height="13" rx="1.2" fill="url(#hBar2)" />
      <rect x="34" y="27" width="5" height="17" rx="1.2" fill="url(#hBar3)" />
      <rect x="41" y="22" width="5" height="22" rx="1.2" fill="url(#hBar4)" />
      {/* Trend line */}
      <path
        d="M22.5 35 L43.5 21"
        stroke="#1e40af"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path d="M41 20l3.5.8-1.8 3" fill="#1e40af" opacity="0.5" />
      <defs>
        <linearGradient id="hCloudGrad" x1="8" y1="18" x2="56" y2="48">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="hCloudStroke" x1="8" y1="18" x2="56" y2="48">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="hBar1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="hBar2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="hBar3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="hBar4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
      </defs>
    </svg>
  );
}
