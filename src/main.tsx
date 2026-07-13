import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import SessionGate from './components/SessionGate.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SessionGate>
        {(session) => <App session={session} />}
      </SessionGate>
    </ErrorBoundary>
  </StrictMode>,
);
