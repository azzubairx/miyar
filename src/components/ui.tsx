import type { ReactNode } from 'react';
import { ExternalIcon, InfoIcon, AlertIcon, CheckIcon } from './Icons';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'clay' | 'ink' | 'outline';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function SectionHeading({
  number,
  eyebrow,
  title,
  lead,
  align = 'start',
}: {
  number?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: 'start' | 'center';
}) {
  return (
    <div className={`section-heading align-${align}`}>
      {(number || eyebrow) && (
        <div className="section-kicker">
          {number && <span className="section-number">{number}</span>}
          {eyebrow && <span>{eyebrow}</span>}
        </div>
      )}
      <h2>{title}</h2>
      {lead && <p className="section-lead">{lead}</p>}
    </div>
  );
}

export function Callout({
  children,
  tone = 'info',
  title,
}: {
  children: ReactNode;
  tone?: 'info' | 'attention' | 'regulatory' | 'success';
  title?: string;
}) {
  const Icon = tone === 'success' ? CheckIcon : tone === 'info' ? InfoIcon : AlertIcon;
  return (
    <div className={`callout callout-${tone}`}>
      <span className="callout-icon">
        <Icon size={20} />
      </span>
      <div>
        {title && <strong className="callout-title">{title}</strong>}
        <div className="callout-body">{children}</div>
      </div>
    </div>
  );
}

export function Meter({ percent, label }: { percent: number; label?: string }) {
  return (
    <div className="meter-wrap">
      <div className="meter-head">
        <span>{label ?? 'اكتمال البيانات'}</span>
        <strong>{percent}%</strong>
      </div>
      <div
        className="meter"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'اكتمال البيانات'}
      >
        <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="external-link" href={href} target="_blank" rel="noreferrer noopener">
      {children}
      <ExternalIcon size={14} />
    </a>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="2" y="2" width="60" height="60" rx="8" />
          <path d="M18 44V22l14 15 14-15v22" />
          <circle cx="32" cy="49" r="1.8" fill="currentColor" />
        </svg>
      </div>
      <h3>{title}</h3>
      <div className="empty-body">{children}</div>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
