'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface TeamleaderIntegration {
  id: string;
  user_id: string | null;
  teamleader_user_id: string;
  user_info: Record<string, unknown>;
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface AdminContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  teamleaderIntegration: TeamleaderIntegration | null;
  refreshTeamleaderIntegration: () => Promise<void>;
  teamleaderLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teamleaderIntegration, setTeamleaderIntegration] = useState<TeamleaderIntegration | null>(null);
  const [teamleaderLoading, setTeamleaderLoading] = useState(false);

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchTeamleaderIntegration = useCallback(async () => {
    if (!isAuthenticated) {
      setTeamleaderIntegration(null);
      return;
    }

    setTeamleaderLoading(true);
    try {
      const response = await fetch('/api/admin/teamleader', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        setTeamleaderIntegration(null);
        return;
      }

      const data = await response.json();
      setTeamleaderIntegration(data.integration ?? null);
    } catch (error) {
      console.error('Failed to fetch Teamleader integration', error);
      setTeamleaderIntegration(null);
    } finally {
      setTeamleaderLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchTeamleaderIntegration();
    } else {
      setTeamleaderIntegration(null);
    }
  }, [isAuthenticated, fetchTeamleaderIntegration]);

  const login = (username: string, password: string): boolean => {
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuth', 'true');
      void fetchTeamleaderIntegration();
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuth');
    setTeamleaderIntegration(null);
  };

  const refreshTeamleaderIntegration = async () => {
    await fetchTeamleaderIntegration();
  };

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        teamleaderIntegration,
        refreshTeamleaderIntegration,
        teamleaderLoading
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
