import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import './components/components.css';

const rootElement: HTMLElement | null = document.getElementById('root');

if (rootElement === null) {
  throw new Error(
    'Mount failed: no element with id "root" was found in index.html.'
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
