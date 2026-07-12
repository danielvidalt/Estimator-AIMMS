import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AuthGate from './components/AuthGate.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthGate>
        {(session) => <App session={session} />}
      </AuthGate>
    </ErrorBoundary>
  </StrictMode>,
);
