import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, HeartPulse, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout, token } = useAuth();

  return (
    <header className="glass" style={{ margin: '1rem', borderBottom: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HeartPulse size={32} color="var(--primary)" style={{ animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #ffffff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            HealthVerse
          </span>
        </div>

        {/* User Info & Actions */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="live-dot" title="Live Sync Active"></div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Live Sync</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.04)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
              <User size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {user.full_name} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({user.role})</span>
              </span>
            </div>

            <button className="btn btn-secondary" onClick={logout} style={{ padding: '8px 14px', display: 'flex', gap: '6px', fontSize: '0.9rem' }}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Welcome to the next gen patient care</span>
        )}
        
      </div>
    </header>
  );
};

export default Navbar;
