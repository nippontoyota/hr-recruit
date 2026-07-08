import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { Input, Button } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('admin@nippon.test');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-[#E5E9F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-surface p-8 rounded-md shadow-sm border border-border">
        <div className="text-center pb-2 pt-6">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Nippon Toyota
          </h2>
        </div>
        <div className="mt-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md text-center border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Email address
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nippon.test"
                  error={!!error}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  error={!!error}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-2.5 text-base"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
