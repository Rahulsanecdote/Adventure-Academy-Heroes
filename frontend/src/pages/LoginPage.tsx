import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GameButton } from '../components/ui/GameButton';
import { Input } from '../components/ui/Input';
import { GameCard } from '../components/ui/GameCard';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/parent/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-roblox-blue via-indigo-600 to-purple-600">
      <GameCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-4xl font-game font-bold text-gray-800 mb-2">
            KidQuest Academy
          </h1>
          <p className="text-xl font-display font-bold text-roblox-blue">Parent Login</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@example.com"
            className="input-game"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-game"
            required
          />

          {error && (
            <div className="mb-4 p-4 bg-red-100 border-4 border-red-400 text-red-700 rounded-xl font-semibold">
              {error}
            </div>
          )}

          <GameButton
            type="submit"
            className="w-full mb-4"
            disabled={loading}
            size="lg"
          >
            {loading ? 'Logging in...' : '🔑 Login'}
          </GameButton>

          <p className="text-center text-gray-600 font-semibold">
            Don't have an account?{' '}
            <Link to="/signup" className="text-roblox-blue hover:text-roblox-darkblue font-bold">
              Sign up
            </Link>
          </p>

          <p className="text-center text-gray-500 text-sm mt-4">
            <Link to="/" className="hover:text-roblox-blue font-semibold">
              ← Back to Home
            </Link>
          </p>
        </form>
      </GameCard>
    </div>
  );
};