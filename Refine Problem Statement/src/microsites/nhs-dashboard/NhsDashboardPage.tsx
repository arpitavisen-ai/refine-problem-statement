import { ArrowLeft } from 'lucide-react';

interface NhsDashboardPageProps {
  onBack: () => void;
}

const NHS_TOKENS = {
  darkBlue: '#003087',
  focus: '#FFB81C',
  amber: '#FFB81C',
  white: '#FFFFFF',
} as const;

export function NhsDashboardPage({ onBack }: NhsDashboardPageProps) {
  return (
    <div
      className="nhs-microsite"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: NHS_TOKENS.darkBlue,
      }}
    >
      {/* Host-side back strip — NHS dark blue, never inside the iframe */}
      <div
        style={{
          backgroundColor: NHS_TOKENS.darkBlue,
          padding: '0.5rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          height: '44px',
        }}
      >
        <button
          onClick={onBack}
          data-testid="nhs-back-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: NHS_TOKENS.white,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 500,
            padding: '0.25rem 0.375rem',
            borderRadius: '3px',
            outline: `2px solid transparent`,
            outlineOffset: '2px',
          }}
          onFocus={(e) => { e.currentTarget.style.outline = `2px solid ${NHS_TOKENS.focus}`; }}
          onBlur={(e) => { e.currentTarget.style.outline = '2px solid transparent'; }}
        >
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
          Back to framework
        </button>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: NHS_TOKENS.amber,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          ✦ AI-assisted · DEMO DATA ONLY — not for clinical use
        </span>
      </div>

      {/* NHS dashboard — served as a static self-contained HTML file.
          Same-origin, no sandbox, so Playwright can reach inside with frameLocator. */}
      <iframe
        src="/nhs-dashboard/nhs-feedback-dashboard-v5_1.html"
        data-testid="nhs-dashboard-frame"
        title="NHS Patient Feedback Intelligence Platform"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  );
}
