import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence the THREE.Clock deprecation warning emitted by @react-three/fiber's
// internals. It's harmless — the library just hasn't migrated to THREE.Timer
// yet — and logs on every frame setup. Drop it so real errors stay visible.
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('THREE.Clock: This module has been deprecated')) return;
  origWarn.apply(console, args as []);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
