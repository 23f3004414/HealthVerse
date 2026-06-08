import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, LogIn, Activity, Heart, Shield, Zap } from 'lucide-react';

const Login = ({ onRegisterRedirect }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-container fade-in">
      {/* Left Branding Pane */}
      <div className="brand-pane">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.5rem' }}>
          <Activity size={44} color="var(--primary)" className="spin-icon" style={{ animationDuration: '3s' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #ffffff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            HealthVerse
          </h1>
        </div>
        
        <h2 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '1.5rem', lineHeight: 1.3 }}>
          High-performance appointment scheduling built from scratch.
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Zap size={20} color="var(--primary)" style={{ marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '2px' }}>Real-time Concurrency Sync</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Row-level locking guarantees zero double-booking conflicts.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Heart size={20} color="var(--accent-emerald)" style={{ marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '2px' }}>Live Status Updates</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dashboards sync instantly using raw WebSockets without refreshes.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Shield size={20} color="var(--accent-amber)" style={{ marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '2px' }}>Modular Custom Auth</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bcrypt and hand-crafted JWT verification secure patient-doctor logs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Auth Pane */}
      <div className="auth-pane">
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }} className="hide-on-desktop">
            <Activity size={32} color="var(--primary)" />
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)', textAlign: 'center' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
            Log in to manage appointments
          </p>

          {error && (
            <div style={{ background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label className="input-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Logging in...' : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={onRegisterRedirect} 
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

