import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error handler untuk tampilkan error di layar
window.onerror = function(msg, url, line, col, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#ffebee;color:#c62828;padding:20px;font-family:monospace;z-index:99999;overflow:auto;';
  errorDiv.innerHTML = `
    <h2 style="margin-top:0;">❌ ERROR TERDETEKSI:</h2>
    <p><strong>Pesan:</strong> ${msg}</p>
    <p><strong>File:</strong> ${url}</p>
    <p><strong>Line:</strong> ${line}:${col}</p>
    <hr/>
    <p><strong>Stack Trace:</strong></p>
    <pre style="background:#fff;padding:10px;border-radius:4px;overflow:auto;font-size:12px;">${error?.stack || 'No stack trace'}</pre>
    <hr/>
    <button onclick="location.reload()" style="padding:10px 20px;background:#1976D2;color:white;border:none;border-radius:4px;cursor:pointer;">🔄 Reload</button>
  `;
  document.body.appendChild(errorDiv);
  return true;
};

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#fff3e0;color:#e65100;padding:20px;font-family:monospace;z-index:99999;overflow:auto;';
  errorDiv.innerHTML = `
    <h2 style="margin-top:0;">⚠️ PROMISE ERROR:</h2>
    <pre style="background:#fff;padding:10px;border-radius:4px;overflow:auto;font-size:12px;">${event.reason?.stack || event.reason || 'Unknown error'}</pre>
    <hr/>
    <button onclick="location.reload()" style="padding:10px 20px;background:#1976D2;color:white;border:none;border-radius:4px;cursor:pointer;"> Reload</button>
  `;
  document.body.appendChild(errorDiv);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
