import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsMessage, setWsMessage] = useState(null);
  const wsRef = useRef(null);

  // Load user details from localStorage on initial render
  useEffect(() => {
    const savedToken = localStorage.getItem('hv_token');
    const savedUser = localStorage.getItem('hv_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Configure WebSocket whenever user/token status changes
  useEffect(() => {
    if (token && user) {
      // Connect to WebSocket using the absolute environment config or default
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
      const cleanHost = apiUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${cleanHost}/ws/${user.role}/${user.user_id}?token=${token}`;

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection successfully opened');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          setWsMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket data:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.reason);
      };

      ws.onerror = (error) => {
        console.error('WebSocket encountered an error:', error);
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsMessage(null);
    }
  }, [token, user]);

  const login = async (email, password) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('hv_token', data.access_token);
    const userProfile = {
      user_id: data.user_id,
      email: email,
      role: data.role,
      full_name: data.full_name,
      specialty: data.specialty || null,
    };
    localStorage.setItem('hv_user', JSON.stringify(userProfile));
    
    setToken(data.access_token);
    setUser(userProfile);
    return userProfile;
  };

  const registerPatient = async (email, password, fullName) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const res = await fetch(`${apiUrl}/auth/register/patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || 'Registration failed');
    }
    return res.json();
  };

  const registerDoctor = async (email, password, fullName, specialty) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const res = await fetch(`${apiUrl}/auth/register/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, specialty }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || 'Registration failed');
    }
    return res.json();
  };

  const logout = () => {
    localStorage.removeItem('hv_token');
    localStorage.removeItem('hv_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, registerPatient, registerDoctor, wsMessage, setWsMessage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
