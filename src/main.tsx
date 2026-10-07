import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for desktop installability and offline support
if ('serviceWorker' in navigator) {
  try {
    registerSW({ immediate: true });
  } catch {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(<App />);
