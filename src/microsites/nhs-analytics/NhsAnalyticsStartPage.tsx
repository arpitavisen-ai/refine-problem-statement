import './NhsAnalyticsStartPage.css';

interface Props {
  onViewAnalytics: () => void;
  onBack: () => void;
}

export function NhsAnalyticsStartPage({ onViewAnalytics, onBack }: Props) {
  return (
    <div className="nhs-analytics-start" lang="en">
      <a href="#main-content" className="skip-link" data-testid="analytics-skip-link">
        Skip to main content
      </a>

      {/* NHS header */}
      <header className="nhs-header" role="banner">
        <div className="nhs-header-inner">
          <div className="nhs-logo">
            <span className="nhs-logo-mark" aria-hidden="true">NHS</span>
            <div>
              <div className="nhs-logo-text">Patient Feedback Intelligence</div>
              <div className="nhs-logo-sub">Accenture S&amp;PE &middot; NHS England FFT</div>
            </div>
          </div>
        </div>
      </header>

      {/* Back link */}
      <div className="backbar">
        <button
          className="back-link"
          onClick={onBack}
          data-testid="analytics-start-back-link"
          aria-label="Back to main site"
        >
          <span className="chev" aria-hidden="true">&#8249;</span> Back
        </button>
      </div>

      {/* Main content */}
      <div className="page" id="main-content" tabIndex={-1}>
        <div className="wrap">

          {/* Hero */}
          <section className="hero measure" aria-labelledby="svc-h1">
            <p className="svc-eyebrow">NHS England &middot; Friends and Family Test</p>
            <h1 id="svc-h1">Performance analytics for patient feedback</h1>
            <p className="lead">
              Explore system-wide metrics, AI quality indicators, and prioritised signals across{' '}
              <strong>1.8 million FFT responses</strong> — April 2026.
            </p>
          </section>

          {/* Primary CTA */}
          <div className="section start-row">
            <button
              className="start-btn"
              onClick={onViewAnalytics}
              data-testid="analytics-start-now-btn"
            >
              View analytics
              <svg className="arrow" viewBox="0 0 32 20" aria-hidden="true" focusable="false">
                <path d="M22 0 L32 10 L22 20 L20.6 18.6 L28.2 11 L0 11 L0 9 L28.2 9 L20.6 1.4z" />
              </svg>
            </button>
          </div>

          {/* Prose */}
          <section className="section prose measure" aria-label="About this service">
            <h2>What is this?</h2>
            <p>
              The NHS Performance Analytics dashboard brings together the Friends and Family Test
              dataset and <span className="ai-inline"><span className="ai-spark" aria-hidden="true">&#10038;</span> AI&nbsp;analysis</span> to give clinical leaders a single view of how the
              system is performing. It tracks the north star metric &mdash; the number of
              distinct feedback themes acted on &mdash; alongside the four product drivers and
              supporting technical health indicators.
            </p>
            <p>
              Alongside the metrics, an <span className="ai-inline"><span className="ai-spark" aria-hidden="true">&#10038;</span> AI&nbsp;assistant</span> answers questions about the data
              using pre-computed analysis, so every user gets the same evidence-based narrative
              with no hallucination risk.
            </p>
            <p>
              Built by the Accenture S&amp;PE team during the Product Delivery phase of the PDLC
              framework. <strong>DEMO DATA ONLY &mdash; not for clinical use.</strong>
            </p>
          </section>
        </div>

        {/* What&apos;s inside band */}
        <div className="band">
          <div className="wrap">
            <div className="section">
              <h2>What&apos;s inside</h2>
              <ul className="inside-list" aria-label="Features available in the analytics dashboard">
                <li>
                  <svg className="tick" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
                    <circle cx="11" cy="11" r="11" fill="currentColor" />
                    <path d="M6 11.5 L9.5 15 L16 8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <strong>North star metric</strong> &mdash; distinct feedback themes acted on each month, with sparkline trend and AI-generated target narrative
                </li>
                <li>
                  <svg className="tick" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
                    <circle cx="11" cy="11" r="11" fill="currentColor" />
                    <path d="M6 11.5 L9.5 15 L16 8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <strong>Four product drivers</strong> &mdash; response volume, AI classification rate, time to action, and stakeholder engagement tracked as KPIs
                </li>
                <li>
                  <svg className="tick" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
                    <circle cx="11" cy="11" r="11" fill="currentColor" />
                    <path d="M6 11.5 L9.5 15 L16 8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <strong>Technical health</strong> &mdash; API latency, pipeline reliability, and system-wide error rates with real-time status indicators
                </li>
                <li>
                  <svg className="tick" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
                    <circle cx="11" cy="11" r="11" fill="currentColor" />
                    <path d="M6 11.5 L9.5 15 L16 8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <strong>
                    <span className="ai-inline" aria-label="AI layer">
                      <span className="ai-spark" aria-hidden="true">&#10038;</span> AI layer
                    </span>
                  </strong>{' '}
                  &mdash; confidence scores, classification accuracy, and trust-level readiness across the deployment pipeline
                </li>
                <li>
                  <svg className="tick" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
                    <circle cx="11" cy="11" r="11" fill="currentColor" />
                    <path d="M6 11.5 L9.5 15 L16 8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <strong>Signals archive</strong> &mdash; prioritised weekly, daily, and executive briefings generated automatically from the latest data
                </li>
              </ul>

              {/* Repeat CTA inside the band */}
              <div className="start-again start-row">
                <button
                  className="start-btn"
                  onClick={onViewAnalytics}
                  data-testid="analytics-start-now-btn-band"
                  tabIndex={0}
                  aria-label="View analytics dashboard"
                >
                  View analytics
                  <svg className="arrow" viewBox="0 0 32 20" aria-hidden="true" focusable="false">
                    <path d="M22 0 L32 10 L22 20 L20.6 18.6 L28.2 11 L0 11 L0 9 L28.2 9 L20.6 1.4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="svc-footer" role="contentinfo">
        <div className="svc-footer-inner">
          <span className="demo-flag">DEMO DATA ONLY &mdash; not for clinical use</span>
          <br />
          <span className="ai-line">&#10038; AI-assisted</span> &middot; Classified by{' '}
          <span className="ai-line">Claude (claude-sonnet-4-6)</span> &middot; NHS England FFT April 2026
          <p className="prov">
            Accenture S&amp;PE &middot; PDLC framework showcase &middot; Not a live clinical system
          </p>
        </div>
      </footer>
    </div>
  );
}
