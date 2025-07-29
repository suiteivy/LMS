import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const session = supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      fetchUserRole(session.user.id);
    }
  }, []);

  const fetchUserRole = async (id) => {
    const { data, error } = await supabase.from('users').select('role').eq('id', id).single();
    if (data) setRole(data.role);
  };

  const value = { user, role };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
