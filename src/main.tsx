import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initTheme } from './utils/theme';
import App from './App.tsx';
import './index.css';

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>
);
