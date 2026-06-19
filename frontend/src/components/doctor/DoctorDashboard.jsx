import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AvailabilityScheduler from './AvailabilityScheduler';
import { Calendar, Users, Clock, Bell, Check, X, ShieldAlert, Heart } from 'lucide-react';

const DoctorDashboard = () => {
  const { token, wsMessage, setWsMessage } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [activityLog, setActivityLog] = useState([
    { id: 'init', time: new Date().toLocaleTimeString(), message: 'Connected to HealthVerse Live Feed.' }
  ]);

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

  const fetchSlots = async () => {
    setLoadingSlots(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/doctors/slots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchSlots();
  }, []);

  // Listen to WebSocket messages
  useEffect(() => {
    if (wsMessage) {
      if (wsMessage.type === 'new_booking') {
        // Show live notification toast
        setNotification({
          message: wsMessage.message,
        });
        
        // Record to Live Activity Log
        setActivityLog(prev => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            message: wsMessage.message,
            type: 'booking'
          },
          ...prev
        ]);

        // Refresh appointments lists instantly without reload!
        fetchAppointments();
        fetchSlots(); // refresh slot states as one was just booked
        
        // Clear warning toast after 6s
        const timer = setTimeout(() => {
          setNotification(null);
        }, 6000);

        setWsMessage(null);

        return () => clearTimeout(timer);
      }
    }
  }, [wsMessage]);

  const handleUpdateStatus = async (apptId, newStatus) => {
    setActionLoading(apptId);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update status');
      }

      // Success
      fetchAppointments();
      fetchSlots(); // in case slot was set free
    } catch (err) {
      alert(err.message || 'Error updating status');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (timeStr) => {
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* WebSocket Real-time Booking Notification */}
      {notification && (
        <div 
          className="glass" 
          style={{ 
            background: 'var(--primary-light)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'pulse 1.6s infinite',
            fontWeight: 600,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <Bell size={24} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Live Booking Request</div>
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

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '0.5rem' }}>
        <div className="glass metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Bookings</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '2px' }}>{appointments.length}</div>
          </div>
        </div>

        <div className="glass metric-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ background: 'var(--accent-amber-light)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            <Bell size={24} color="var(--accent-amber)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Pending Reviews</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '2px' }}>{appointments.filter(a => a.status === 'pending').length}</div>
          </div>
        </div>

        <div className="glass metric-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ background: 'var(--accent-emerald-light)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={24} color="var(--accent-emerald)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Open Slots</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '2px' }}>{slots.filter(s => !s.is_booked).length}</div>
          </div>
        </div>

        <div className="glass metric-card" style={{ borderLeft: '4px solid var(--text-muted)' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            <Clock size={24} color="var(--text-secondary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Slots</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '2px' }}>{slots.length}</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Appointments column */}
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} color="var(--primary)" />
            Patient Bookings
          </h3>

          {loadingAppts ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <div style={{ padding: '2.5rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No patients have booked appointments with you yet.</p>
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
                    }`
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{appt.patient_name}</h4>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} /> {appt.appointment_date}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge badge-${appt.status}`} style={{ marginRight: '8px' }}>
                      {appt.status}
                    </span>

                    {appt.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-success" 
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                          disabled={actionLoading === appt.id}
                        >
                          <Check size={14} /> Confirm
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                          disabled={actionLoading === appt.id}
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    )}

                    {appt.status === 'confirmed' && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                        disabled={actionLoading === appt.id}
                      >
                        <X size={14} /> Cancel Visit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Activity Log */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', marginTop: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-dot" title="Live Sync Active"></span>
            Live Activity Feed
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
            {activityLog.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', padding: '6px 10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{log.time}</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule/Availability column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Add schedule form */}
          <AvailabilityScheduler onSlotCreated={fetchSlots} />

          {/* Existing Slots */}
          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--primary)" />
              Your Set Slots
            </h3>

            {loadingSlots ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading slots...</p>
            ) : slots.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No schedule slots added yet. Use the form above to add slots.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {slots.map((slot) => (
                  <div 
                    key={slot.id} 
                    className="glass" 
                    style={{ 
                      padding: '10px 14px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.85rem' 
                    }}
                  >
                    <div>
                      <strong>{slot.slot_date}</strong>: {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </div>
                    <div>
                      <span className={`badge badge-${slot.is_booked ? 'confirmed' : 'pending'}`}>
                        {slot.is_booked ? 'Booked' : 'Free'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboard;
