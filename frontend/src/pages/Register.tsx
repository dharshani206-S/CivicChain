import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "@/services/api";
import { toast } from "sonner";
import { UserPlus, Mail, Lock, User, Loader2, Landmark, Users, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DEPARTMENTS } from "@/constants/departments";
import { getApiErrorMessage } from "@/utils/api";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "authority">("citizen");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.register({
        name,
        email,
        password,
        role,
        department: role === "authority" ? department : undefined
      });
      toast.success("Account created! Please log in.");
      navigate(role === "authority" ? "/login/authority" : "/login/citizen");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-12">
      {/* Decorative grid pattern background */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Header Block */}
        <div className="text-center space-y-4">
          <Link to="/" className="inline-block">
            <img src="/logo.png" alt="CivicChain Logo" className="h-24 w-auto object-contain mx-auto" />
          </Link>
          <div>
            <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <UserPlus className="h-3.5 w-3.5" /> Create Account
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mt-1">Join CivicChain</h1>
            <p className="mt-2 text-sm text-zinc-500">Sign up to submit reports, track details, and participate.</p>
          </div>
        </div>

        {/* Card Form container */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-md">
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-800 outline-none transition-all placeholder-zinc-400 focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

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

          {/* Role selection Cards */}
          <div>
            <label className="mb-2 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Account Role</label>
            <div className="grid grid-cols-2 gap-3">
              {(["citizen", "authority"] as const).map((r) => {
                const Icon = r === "citizen" ? Users : Shield;
                const labelText = r === "citizen" ? "Citizen" : "Officer";
                const descText = r === "citizen" ? "Report & Vote" : "Verify & Assign";
                const isSelected = role === r;
                
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex flex-col items-center justify-center rounded-lg border p-4 text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300"
                    }`}
                  >
                    <Icon className={`h-6 w-6 mb-2 ${isSelected ? "text-primary" : "text-zinc-400"}`} />
                    <span className="text-xs font-bold text-zinc-800">{labelText}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">{descText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliding Department dropdown container */}
          <AnimatePresence>
            {role === "authority" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2">
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
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 text-sm font-semibold text-white shadow-md shadow-primary/10 hover:bg-primary/95 transition-all disabled:opacity-50 mt-6"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create New Account"}
          </motion.button>
        </form>

        {/* Footer Navigation link */}
        <p className="text-center text-xs text-zinc-500">
          Already have an account?{" "}
          <Link to="/login/citizen" className="font-bold text-primary hover:underline">
            Sign In here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
