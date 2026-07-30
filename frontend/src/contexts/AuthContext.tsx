import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authAPI } from "@/services/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "authority" | "admin";
  department?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 1. SYNCHRONOUSLY RESTORE SESSION ON APP INITIALIZATION
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? (JSON.parse(savedUser) as User) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // 2. VERIFY JWT VALIDITY ON APP STARTUP
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch current session details from /auth/me
        const res = await authAPI.getMe();
        const apiUser = res.data as any;
        const freshUser: User = {
          id: apiUser.id || apiUser._id,
          name: apiUser.name,
          email: apiUser.email,
          role: apiUser.role,
          department: apiUser.department
        };
        
        // Sync user state with fresh database records
        setUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
      } catch (error: any) {
        // If unauthorized (401/403) or token invalid, clear session
        console.error("Session verification failed, logging out:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const login = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
