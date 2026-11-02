// Defensive shim for older browsers where global Iterator is not defined
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).Iterator === 'undefined') {
  (globalThis as any).Iterator = class Iterator {};
}
if (typeof window !== 'undefined' && typeof (window as any).Iterator === 'undefined') {
  (window as any).Iterator = class Iterator {};
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import './index.css';
import App from './App.tsx';
import { isAbortError } from './lib/utils';

const originalToastError = toast.error.bind(toast);
toast.error = ((message, data) => {
  if (message == null || message === '') return;
  if (isAbortError(message)) return;
  if (typeof message === 'string' && /^(Aborted|The user aborted a request\.?|The operation was aborted\.?)$/i.test(message)) return;
  const safeMessage = message instanceof Error ? message.message : message;
  return originalToastError(safeMessage, data);
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
