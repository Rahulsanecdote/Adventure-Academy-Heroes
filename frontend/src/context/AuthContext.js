import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [child, setChild] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedChild = localStorage.getItem('child');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedChild) setChild(JSON.parse(storedChild));
    }
    setLoading(false);
  }, []);

  const registerParent = async (name, email, password) => {
    try {
      const response = await axios.post(`${API}/auth/parent/register`, {
        name,
        email,
        password
      });
      
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const loginParent = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/parent/login`, {
        email,
        password
      });
      
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const loginChild = async (childId, picturePasswordId) => {
    try {
      const response = await axios.post(`${API}/auth/child/login`, {
        child_id: childId,
        picture_password_id: picturePasswordId
      });
      
      const { access_token, child: childData } = response.data;
      setToken(access_token);
      setChild(childData);
      localStorage.setItem('token', access_token);
      localStorage.setItem('child', JSON.stringify(childData));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setChild(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('child');
  };

  const value = {
    user,
    child,
    token,
    loading,
    registerParent,
    loginParent,
    loginChild,
    logout,
    isAuthenticated: !!token,
    isParent: !!user,
    isChild: !!child
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};