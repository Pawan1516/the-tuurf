import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';

// Intercept fetch to automatically include credentials for API calls (supports httpOnly cookies)
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
    if (url.includes('/api')) {
        if(config === undefined) config = {};
        config.credentials = 'include';
    }
    return originalFetch(resource, config);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Proxy tunnel architecture rebuilt. (v2.1)
