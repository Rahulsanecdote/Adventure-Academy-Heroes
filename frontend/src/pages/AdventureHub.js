import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildProgress } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AVATARS } from '@/data/avatars';

const AdventureHub = () => {
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const storedChild = localStorage.getItem('currentChild');
      if (storedChild) {
        const childData = JSON.parse(storedChild);
        setChild(childData);
        
        try {
          const progressData = await getChildProgress(childData.id);
          setProgress(progressData);
        } catch (error) {
          console.error('Failed to load progress:', error);
        }
      }
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <div className="text-white text-4xl">Loading your adventure... 🚀</div>
      </div>
    );
  }

  const avatar = AVATARS.find(a => a.id === child?.avatar_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-purple-500">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl bg-gradient-to-br ${avatar?.bgColor}`}>
              {avatar?.emoji}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-purple-600">{child?.name}</h2>
              <p className="text-sm text-gray-600">Level {progress?.overall_level || 1} Hero</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">{progress?.total_score || 0}</div>
              <div className="text-xs text-gray-600">Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl">🏆</div>
              <div className="text-xs text-gray-600">{progress?.achievements_count || 0} Badges</div>
            </div>
            <Button
              onClick={() => navigate('/parent/dashboard')}
              variant="outline"
              className="border-purple-400"
            >
              Parent View
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white drop-shadow-2xl mb-4">
            🏝️ Adventure Island 🏝️
          </h1>
          <p className="text-2xl text-white font-semibold">
            Choose your learning adventure!
          </p>
        </div>

        {/* Learning Worlds Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Math Mountain */}
          <Card 
            className="cursor-pointer transform hover:scale-105 transition-all shadow-2xl bg-gradient-to-br from-orange-400 to-red-500 border-0"
            onClick={() => navigate('/math-mountain')}
          >
            <CardHeader>
              <div className="text-7xl text-center mb-4">🏔️</div>
              <CardTitle className="text-3xl text-white text-center">Math Mountain</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white text-center text-lg mb-4">
                Climb the mountain by counting, adding, and solving number puzzles!
              </p>
              <div className="bg-white/30 rounded-lg p-3 text-center">
                <div className="text-white font-bold">
                  {progress?.skills?.find(s => s.skill_type === 'counting')?.mastery_percentage?.toFixed(0) || 0}% Mastered
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Letter Land - Coming Soon */}
          <Card className="opacity-60 shadow-2xl bg-gradient-to-br from-green-400 to-emerald-600 border-0">
            <CardHeader>
              <div className="text-7xl text-center mb-4">📚</div>
              <CardTitle className="text-3xl text-white text-center">Letter Land</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white text-center text-lg mb-4">
                Learn letters, phonics, and reading!
              </p>
              <div className="bg-white/30 rounded-lg p-3 text-center">
                <div className="text-white font-bold">Coming Soon!</div>
              </div>
            </CardContent>
          </Card>

          {/* Science Safari - Coming Soon */}
          <Card className="opacity-60 shadow-2xl bg-gradient-to-br from-yellow-400 to-orange-500 border-0">
            <CardHeader>
              <div className="text-7xl text-center mb-4">🔬</div>
              <CardTitle className="text-3xl text-white text-center">Science Safari</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white text-center text-lg mb-4">
                Explore nature, animals, and experiments!
              </p>
              <div className="bg-white/30 rounded-lg p-3 text-center">
                <div className="text-white font-bold">Coming Soon!</div>
              </div>
            </CardContent>
          </Card>

          {/* Art Atrium - Coming Soon */}
          <Card className="opacity-60 shadow-2xl bg-gradient-to-br from-pink-400 to-purple-500 border-0">
            <CardHeader>
              <div className="text-7xl text-center mb-4">🎨</div>
              <CardTitle className="text-3xl text-white text-center">Art Atrium</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white text-center text-lg mb-4">
                Create art, learn colors, and express yourself!
              </p>
              <div className="bg-white/30 rounded-lg p-3 text-center">
                <div className="text-white font-bold">Coming Soon!</div>
              </div>
            </CardContent>
          </Card>

          {/* Music Meadow - Coming Soon */}
          <Card className="opacity-60 shadow-2xl bg-gradient-to-br from-blue-400 to-indigo-600 border-0">
            <CardHeader>
              <div className="text-7xl text-center mb-4">🎵</div>
              <CardTitle className="text-3xl text-white text-center">Music Meadow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white text-center text-lg mb-4">
                Learn rhythm, sounds, and make music!
              </p>
              <div className="bg-white/30 rounded-lg p-3 text-center">
                <div className="text-white font-bold">Coming Soon!</div>
              </div>
            </CardContent>
          </Card>

          {/* Social Skills - Coming Soon */}
          <Card className="opacity-60 shadow-2xl bg-gradient-to-br from-teal-400 to-cyan-600 border-0">
            <CardHeader>
              <div className="text-7xl text-center mb-4">🤝</div>
              <CardTitle className="text-3xl text-white text-center">Friendship Forest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white text-center text-lg mb-4">
                Learn about feelings, sharing, and being kind!
              </p>
              <div className="bg-white/30 rounded-lg p-3 text-center">
                <div className="text-white font-bold">Coming Soon!</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Streak */}
        {progress?.learning_streak_days > 0 && (
          <div className="mt-12 text-center">
            <Card className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 border-0">
              <CardContent className="p-6">
                <div className="text-5xl mb-2">🔥</div>
                <div className="text-2xl font-bold text-white">
                  {progress.learning_streak_days} Day Streak!
                </div>
                <p className="text-white">Keep learning every day!</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdventureHub;