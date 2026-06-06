import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, ShieldAlert, Award, UserPlus } from 'lucide-react';

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh', padding: '1rem' }}>
      <div className="glass" style={{ width: '100%', maxWidth: '460px', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
        
        <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Create Account</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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
            I am a Patient
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
            I am a Doctor
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
                placeholder="Dr. Gregory House or John Doe"
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
                  placeholder="e.g. Neurosurgery, Pediatrics"
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
  );
};

export default Register;
