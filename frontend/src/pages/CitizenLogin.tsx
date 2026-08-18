import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/services/api";
import { toast } from "sonner";
import { Users, Mail, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import citizenBg from "@/assets/civic-citizen.jpg";
import PasswordInput from "@/components/PasswordInput";
import SEO from "@/components/SEO";
import { getApiErrorMessage } from "@/utils/api";

const CitizenLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      login(data.user, data.token);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <SEO
        title="Citizen Sign In | CivicChain Puducherry"
        description="Sign in to your CivicChain citizen account to report municipal complaints, track status pipelines, and upvote local issues in Puducherry."
        canonicalUrl="https://civic-chain-tau.vercel.app/login/citizen"
      />

      {/* Left Pane: Immersive Community Image and Overlay */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block bg-zinc-950">
        <img
          src={citizenBg}
          alt="CivicChain Citizen Community Hub in Puducherry"
          className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform scale-105 hover:scale-100"
          style={{ transitionDuration: "12000ms" }}
          loading="eager"
        />
        
        {/* Soft, professional gradient overlay to transition text neatly */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
        
        {/* Modern decorative grid system overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-[0.03] z-10" />

        {/* Community stats showcase */}
        <div className="relative z-20 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md text-white border border-white/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Citizen Hub</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                Empower your local community.
              </h2>
              <p className="max-w-md text-zinc-400 leading-relaxed text-sm">
                Report municipal problems, check active tickets in your area, and watch your neighborhood transform in real-time.
              </p>
            </div>

            {/* Quick Metrics display card */}
            <div className="max-w-sm rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 space-y-3.5">
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">Metropolis Activity</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Issues Solved</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">1,248 total</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Avg Response</span>
                  <p className="text-lg font-bold text-white mt-0.5">48 minutes</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500 font-mono">CivicChain Smart Cities Integrated Environment.</p>
        </div>
      </div>

      {/* Right Pane: Clean Login Form */}
      <main className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2 bg-[#fafafa]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Header block */}
          <header className="space-y-4">
            <Link to="/" className="inline-block">
              <img src="/logo.png" alt="CivicChain Platform Logo" className="h-24 w-auto object-contain" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                <Users className="h-3.5 w-3.5" /> Citizen Portal
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mt-3">Welcome Back</h1>
              <p className="mt-2 text-sm text-zinc-500">Sign in to your dashboard to report or upvote issues.</p>
            </div>
          </header>

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
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
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
                "Sign In to Dashboard"
              )}
            </motion.button>
          </form>

          {/* Footer Navigation links */}
          <div className="border-t border-zinc-200 pt-6 space-y-3.5 text-center text-xs">
            <p className="text-zinc-500">
              Don't have an account?{" "}
              <Link to="/register" className="font-bold text-primary hover:underline">
                Register Citizen Profile
              </Link>
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="h-1 w-1 rounded-full bg-zinc-300" />
              <Link to="/login/authority" className="inline-flex items-center gap-1 font-semibold text-zinc-600 hover:text-zinc-950 transition-colors">
                <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" />
                Access Authority Portal instead
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default CitizenLogin;
