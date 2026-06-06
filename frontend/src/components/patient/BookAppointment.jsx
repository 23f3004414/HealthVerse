import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const BookAppointment = ({ selectedDoctor, onBookingSuccess, onCancel }) => {
  const { token } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSlots = async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/doctors/${selectedDoctor.id}/slots?available_only=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load slots');
      }
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      setError(err.message || 'Error loading slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctor) {
      fetchSlots();
    }
  }, [selectedDoctor]);

  const handleBook = async (slotId) => {
    setBookingLoading(true);
    setError('');
    setSuccess('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slot_id: slotId })
      });

      const data = await res.json();

      if (!res.ok) {
        // This is where double-booking / lock contention error will catch!
        throw new Error(data.detail || 'Booking failed');
      }

      setSuccess('Appointment booked successfully!');
      setTimeout(() => {
        onBookingSuccess();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error booking appointment');
      // Refresh slots on failure (in case the slot was just taken)
      fetchSlots();
    } finally {
      setBookingLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    // Strip seconds if present
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>Book Appointment</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            with <strong>{selectedDoctor.full_name}</strong> ({selectedDoctor.specialty})
          </p>
        </div>
        <button className="btn btn-secondary" onClick={onCancel} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
          Back to List
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 500 }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'var(--accent-emerald-light)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 500 }}>
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '10px' }} />
          <div>Retrieving available slots...</div>
        </div>
      ) : slots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            No open availability slots found for this doctor.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <Clock size={16} />
            <span>Select from available slots below:</span>
          </div>

          <div className="grid-3">
            {slots.map((slot) => (
              <div 
                key={slot.id} 
                className="glass-interactive" 
                style={{ 
                  padding: '1.25rem', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                  <Calendar size={16} color="var(--primary)" />
                  {slot.slot_date}
                </div>
                
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '6px 12px', fontSize: '0.85rem', marginTop: '4px' }}
                  onClick={() => handleBook(slot.id)}
                  disabled={bookingLoading}
                >
                  Book Slot
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
