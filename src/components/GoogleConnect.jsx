import { useState, useEffect } from 'react';
import { loadGoogleScripts, getGoogleToken, googleSignOut, isGoogleSignedIn } from '../google/googleCalendar';

export default function GoogleConnect({ onConnected, onDisconnected, compact = false }) {
  const [status, setStatus] = useState('loading'); // loading | connected | disconnected | error
  const [connecting, setConnecting] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    loadGoogleScripts()
      .then(() => {
        setScriptsLoaded(true);
        setStatus(isGoogleSignedIn() ? 'connected' : 'disconnected');
        if (isGoogleSignedIn() && onConnected) onConnected();
      })
      .catch(() => setStatus('error'));
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      await getGoogleToken();
      setStatus('connected');
      if (onConnected) onConnected();
    } catch (e) {
      setStatus('error');
    }
    setConnecting(false);
  };

  const disconnect = () => {
    googleSignOut();
    setStatus('disconnected');
    if (onDisconnected) onDisconnected();
  };

  if (status === 'loading') return null;

  if (compact) {
    return status === 'connected'
      ? <div className="flex gap-2" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Google Connected</span>
          <button onClick={disconnect} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11 }}>Disconnect</button>
        </div>
      : <button className="btn btn-outline btn-sm" onClick={connect} disabled={connecting}>
          {connecting ? 'Connecting…' : '🔗 Connect Google'}
        </button>;
  }

  return (
    <div style={{
      background: status === 'connected' ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
      border: `1px solid ${status === 'connected' ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)'}`,
      borderRadius: 10, padding: 16, marginBottom: 16
    }}>
      {status === 'connected' ? (
        <div className="flex-between">
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)' }}>Google Account Connected</p>
              <p className="text-muted text-sm">Meet links will be auto-created when you schedule sessions</p>
            </div>
          </div>
          <button onClick={disconnect} className="btn btn-outline btn-sm">Disconnect</button>
        </div>
      ) : status === 'error' ? (
        <div>
          <p style={{ color: 'var(--rose)', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>⚠️ Connection Error</p>
          <p className="text-muted text-sm" style={{ marginBottom: 10 }}>Check your Google API setup in .env file</p>
          <button className="btn btn-primary btn-sm" onClick={connect}>Try Again</button>
        </div>
      ) : (
        <div>
          <div className="flex gap-3" style={{ alignItems: 'flex-start', marginBottom: 14 }}>
            <span style={{ fontSize: 28 }}>🔗</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Connect Your Google Account</p>
              <p className="text-muted text-sm">
                Connect once — Google Meet links will be <strong>auto-generated</strong> every time you schedule a live session. No copy-pasting needed.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { icon: '🎥', text: 'Auto Meet link created' },
              { icon: '🔒', text: 'Only you can admit students' },
              { icon: '📹', text: 'Recording saves to your Drive' },
            ].map(f => (
              <div key={f.text} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                <p style={{ fontSize: 11, color: 'var(--text2)' }}>{f.text}</p>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={connect} disabled={connecting} style={{ width: '100%', justifyContent: 'center' }}>
            {connecting ? 'Connecting to Google…' : '🔗 Connect Google Account'}
          </button>
        </div>
      )}
    </div>
  );
}
