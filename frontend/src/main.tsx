import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Public links were minted as /#/pre-form/... (hash router). BrowserRouter
// ignores the hash, so that URL is just "/" and dumps a logged-in user on home.
if (window.location.pathname === '/' && window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
