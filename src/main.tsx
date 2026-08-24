import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Safely mount optional analytics without risking top-level crash
class AnalyticsWrapper extends Component<{ children?: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('Analytics suppressed:', err);
  }
  render() {
    if (this.state.hasError) return null;
    try {
      // Dynamic import / safe render
      const { Analytics } = require('@vercel/analytics/react');
      return <Analytics />;
    } catch {
      return null;
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <AnalyticsWrapper />
    </ErrorBoundary>
  </StrictMode>,
);

