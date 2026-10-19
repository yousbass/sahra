import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Catches unhandled React render errors so the
 * whole app doesn't go blank — shows a minimal recovery UI instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#fdf6ee',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: '1.5rem' }}>
          <circle cx="32" cy="32" r="32" fill="#F0A03C" fillOpacity="0.15" />
          <path d="M32 20v16" stroke="#F0A03C" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="42" r="2" fill="#F0A03C" />
        </svg>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0A1128', marginBottom: '0.75rem' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '28rem', lineHeight: 1.6 }}>
          An unexpected error occurred. Reloading usually fixes it.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            background: '#F0A03C',
            color: '#0A1128',
            border: 'none',
            borderRadius: '0.75rem',
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reload page
        </button>
        {import.meta.env.DEV && this.state.error && (
          <pre
            style={{
              marginTop: '2rem',
              padding: '1rem',
              background: '#fee2e2',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#991b1b',
              textAlign: 'left',
              maxWidth: '40rem',
              overflowX: 'auto',
            }}
          >
            {this.state.error.toString()}
          </pre>
        )}
      </div>
    );
  }
}
