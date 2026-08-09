import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  Menu,
  X,
  PlusCircle,
  LayoutDashboard,
  Bell,
  Search,
  ChevronDown,
  LogIn,
  UserPlus,
  FileText,
  Home,
  TrendingUp,
  MapPin,
  BarChart3
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path || (path === "/authority/dashboard" && location.pathname === "/authority");

  // 1. DYNAMIC NAVIGATION LINKS BASED ON AUTH ROLE
  const links = isAuthenticated
    ? user?.role === "authority"
      ? [
          { to: "/authority/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/authority/stats", label: "Stats", icon: BarChart3 },
          { to: "/authority/issues", label: "Issues", icon: FileText },
          { to: "/authority/upvoted", label: "Upvoted", icon: TrendingUp },
          { to: "/authority/heatmap", label: "Heat Map", icon: MapPin },
        ]
      : [
          { to: "/", label: "Home", icon: Home },
          { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/my-stats", label: "My Stats", icon: BarChart3 },
          { to: "/issues", label: "Issues", icon: FileText },
          { to: "/report", label: "Report Issue", icon: PlusCircle },
        ]
    : [
        { to: "/", label: "Home", icon: Home },
        { to: "/issues", label: "Issues", icon: FileText },
        { to: "/#about", label: "About", icon: Home, hashLink: true },
      ];

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo Brand on Left */}
          <Link to={isAuthenticated ? (user?.role === "authority" ? "/authority" : "/dashboard") : "/"} className="flex items-center gap-2.5 sm:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md shrink-0">
            <img src="/favicon.png" alt="CivicChain Emblem" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
            <span className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-950 font-sans">CivicChain</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              if (l.hashLink) {
                return (
                  <a
                    key={l.to}
                    href={l.to}
                    className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 transition-all focus:outline-none"
                  >
                    {l.label}
                  </a>
                );
              }
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive(l.to)
                      ? "text-primary bg-primary/5"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Right Area: Session Controls OR Guest Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {/* Notifications Trigger */}
                <div className="relative">
                  <button
                    onClick={() => { setNotifOpen(!notifOpen); setUserDropdownOpen(false); }}
                    className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors focus:outline-none"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
                    </span>
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 z-40 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
                        >
                          <h4 className="font-bold text-zinc-900 text-sm mb-3">Recent Notifications</h4>
                          <div className="space-y-3">
                            <div className="flex items-start gap-2.5 text-xs text-zinc-500 leading-normal border-b border-zinc-100 pb-2">
                              <span className="h-2 w-2 rounded-full bg-secondary shrink-0 mt-1.5" />
                              <div>
                                <p className="font-medium text-zinc-800 font-sans">Dispatch Queue Status</p>
                                <p>Report updates assigned to your regional dispatcher pipeline.</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setUserDropdownOpen(!userDropdownOpen); setNotifOpen(false); }}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white py-1.5 pl-2.5 pr-2 hover:bg-zinc-50 transition-all shadow-sm"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-xs font-bold text-zinc-700 border border-zinc-200">
                      {getInitials(user?.name)}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="max-w-[80px] truncate text-[11px] font-bold text-zinc-900 leading-none">{user?.name}</p>
                      <p className="text-[9px] capitalize text-zinc-500 mt-1 leading-none">{user?.role}</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setUserDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 z-40 w-52 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl"
                        >
                          <div className="px-3 py-2 border-b border-zinc-100">
                            <p className="text-xs font-bold text-zinc-900 truncate">{user?.name}</p>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{user?.email}</p>
                          </div>
                          <div className="py-1">
                            <button
                              onClick={handleLogout}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                            >
                              <LogOut className="h-4 w-4" />
                              Logout Profile
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login/citizen"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm"
                >
                  <LogIn className="h-4 w-4 text-zinc-400" /> Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-900 transition-all shadow-md"
                >
                  <UserPlus className="h-4 w-4 text-zinc-400" /> Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden focus:outline-none"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-zinc-200 bg-white px-4 py-4 md:hidden overflow-hidden shadow-inner"
          >
            <div className="space-y-1">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    isActive(l.to)
                      ? "text-primary bg-primary/5"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              
              {!isAuthenticated && (
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-zinc-150 mt-4">
                  <Link
                    to="/login/citizen"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2.5 text-center text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50"
                  >
                    <LogIn className="h-4 w-4" /> Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-center text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800"
                  >
                    <UserPlus className="h-4 w-4" /> Register
                  </Link>
                </div>
              )}

              {isAuthenticated && (
                <div className="border-t border-zinc-100 my-3 pt-3">
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4.5 w-4.5" /> Logout Account
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
