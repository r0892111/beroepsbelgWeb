'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

type TeamleaderIntegration = Record<string, unknown> | null;

interface AdminContextType {
  isAuthenticated: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; redirected?: boolean }>;
  logout: () => Promise<void>;
  teamleaderIntegration: TeamleaderIntegration | null;
  refreshTeamleaderIntegration: () => Promise<void>;
  teamleaderLoading: boolean;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teamleaderIntegration, setTeamleaderIntegration] = useState<TeamleaderIntegration | null>(null);
  const [teamleaderLoading, setTeamleaderLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Failed to check session', error);
      } finally {
        setLoading(false);
      }
    };

    void checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        setTeamleaderIntegration(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTeamleaderIntegration = useCallback(async () => {
    if (!isAuthenticated) {
      setTeamleaderIntegration(null);
      return;
    }

    setTeamleaderLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setTeamleaderIntegration(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        integration?: TeamleaderIntegration;
        error?: string;
      }>('teamleader-auth', {
        body: {
          action: 'status',
          user_id: session.user.id
        }
      });

      if (error || !data?.success) {
        console.error('Failed to fetch Teamleader integration', error || data?.error);
        setTeamleaderIntegration(null);
        return;
      }

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

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string; redirected?: boolean }> => {
    if (username !== 'admin' || password !== 'admin123') {
      return { success: false, error: 'Invalid credentials' };
    }

    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        session_url?: string;
        error?: string;
      }>('teamleader-auth', {
        body: {
          action: 'admin-login',
          username,
          password
        }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Failed to authenticate' };
      }

      if (data.session_url) {
        window.location.href = data.session_url;
        return { success: true, redirected: true };
      }

      return { success: false, error: 'Failed to create session' };
    } catch (error) {
      console.error('Login error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setTeamleaderIntegration(null);
  };

  const refreshTeamleaderIntegration = () => fetchTeamleaderIntegration();

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        teamleaderIntegration,
        refreshTeamleaderIntegration,
        teamleaderLoading,
        loading
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
