import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { Input, Button } from "../components/ui";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success("Successfully logged in");
      
      // Get the updated user from local storage (or we could return it from login)
      const storedUser = localStorage.getItem('user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      
      // Prevent non-admins from being redirected to admin routes if they logged out from there
      let targetPath = from;
      if (parsedUser && parsedUser.role !== 'ADMIN' && targetPath.startsWith('/admin')) {
        targetPath = '/';
      }
      
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || err.message || "Login failed. Check your credentials and try again.");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left Branding Side */}
      <div className="hidden lg:flex flex-col justify-center bg-primary text-primary-foreground p-12 xl:p-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent pointer-events-none"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white/5 blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 max-w-lg">
          <div className="mb-12 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-accent font-extrabold text-white tracking-tight leading-[1.1] text-balance">
            Nippon Recruitment CRM
          </h1>
          <p className="mt-6 text-xl text-white/90 leading-relaxed font-medium text-balance">
            Streamline your hiring pipeline, review applications, and manage candidates with absolute precision.
          </p>
          <div className="mt-16 flex items-center gap-4">
            <div className="w-12 h-1 bg-white/30 rounded-full"></div>
            <p className="text-xs font-bold text-white/60 tracking-widest uppercase">Authorized personnel only</p>
          </div>
        </div>
      </div>

      {/* Right Login Form Side */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[440px] relative z-10">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-accent font-extrabold text-text-primary tracking-tight">Welcome back</h2>
            <p className="mt-3 text-base text-text-secondary">
              Use your company account to access the recruitment workspace.
            </p>
          </div>

          <div className="bg-surface border border-border/60 shadow-lg shadow-black/5 rounded-3xl p-8 sm:p-10">
            <form className="space-y-7" onSubmit={handleSubmit}>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-text-primary">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nippon.local"
                  className="h-12 text-base px-4 rounded-xl bg-muted/30 focus:bg-surface transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-bold text-text-primary">
                  Password
                </label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 text-base px-4 rounded-xl bg-muted/30 focus:bg-surface transition-colors pr-12"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center w-10 h-10 mr-1 rounded-lg hover:bg-muted/50"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl shadow-md mt-2" isLoading={isLoading}>
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
