import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChildProfile } from '@/utils/api';
import { AVATARS, PICTURE_PASSWORDS } from '@/data/avatars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: 4,
    avatar_id: '',
    picture_password_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!formData.name || !formData.avatar_id || !formData.picture_password_id) {
      setError('Please complete all steps');
      return;
    }

    setLoading(true);
    try {
      const profile = await createChildProfile(formData);
      localStorage.setItem('currentChild', JSON.stringify(profile));
      navigate('/adventure-hub');
    } catch (err) {
      setError('Failed to create profile. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-400 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-2 ${
                s <= step ? 'bg-white text-purple-600' : 'bg-white/30 text-white'
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold text-purple-600">
              {step === 1 && "👋 Welcome, Hero!"}
              {step === 2 && "🌟 Choose Your Hero Avatar"}
              {step === 3 && "🔐 Pick Your Picture Password"}
              {step === 4 && "✨ Ready for Adventure!"}
            </CardTitle>
            <CardDescription className="text-xl">
              {step === 1 && "Let's create your hero profile!"}
              {step === 2 && "This is how you'll look in your adventures!"}
              {step === 3 && "This is your secret picture to login!"}
              {step === 4 && "Your hero is ready to start learning!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xl">What's your name, hero?</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="text-2xl py-8 text-center"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-xl">How old are you?</Label>
                  <select
                    id="age"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                    className="w-full text-2xl py-4 px-4 border rounded-lg text-center"
                  >
                    {[4, 5].map(age => (
                      <option key={age} value={age}>{age} years old</option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={() => formData.name && setStep(2)}
                  disabled={!formData.name}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl py-8"
                >
                  Next Step 🎯
                </Button>
              </div>
            )}

            {/* Step 2: Avatar Selection */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setFormData({...formData, avatar_id: avatar.id})}
                      className={`p-6 rounded-3xl transform transition-all hover:scale-110 ${
                        formData.avatar_id === avatar.id
                          ? 'ring-8 ring-yellow-400 scale-110'
                          : 'hover:ring-4 hover:ring-purple-300'
                      } bg-gradient-to-br ${avatar.bgColor}`}
                    >
                      <div className="text-6xl mb-2">{avatar.emoji}</div>
                      <div className="text-white font-bold text-sm">{avatar.name}</div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1 text-xl py-6"
                  >
                    ← Back
                  </Button>
                  <Button
                    onClick={() => formData.avatar_id && setStep(3)}
                    disabled={!formData.avatar_id}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl py-6"
                  >
                    Next Step 🎯
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Picture Password */}
            {step === 3 && (
              <div className="space-y-6">
                <p className="text-center text-lg text-gray-600">
                  Pick a picture that you'll remember! This is your secret login.
                </p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {PICTURE_PASSWORDS.map((pic) => (
                    <button
                      key={pic.id}
                      onClick={() => setFormData({...formData, picture_password_id: pic.id})}
                      className={`p-8 rounded-3xl bg-white transform transition-all hover:scale-110 ${
                        formData.picture_password_id === pic.id
                          ? 'ring-8 ring-green-400 scale-110'
                          : 'hover:ring-4 hover:ring-blue-300'
                      }`}
                    >
                      <div className="text-5xl">{pic.emoji}</div>
                      <div className="text-sm font-semibold mt-2">{pic.name}</div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="flex-1 text-xl py-6"
                  >
                    ← Back
                  </Button>
                  <Button
                    onClick={() => formData.picture_password_id && setStep(4)}
                    disabled={!formData.picture_password_id}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl py-6"
                  >
                    Next Step 🎯
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="space-y-6 text-center">
                <div className="text-8xl mb-4">
                  {AVATARS.find(a => a.id === formData.avatar_id)?.emoji}
                </div>
                <h3 className="text-3xl font-bold text-purple-600">
                  Welcome, {formData.name}!
                </h3>
                <p className="text-xl text-gray-600">
                  Your picture password is: <span className="text-4xl">{PICTURE_PASSWORDS.find(p => p.id === formData.picture_password_id)?.emoji}</span>
                </p>
                <p className="text-lg text-gray-500">
                  (Parents: Remember this for your child's login!)
                </p>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => setStep(3)}
                    variant="outline"
                    className="flex-1 text-xl py-6"
                  >
                    ← Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-2xl py-8"
                  >
                    {loading ? 'Creating...' : '🚀 Start Adventure!'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;