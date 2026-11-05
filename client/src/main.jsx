import React from 'react';
import ReactDOM from 'react-dom/client';

async function start() {
  if (import.meta.env.PROD) {
    try {
      const response = await fetch('/runtime-config.json');
      if (response.ok) window.ONEQUEUE_CONFIG = await response.json();
    } catch (error) {
      console.error('Unable to load public application configuration.', error);
    }
  }
  const { default: App } = await import('./App.jsx');
  ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
}

start();
