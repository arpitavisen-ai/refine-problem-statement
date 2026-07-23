interface Props {
  onBack: () => void;
}

export function NhsAnalyticsDashboardPage({ onBack }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: '"Frutiger W01", Arial, sans-serif',
      }}
    >
      {/* Back strip — NHS dark blue, mirrors NhsDashboardPage pattern */}
      <div
        style={{
          background: '#003087',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          data-testid="analytics-back-btn"
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 14,
            fontWeight: 400,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 0',
          }}
          onFocus={e => { e.currentTarget.style.outline = '3px solid #FFB81C'; e.currentTarget.style.outlineOffset = '2px'; }}
          onBlur={e => { e.currentTarget.style.outline = 'none'; }}
          aria-label="Back to Performance analytics landing page"
        >
          &#8592; Back to overview
        </button>

        <span
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
            marginLeft: 'auto',
            letterSpacing: '0.08em',
            fontWeight: 700,
          }}
          aria-hidden="true"
        >
          DEMO DATA ONLY &mdash; not for clinical use
        </span>
      </div>

      {/* Analytics iframe */}
      <iframe
        src="/nhs-analytics/nhs-performance-analytics.html"
        data-testid="analytics-dashboard-frame"
        title="NHS Performance Analytics Dashboard"
        style={{ flex: 1, border: 'none', width: '100%', display: 'block' }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
