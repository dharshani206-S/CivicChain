import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "citizen" | "authority";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, user, loading } = useAuth();

  // 1. PREVENT EARLY REDIRECTS WHILE SESSION IS VERIFYING ON STARTUP
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 2. ENFORCE PUBLIC / PRIVATE BOUNDARIES
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 3. ENFORCE ROLE SEPARATION
  // Authorities are redirected back to `/authority` if trying to access citizen areas
  if (user?.role === "authority" && requiredRole !== "authority") {
    return <Navigate to="/authority" replace />;
  }

  // Citizens are redirected back to `/dashboard` if trying to access authority areas
  if (user?.role === "citizen" && requiredRole === "authority") {
    return <Navigate to="/dashboard" replace />;
  }

  // Explicit role mismatch check (with Admin bypass exception)
  if (requiredRole && user?.role !== requiredRole && user?.role !== "admin") {
    return <Navigate to={user?.role === "authority" ? "/authority" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
