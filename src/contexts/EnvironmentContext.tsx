import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Environment, EnvironmentData, FirebaseEnvironmentDoc, ENVIRONMENTS } from '@/types/environment';
import { FirebaseService } from '@/services/firebaseService';
import { useToast } from '@/hooks/use-toast';

interface EnvironmentContextType {
  currentEnvironment: Environment;
  setCurrentEnvironment: (env: Environment) => void;
  environmentData: EnvironmentData | null;
  allEnvironments: FirebaseEnvironmentDoc | null;
  loading: boolean;
  error: string | null;
  saveEnvironmentData: (env: Environment, data: Partial<EnvironmentData>) => Promise<boolean>;
  copyEnvironmentConfig: (fromEnv: Environment, toEnv: Environment) => Promise<boolean>;
  refreshEnvironmentData: () => Promise<void>;
  getEnvironmentConfig: () => EnvironmentData | null;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
}

export const EnvironmentProvider: React.FC<EnvironmentProviderProps> = ({ children }) => {
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment>('dev');
  const [allEnvironments, setAllEnvironments] = useState<FirebaseEnvironmentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get current environment data
  const environmentData = allEnvironments?.environments[currentEnvironment] || null;

  // Load environment data from Firebase
  const loadEnvironmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await FirebaseService.getEnvironmentConfig();
      if (data) {
        setAllEnvironments(data);
      } else {
        setError('Failed to load environment configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error loading environment data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save environment data
  const saveEnvironmentData = async (env: Environment, data: Partial<EnvironmentData>): Promise<boolean> => {
    try {
      const success = await FirebaseService.updateEnvironmentData(env, data);
      if (success) {
        await refreshEnvironmentData();
        toast({
          title: "Configuration Saved",
          description: `${ENVIRONMENTS.find(e => e.name === env)?.displayName} configuration updated successfully.`
        });
        return true;
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save environment configuration.",
          variant: "destructive"
        });
        return false;
      }
    } catch (err) {
      console.error('Error saving environment data:', err);
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive"
      });
      return false;
    }
  };

  // Copy configuration between environments
  const copyEnvironmentConfig = async (fromEnv: Environment, toEnv: Environment): Promise<boolean> => {
    try {
      const success = await FirebaseService.copyEnvironmentConfig(fromEnv, toEnv);
      if (success) {
        await refreshEnvironmentData();
        const fromEnvName = ENVIRONMENTS.find(e => e.name === fromEnv)?.displayName;
        const toEnvName = ENVIRONMENTS.find(e => e.name === toEnv)?.displayName;
        toast({
          title: "Configuration Copied",
          description: `Configuration copied from ${fromEnvName} to ${toEnvName}.`
        });
        return true;
      } else {
        toast({
          title: "Copy Failed",
          description: "Failed to copy environment configuration.",
          variant: "destructive"
        });
        return false;
      }
    } catch (err) {
      console.error('Error copying environment config:', err);
      toast({
        title: "Copy Failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive"
      });
      return false;
    }
  };

  // Refresh environment data
  const refreshEnvironmentData = async () => {
    await loadEnvironmentData();
  };

  // Get current environment configuration
  const getEnvironmentConfig = (): EnvironmentData | null => {
    return environmentData;
  };

  // Load data on mount
  useEffect(() => {
    loadEnvironmentData();
  }, []);

  // Load environment preference from localStorage
  useEffect(() => {
    const savedEnv = localStorage.getItem('selectedEnvironment') as Environment;
    if (savedEnv && ENVIRONMENTS.find(e => e.name === savedEnv)) {
      setCurrentEnvironment(savedEnv);
    }
  }, []);

  // Save environment preference to localStorage
  useEffect(() => {
    localStorage.setItem('selectedEnvironment', currentEnvironment);
  }, [currentEnvironment]);

  const value: EnvironmentContextType = {
    currentEnvironment,
    setCurrentEnvironment,
    environmentData,
    allEnvironments,
    loading,
    error,
    saveEnvironmentData,
    copyEnvironmentConfig,
    refreshEnvironmentData,
    getEnvironmentConfig
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = (): EnvironmentContextType => {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
};

export default EnvironmentContext;