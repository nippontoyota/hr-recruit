import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { Input, Button } from '../components/ui';
import { BrandMark } from '../components/layout/BrandMark';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { extractError } from '../lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  // If already authenticated, redirect straight to the destination
  useEffect(() => {
    if (user && !isLoading) {
      const destination = (from && from !== '/' && from !== '/login')
        ? from
        : (user.role === 'ADMIN' ? '/admin/dashboard' : '/candidates');
      const target = (user.role !== 'ADMIN' && destination.startsWith('/admin')) ? '/candidates' : destination;
      navigate(target, { replace: true });
    }
  }, [user, isLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLoading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(trimmedEmail, password);

      const destination = (from && from !== '/' && from !== '/login')
        ? from
        : (loggedInUser.role === 'ADMIN' ? '/admin/dashboard' : '/candidates');

      const targetPath = (loggedInUser.role !== 'ADMIN' && destination.startsWith('/admin'))
        ? '/candidates'
        : destination;

      toast.success(`Signed in as ${loggedInUser.full_name || loggedInUser.email}`, {
        id: 'auth-status',
        duration: 3500,
      });

      navigate(targetPath, { replace: true });
    } catch (err: any) {
      const message = extractError(err, 'Sign in failed. Check your email and password.');
      setFormError(message);
      toast.error(message, { id: 'auth-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex xl:p-16">
        <BrandMark inverted subtitle="Recruitment" />
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight text-white text-balance">
            Hiring work, in one place
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-white/90">
            Review candidates, send forms, and move people through each hiring stage.
          </p>
        </div>
        <p className="text-sm text-white/70">Nippon Toyota HR</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <BrandMark subtitle="Recruitment" />
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">Sign in</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Use your company account to open the recruitment workspace.
            </p>
          </div>

          <form aria-label="Sign in to Nippon Recruitment CRM" className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
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
                placeholder="you@nippontoyota.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pr-12"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="mr-0.5 flex h-10 w-10 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
              />
            </div>

            {formError && (
              <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            )}

            <Button type="submit" className="mt-1 w-full" isLoading={isLoading || isSubmitting} disabled={isLoading || isSubmitting}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
