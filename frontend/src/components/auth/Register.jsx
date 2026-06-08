import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, Award, UserPlus, Activity, Heart, Shield, Zap } from 'lucide-react';

const Register = ({ onLoginRedirect }) => {
  const { registerPatient, registerDoctor } = useAuth();
  const [role, setRole] = useState('patient'); // 'patient' or 'doctor'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      if (role === 'patient') {
        await registerPatient(email, password, fullName);
      } else {
        if (!specialty) {
          throw new Error('Specialty is required for doctors.');
        }
        await registerDoctor(email, password, fullName, specialty);
      }
      setSuccess('Registration successful! Redirecting to login page...');
      setTimeout(() => {
        onLoginRedirect();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)', textAlign: 'center' }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            Join HealthVerse and manage medical visits seamlessly
          </p>

          {/* Role Selector Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => { setRole('patient'); setError(''); }}
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                backgroundColor: role === 'patient' ? 'var(--primary)' : 'transparent',
                color: role === 'patient' ? '#fff' : 'var(--text-secondary)',
                transition: 'var(--transition-fast)'
              }}
            >
              Patient Signup
            </button>
            <button
              type="button"
              onClick={() => { setRole('doctor'); setError(''); }}
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                backgroundColor: role === 'doctor' ? 'var(--primary)' : 'transparent',
                color: role === 'doctor' ? '#fff' : 'var(--text-secondary)',
                transition: 'var(--transition-fast)'
              }}
            >
              Doctor Signup
            </button>
          </div>

          {error && (
            <div style={{ background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: 'var(--accent-emerald-light)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 500 }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="fullName">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="fullName"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Dr. House or John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

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

            {role === 'doctor' && (
              <div className="input-group">
                <label className="input-label" htmlFor="specialty">Medical Specialty</label>
                <div style={{ position: 'relative' }}>
                  <Award size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="specialty"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Neurosurgery, General Medicine"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                    required={role === 'doctor'}
                  />
                </div>
              </div>
            )}

            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label className="input-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Creating Account...' : (
                <>
                  <UserPlus size={18} />
                  Sign Up
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button 
              type="button" 
              onClick={onLoginRedirect} 
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

