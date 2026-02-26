import React, { createContext, useContext, useState, useEffect } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  async function login(identifier, password) {
    // Accept email or username. First try normalized username (local-part),
    // then retry with the original identifier (full email) if authentication fails.
    const original = (identifier || '').trim();
    let username = original;
    if (username.includes('@')) username = username.split('@')[0];
    const payload = { username, password };

    try {
      const res = await api.post('/login', payload);
      const { token: newToken, user: u } = res.data;
      if (newToken) setToken(newToken);
      setUser(u);
      return u;
    } catch (err) {
      // If backend returned 401 and user supplied an email, try authenticating with the full identifier
      if (original.includes('@') && err.response?.status === 401) {
        try {
          const res2 = await api.post('/login', { username: original, password });
          const { token: newToken, user: u } = res2.data;
          if (newToken) setToken(newToken);
          setUser(u);
          return u;
        } catch (err2) {
          // fall through to rethrow original error
        }
      }

      // Provide a clearer error message when the backend is unreachable
      if (!err || !err.response) {
        throw new Error('Network error: cannot reach API server. Is the backend running?');
      }
      throw err;
    }
  }

  function logout() {
    setUser(null)
    setToken(null)
  }

  function isOwner() {
    return user?.role === 'owner' || user?.role === 'admin'
  }

  function isMerchant() {
    return user?.role === 'merchant'
  }

  function isCustomer() {
    return user?.role === 'customer'
  }

  function isLoggedIn() {
    return !!user && !!token
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        login,
        logout,
        isOwner,
        isMerchant,
        isCustomer,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
