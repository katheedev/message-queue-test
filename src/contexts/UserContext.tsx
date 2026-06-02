import React, { createContext, useContext, useEffect, useState } from "react";
import { SessionUser } from "@/types/environment";
import { UserService } from "@/services/userService";

interface UserContextType {
  currentUser: SessionUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const SESSION_STORAGE_KEY = "mq-tester:session-user-id";

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    const storedUserId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedUserId) {
      setCurrentUser(null);
      return;
    }

    const user = await UserService.getUser(storedUserId);
    if (!user || !user.active) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setCurrentUser(null);
      return;
    }

    setCurrentUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
    });
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await UserService.ensureBootstrapAdmin();
        await refreshSession();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const sessionUser = await UserService.authenticate(email, password);
    localStorage.setItem(SESSION_STORAGE_KEY, sessionUser.id);
    setCurrentUser(sessionUser);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        loading,
        isAdmin: currentUser?.role === "admin",
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
