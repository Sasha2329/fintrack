import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { syncPendingTransactions } from './services/api';
import { registerServiceWorker } from './services/pwa';
import './styles/global.css';

registerServiceWorker();

void syncPendingTransactions();
window.addEventListener('online', () => {
  void syncPendingTransactions();
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
