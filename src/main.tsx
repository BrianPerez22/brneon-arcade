import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { installNoZoom } from './core/noZoom.ts';
import { installAudioUnlock } from './core/audio.ts';
import './styles.css';
import './games.css';
import './online.css';

installNoZoom();
installAudioUnlock();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
