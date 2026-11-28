import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export function LeafIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M20 4c0 8-5 13-12 13H5c0-7 5-12 12-12h3Z" />
      <path d="M4 21c2-5 6-8 11-10" />
    </svg>
  );
}

export function FlaskIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M9 3h6M10 3v6l-5.5 9.2A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.8L14 9V3" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

export function BookIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

export function ScaleIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 3v18M7 21h10" />
      <path d="M5 7h14M5 7l-3 7h6L5 7ZM19 7l-3 7h6l-3-7Z" />
    </svg>
  );
}

export function ShieldIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 3 5 6v5c0 4.4 2.9 8.4 7 10 4.1-1.6 7-5.6 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function InfoIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function AlertIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  );
}

export function CheckIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}

export function ArrowIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export function ExternalIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function SearchIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

export function MenuIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function PrintIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7z" />
    </svg>
  );
}

export function CameraIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function ImageIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 16-5-5-8 8" />
    </svg>
  );
}

export function ScanIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
    </svg>
  );
}

export function RotateIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M20 7v5h-5" />
      <path d="M4.5 16a8 8 0 1 0 1.8-9.5L4 9" />
    </svg>
  );
}

export function TrashIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
    </svg>
  );
}

export function SwitchCameraIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <path d="M9 14a3 3 0 0 0 5 2M15 14a3 3 0 0 0-5-2M14 16v-2h2M10 12v2H8" />
    </svg>
  );
}

export function FlashIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

export function StopIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}

export function UploadIcon({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}
