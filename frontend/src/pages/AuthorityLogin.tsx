import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/services/api";
import { toast } from "sonner";
import { Shield, Mail, Lock, Loader2, Landmark, Users } from "lucide-react";
import { motion } from "framer-motion";
import authorityBg from "@/assets/civic-authority.jpg";
import { DEPARTMENTS } from "@/constants/departments";
import { getApiErrorMessage } from "@/utils/api";

const AuthorityLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password, department });
      login(data.user, data.token);
      toast.success("Welcome back, Officer!");
      navigate("/dashboard");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Pane: Command Center Image and Overlay */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block bg-zinc-950">
        <img
          src={authorityBg}
          alt="Command center"
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform scale-105 hover:scale-100"
          style={{ transitionDuration: "12000ms" }}
          loading="eager"
        />
        
        {/* Deep navy/slate gradient overlay for professional tone */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent z-10" />
        
        {/* Modern decorative grid system overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-[0.03] z-10" />

        {/* Command center activity showcase */}
        <div className="relative z-20 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md text-white border border-white/20">
              <Landmark className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Authority Console</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                Manage city operations.
              </h2>
              <p className="max-w-md text-zinc-400 leading-relaxed text-sm">
                Access dispatch routing, prioritize community tickets, and update issue resolution progress directly to local citizens.
              </p>
            </div>

            {/* Quick Metrics display card */}
            <div className="max-w-sm rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 space-y-3.5">
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">Console Overview</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Active Operators</span>
                  <p className="text-lg font-bold text-primary-foreground mt-0.5">12 Online</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Task Completion</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">98.4% Rate</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500 font-mono">CivicChain Command Center Secure Interface.</p>
        </div>
      </div>

      {/* Right Pane: Clean Login Form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2 bg-[#fafafa]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Header block */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img src="/logo.png" alt="CivicChain Logo" className="h-24 w-auto object-contain" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                <Shield className="h-3.5 w-3.5" /> Authority Portal
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mt-3">Officer Access</h1>
              <p className="mt-2 text-sm text-zinc-500">Sign in to review and transition municipal tickets.</p>
            </div>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-800 outline-none transition-all placeholder-zinc-400 focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                  placeholder="officer@metropolis.gov"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-800 outline-none transition-all placeholder-zinc-400 focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Department</label>
              <div className="relative">
                <Landmark className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-800 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm appearance-none"
                >
                  <option value="">Select your department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 text-sm font-semibold text-white shadow-md shadow-primary/10 hover:bg-primary/95 transition-all disabled:opacity-50 mt-6"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Authenticate & Open Console"
              )}
            </motion.button>
          </form>

          {/* Footer Navigation links */}
          <div className="border-t border-zinc-200 pt-6 space-y-3.5 text-center text-xs">
            <p className="text-zinc-500">
              Need a department account?{" "}
              <Link to="/register" className="font-bold text-primary hover:underline">
                Register Profile
              </Link>
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-300" />
              <Link to="/login/citizen" className="inline-flex items-center gap-1 font-semibold text-zinc-600 hover:text-zinc-950 transition-colors">
                <Users className="h-3.5 w-3.5 text-zinc-400" />
                Sign in to Citizen Portal instead
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthorityLogin;
