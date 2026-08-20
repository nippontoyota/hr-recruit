import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import './index.css';
import App from './App.tsx';
import { isAbortError } from './lib/utils';

const originalToastError = toast.error.bind(toast);
toast.error = ((message, data) => {
  if (message == null || message === '') return;
  if (typeof message !== 'string' && isAbortError(message)) return;
  if (typeof message === 'string' && /^(Aborted|The user aborted a request\.?|The operation was aborted\.?)$/i.test(message)) return;
  return originalToastError(message, data);
}) as typeof toast.error;

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
