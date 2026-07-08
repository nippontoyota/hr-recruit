import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { Card, CardContent, CardHeader, CardTitle, Input, Button } from '../components/ui';
import { Building2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2 border-b-0">
          <div className="mx-auto flex justify-center mb-4">
            <div className="bg-red-50 p-3 rounded-full">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            Nippon Toyota
          </CardTitle>
          <p className="text-sm text-gray-500 mt-2">Recruitment Portal</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md text-center border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              Sign in to account
            </Button>
            
            <div className="mt-6 border-t border-gray-200 pt-4 text-center">
               <p className="text-xs text-gray-500">
                 Dev Mode: Try local@nippon.test, hq@nippon.test, admin@nippon.test
               </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
