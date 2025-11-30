import * as React from 'react';

export function PWAInstallGuide() {
  React.useEffect(() => {
    console.log('[PWA] Install guide component mounted');
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '320px',
      backgroundColor: '#fff',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      zIndex: '99999',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#1f2937'
    }}>
      <h2 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
        📱 Install App
      </h2>
      
      <div style={{ backgroundColor: '#f0f4f8', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
        <strong>Chrome/Edge Desktop:</strong>
        <div style={{ marginTop: '5px', lineHeight: '1.6' }}>1. Refresh page<br/>2. Click "Install"<br/>3. Confirm</div>
      </div>

      <div style={{ backgroundColor: '#f0f4f8', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
        <strong>Android:</strong>
        <div style={{ marginTop: '5px', lineHeight: '1.6' }}>1. Tap menu (⋮)<br/>2. Install app<br/>3. Confirm</div>
      </div>

      <div style={{ backgroundColor: '#f0f4f8', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
        <strong>iPhone:</strong>
        <div style={{ marginTop: '5px', lineHeight: '1.6' }}>1. Tap Share<br/>2. Add to Home<br/>3. Tap Add</div>
      </div>

      <div style={{ backgroundColor: '#dbeafe', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#0c4a6e' }}>
        <strong>URL:</strong>
        <div style={{ marginTop: '5px', wordBreak: 'break-all', backgroundColor: 'white', padding: '5px', borderRadius: '3px', fontFamily: 'monospace' }}>
          {window.location.href}
        </div>
      </div>
    </div>
  );
}
