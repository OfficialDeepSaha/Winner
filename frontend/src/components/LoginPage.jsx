import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    clearError();

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by the auth hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setUsername('demo');
    setPassword('demo123');
    setIsLoading(true);
    clearError();

    try {
      await login('demo', 'demo123');
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by the auth hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Brain className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Smart Todo List
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            AI-Powered Task Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !username || !password}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or try demo
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleDemoLogin}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Demo Login
              </Button>
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Demo credentials:</p>
              <p>Username: <code className="bg-muted px-1 rounded">deepsaha</code></p>
              <p>Password: <code className="bg-muted px-1 rounded">deePs223@#</code></p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Powered by AI for intelligent task management
          </p>
          <div className="flex justify-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
            <span>✨ Smart Prioritization</span>
            <span>🤖 AI Suggestions</span>
            <span>📊 Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

