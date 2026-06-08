import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import BookAppointment from './BookAppointment';
import { Calendar, Stethoscope, Clock, Bell, UserPlus, CheckCircle, XCircle } from 'lucide-react';

const PatientDashboard = () => {
  const { token, wsMessage, setWsMessage } = useAuth();
  
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingAppts, setLoadingAppts] = useState(false);
  
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDoctors = async () => {
    setLoadingDocs(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/doctors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppts(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
  }, []);

  // Listen to WebSocket messages
  useEffect(() => {
    if (wsMessage) {
      if (wsMessage.type === 'appointment_update') {
        // Show live notification toast
        setNotification({
          id: wsMessage.appointment_id,
          message: wsMessage.message,
          status: wsMessage.status
        });
        
        // Instantly refresh appointments without manual page reload!
        fetchAppointments();
        
        // Auto-dismiss notification after 5 seconds
        const timer = setTimeout(() => {
          setNotification(null);
        }, 5000);

        // Clear the message in context so it doesn't trigger again
        setWsMessage(null);

        return () => clearTimeout(timer);
      }
    }
  }, [wsMessage]);

  const handleBookingSuccess = () => {
    setSelectedDoctor(null);
    fetchAppointments();
  };

  const formatTime = (timeStr) => {
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Real-time Notification Banner */}
      {notification && (
        <div 
          className="glass" 
          style={{ 
            background: notification.status === 'confirmed' ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)',
            border: `1px solid ${notification.status === 'confirmed' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            color: notification.status === 'confirmed' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'pulse 2s infinite',
            fontWeight: 600,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <Bell size={24} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Live Update</div>
            <div style={{ fontSize: '1rem' }}>{notification.message}</div>
          </div>
          <button 
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ×
          </button>
        </div>
      )}

      {selectedDoctor ? (
        <BookAppointment 
          selectedDoctor={selectedDoctor}
          onBookingSuccess={handleBookingSuccess}
          onCancel={() => setSelectedDoctor(null)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
            
            {/* Booked Appointments section */}
            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={22} color="var(--primary)" />
                Your Appointments
              </h3>

              {loadingAppts ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading your schedules...</p>
              ) : appointments.length === 0 ? (
                <div style={{ padding: '2.5rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You have no appointments booked yet.</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Choose a doctor from the panel to view availability slots.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {appointments.map((appt) => (
                    <div 
                      key={appt.id} 
                      className="glass" 
                      style={{ 
                        padding: '1.25rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        borderLeft: `4px solid ${
                          appt.status === 'confirmed' ? 'var(--accent-emerald)' : 
                          appt.status === 'cancelled' ? 'var(--accent-rose)' : 'var(--accent-amber)'
                        }`,
                        // highlight animations if this just changed
                        animation: notification?.id === appt.id ? 'pulse 2s infinite' : 'none'
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{appt.doctor_name}</h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Specialty: {appt.specialty}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} /> {appt.appointment_date}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} /> {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className={`badge badge-${appt.status}`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Doctors list section */}
            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={22} color="var(--primary)" />
                Available Doctors
              </h3>

              {/* Search input filter */}
              <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search name or specialty..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                />
              </div>

              {loadingDocs ? (
                <p style={{ color: 'var(--text-secondary)' }}>Searching doctors...</p>
              ) : doctors.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No doctors registered in HealthVerse.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {doctors.filter(doc => 
                    doc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((doc) => (
                    <div 
                      key={doc.id} 
                      className="glass-interactive" 
                      style={{ 
                        padding: '1.25rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{doc.full_name}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{doc.specialty}</p>
                      </div>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => setSelectedDoctor(doc)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', gap: '4px' }}
                      >
                        <UserPlus size={14} />
                        Slots
                      </button>
                    </div>
                  ))}
                  {doctors.filter(doc => 
                    doc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                      No matching doctors found.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
