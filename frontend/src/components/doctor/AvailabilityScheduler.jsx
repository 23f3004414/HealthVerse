import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, Plus, CheckCircle, AlertTriangle } from 'lucide-react';

const AvailabilityScheduler = ({ onSlotCreated }) => {
  const { token } = useAuth();
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Basic client validation
      if (startTime >= endTime) {
        throw new Error('Start time must be before end time.');
      }

      // Format time as hh:mm:ss for postgres/pydantic validation compatibility
      const startWithSeconds = `${startTime}:00`;
      const endWithSeconds = `${endTime}:00`;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/doctors/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          slot_date: slotDate,
          start_time: startWithSeconds,
          end_time: endWithSeconds
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create availability slot.');
      }

      setSuccess('Slot created successfully!');
      setSlotDate('');
      setStartTime('');
      setEndTime('');
      onSlotCreated();
      
      // Auto-clear success banner
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error creating slot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Plus size={22} color="var(--primary)" />
        Add Availability Slot
      </h3>

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

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label" htmlFor="slotDate">Date</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              id="slotDate"
              type="date"
              className="input-field"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              style={{ paddingLeft: '44px' }}
              min={new Date().toISOString().split('T')[0]} // Block historical slots
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="startTime">Start Time</label>
            <div style={{ position: 'relative' }}>
              <Clock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="startTime"
                type="time"
                className="input-field"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="endTime">End Time</label>
            <div style={{ position: 'relative' }}>
              <Clock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="endTime"
                type="time"
                className="input-field"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
          {loading ? 'Creating...' : 'Create Availability Slot'}
        </button>
      </form>
    </div>
  );
};

export default AvailabilityScheduler;
