import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PatientDashboard from './components/patient/PatientDashboard';
import DoctorDashboard from './components/doctor/DoctorDashboard';
import { RefreshCw } from 'lucide-react';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState('login'); // 'login' or 'register'

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: '1rem' }}>
        <RefreshCw size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Initializing HealthVerse...</span>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        {user ? (
          user.role === 'patient' ? (
            <PatientDashboard />
          ) : (
            <DoctorDashboard />
          )
        ) : (
          view === 'login' ? (
            <Login onRegisterRedirect={() => setView('register')} />
          ) : (
            <Register onLoginRedirect={() => setView('login')} />
          )
        )}
      </main>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
