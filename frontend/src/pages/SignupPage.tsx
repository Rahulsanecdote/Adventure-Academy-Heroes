import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GameButton } from '../components/ui/GameButton';
import { Input } from '../components/ui/Input';
import { GameCard } from '../components/ui/GameCard';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
      navigate('/parent/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-roblox-green via-emerald-500 to-teal-600">
      <GameCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-game font-bold text-gray-800 mb-2">
            KidQuest Academy
          </h1>
          <p className="text-xl font-display font-bold text-roblox-green">Create Parent Account</p>
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

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="input-game"
            required
          />

          <div className="mb-6">
            <label className="flex items-start p-4 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 mr-3 w-5 h-5"
              />
              <span className="text-sm text-gray-700 font-semibold">
                I agree to the{' '}
                <a href="#" className="text-roblox-blue hover:text-roblox-darkblue font-bold">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-roblox-blue hover:text-roblox-darkblue font-bold">
                  Privacy Policy
                </a>
                . I understand that I am creating an account for my child and consent to data collection in accordance with COPPA.
              </span>
            </label>
          </div>

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
            variant="success"
          >
            {loading ? 'Creating Account...' : '✨ Create Account'}
          </GameButton>

          <p className="text-center text-gray-600 font-semibold">
            Already have an account?{' '}
            <Link to="/login" className="text-roblox-green hover:text-green-700 font-bold">
              Login
            </Link>
          </p>

          <p className="text-center text-gray-500 text-sm mt-4">
            <Link to="/" className="hover:text-roblox-green font-semibold">
              ← Back to Home
            </Link>
          </p>
        </form>
      </GameCard>
    </div>
  );
};