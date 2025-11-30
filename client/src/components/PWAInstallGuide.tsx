export function PWAInstallGuide() {
  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      width: '384px',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #2563eb',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      zIndex: 50,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5'
    }} data-testid="pwa-install-guide">
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: '#1f2937' }}>
          📱 Install EMS Portal App
        </h3>
      </div>

      <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Chrome/Edge (Desktop):</p>
        <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#6b7280' }}>
          <li>Refresh page (Ctrl+R)</li>
          <li>Click "Install" in address bar</li>
          <li>Confirm</li>
        </ol>
      </div>

      <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Android Phone:</p>
        <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#6b7280' }}>
          <li>Tap menu (⋮)</li>
          <li>Select "Install app"</li>
          <li>Confirm</li>
        </ol>
      </div>

      <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '13px', color: '#374151' }}>iPhone/iPad:</p>
        <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#6b7280' }}>
          <li>Tap Share</li>
          <li>Tap "Add to Home Screen"</li>
          <li>Tap Add</li>
        </ol>
      </div>

      <div style={{ 
        backgroundColor: '#dbeafe', 
        border: '1px solid #93c5fd',
        borderRadius: '6px', 
        padding: '12px',
        fontSize: '12px',
        color: '#1e40af'
      }}>
        <strong>App URL:</strong>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '8px', 
          marginTop: '8px',
          borderRadius: '4px',
          border: '1px solid #93c5fd',
          wordBreak: 'break-all',
          fontFamily: 'monospace',
          fontSize: '11px'
        }}>
          {window.location.href}
        </div>
      </div>

      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px', margin: '12px 0 0 0', fontStyle: 'italic' }}>
        💡 After installation, use offline with cached data!
      </p>
    </div>
  );
}
