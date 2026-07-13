import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { Input, Button } from "../components/ui";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials and try again.");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-surface">
      <div className="hidden lg:flex flex-col justify-center bg-primary text-primary-foreground p-10 xl:p-14">
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight text-white text-balance">
            Hire and track candidates with clarity
          </h1>
          <p className="mt-4 text-base text-white/80 leading-relaxed">
            Recruitment portal for HR teams and leadership. Manage pipeline stages, review applications, and keep every hire on record.
          </p>
          <p className="mt-8 text-xs text-white/60">Authorized personnel only</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 bg-content">
        <div className="w-full max-w-[380px]">
          <div className="page-card p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-text-primary">Sign in</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Use your company account to access the recruitment workspace.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div
                  role="alert"
                  className="bg-danger/5 text-danger text-sm p-3 rounded-lg border border-danger/20"
                >
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nippon.test"
                  error={!!error}
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">
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
                  error={!!error}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <Button type="submit" className="w-full h-10" isLoading={isLoading}>
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
