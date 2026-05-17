import React from 'react';
import SigilButton from './SigilButton.jsx';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Over3arth runtime boundary caught an error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="error-shell">
        <section className="glass-panel error-card">
          <span className="eyebrow">Recovery Mode</span>
          <h1>Over3arth protected the session.</h1>
          <p>The app hit a runtime fault instead of leaving the screen broken. Reload first. If the same issue returns, export/import from a known-good ledger backup.</p>
          <pre>{this.state.error.message}</pre>
          <div className="stacked-actions horizontal">
            <SigilButton onClick={() => window.location.reload()}>Reload app</SigilButton>
            <SigilButton variant="secondary" onClick={() => this.setState({ error: null })}>Try again</SigilButton>
          </div>
        </section>
      </main>
    );
  }
}
