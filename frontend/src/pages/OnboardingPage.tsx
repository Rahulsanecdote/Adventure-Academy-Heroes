import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { childrenAPI } from '../services/api';
import { GameButton } from '../components/ui/GameButton';
import { Input } from '../components/ui/Input';
import { GameCard } from '../components/ui/GameCard';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshChildren } = useAuth();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [ageBand, setAgeBand] = useState<'7-8' | '9-10' | '11-12'>('7-8');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateChild = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await childrenAPI.create({
        parent_id: user!.id,
        username: username.trim(),
        age_band: ageBand,
      });
      await refreshChildren();
      navigate('/parent/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-roblox-yellow via-orange-400 to-roblox-orange">
      <GameCard className="w-full max-w-2xl" variant={step === 1 ? 'premium' : 'default'}>
        {step === 1 && (
          <div className="text-center">
            <div className="text-8xl mb-6 animate-bounce-slow">🎉</div>
            <h1 className="text-5xl font-game font-bold mb-4 text-gray-800">
              Welcome to KidQuest!
            </h1>
            <p className="text-xl text-gray-700 font-semibold mb-8">
              Let's create your first player profile to start the adventure!
            </p>
            <GameButton size="xl" onClick={() => setStep(2)} variant="success">
              ✨ Create Player Profile
            </GameButton>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-3xl font-display font-bold mb-6 text-gray-800 text-center">
              🎮 Create Player Profile
            </h2>
            
            <Input
              label="Player Username (Keep it fun and safe!)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., SuperGamer, MathWizard, CodeNinja"
              maxLength={20}
              className="input-game"
            />

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-3 text-lg">
                🎂 Select Age Range
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['7-8', '9-10', '11-12'] as const).map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setAgeBand(age)}
                    className={`p-6 rounded-xl border-4 transition-all font-display font-bold text-xl ${
                      ageBand === age
                        ? 'border-roblox-blue bg-blue-50 scale-110 shadow-glow'
                        : 'border-gray-300 hover:border-roblox-blue hover:scale-105'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border-4 border-blue-300 mb-6">
              <p className="text-sm text-blue-900 font-semibold flex items-start">
                <span className="text-2xl mr-3">🛡️</span>
                <span>
                  <strong>Privacy First:</strong> We don't collect personal information. 
                  Use a fun username, not your child's real name!
                </span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border-4 border-red-400 text-red-700 rounded-xl font-semibold">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <GameButton
                variant="warning"
                onClick={() => setStep(1)}
                disabled={loading}
                size="lg"
              >
                ← Back
              </GameButton>
              <GameButton
                className="flex-1"
                onClick={handleCreateChild}
                disabled={loading}
                size="lg"
                variant="success"
              >
                {loading ? 'Creating...' : '🚀 Start Adventure'}
              </GameButton>
            </div>
          </div>
        )}
      </GameCard>
    </div>
  );
};