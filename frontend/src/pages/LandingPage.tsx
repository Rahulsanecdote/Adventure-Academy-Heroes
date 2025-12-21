import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '../components/ui/GameButton';
import { GameCard } from '../components/ui/GameCard';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section - Roblox Style */}
      <div className="relative overflow-hidden bg-gradient-to-br from-roblox-blue via-indigo-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center text-white">
            <div className="text-8xl mb-6 animate-bounce-slow">🎮</div>
            <h1 className="text-6xl md:text-8xl font-game font-bold mb-6 text-game-shadow animate-pop">
              KidQuest Academy
            </h1>
            <p className="text-2xl md:text-3xl mb-4 font-display font-bold">
              Learn. Play. Level Up! 🚀
            </p>
            <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
              Epic quests in 3D worlds! Master Math, Coding & Science while having FUN!
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <GameButton
                size="xl"
                onClick={() => navigate('/signup')}
                glow
              >
                🌟 Start Adventure
              </GameButton>
              <GameButton
                variant="success"
                size="xl"
                onClick={() => navigate('/login')}
              >
                🔑 Parent Login
              </GameButton>
            </div>
          </div>
        </div>
        
        {/* Floating Game Elements */}
        <div className="absolute top-10 left-10 text-7xl animate-float">🚀</div>
        <div className="absolute top-32 right-16 text-6xl animate-float" style={{ animationDelay: '0.5s' }}>🌟</div>
        <div className="absolute bottom-20 left-1/4 text-6xl animate-float" style={{ animationDelay: '1s' }}>💡</div>
        <div className="absolute bottom-32 right-1/3 text-5xl animate-float" style={{ animationDelay: '1.5s' }}>🏆</div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-y-4 border-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-5xl font-game text-roblox-blue mb-2">1000+</div>
            <div className="text-lg font-bold text-gray-700">Players</div>
          </div>
          <div>
            <div className="text-5xl font-game text-roblox-green mb-2">50+</div>
            <div className="text-lg font-bold text-gray-700">Quests</div>
          </div>
          <div>
            <div className="text-5xl font-game text-roblox-yellow mb-2">3</div>
            <div className="text-lg font-bold text-gray-700">Worlds</div>
          </div>
        </div>
      </div>

      {/* Why Kids Love It */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-5xl font-game font-bold text-center mb-12 text-gray-800">
          Why Kids Love KidQuest! 🤩
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <GameCard>
            <div className="text-center">
              <div className="text-7xl mb-4">🎮</div>
              <h3 className="text-2xl font-display font-bold mb-3 text-roblox-blue">
                3D Game Worlds
              </h3>
              <p className="text-gray-700 text-lg">
                Explore awesome 3D worlds with your avatar. Just like Roblox!
              </p>
            </div>
          </GameCard>
          
          <GameCard>
            <div className="text-center">
              <div className="text-7xl mb-4">🎯</div>
              <h3 className="text-2xl font-display font-bold mb-3 text-roblox-green">
                Epic Quests
              </h3>
              <p className="text-gray-700 text-lg">
                Complete missions to master Math, Coding, and Science!
              </p>
            </div>
          </GameCard>
          
          <GameCard>
            <div className="text-center">
              <div className="text-7xl mb-4">🏆</div>
              <h3 className="text-2xl font-display font-bold mb-3 text-roblox-yellow">
                Earn Rewards
              </h3>
              <p className="text-gray-700 text-lg">
                Collect coins, unlock badges, and customize your avatar!
              </p>
            </div>
          </GameCard>
        </div>
      </div>

      {/* Worlds Section */}
      <div className="bg-gradient-to-br from-indigo-100 to-purple-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-game font-bold text-center mb-12 text-gray-800">
            Explore 3 Amazing Worlds! 🌎
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <GameCard glow>
              <div className="text-center">
                <div className="text-8xl mb-4">🌴</div>
                <h3 className="text-3xl font-display font-bold mb-3 text-green-600">
                  Math Jungle
                </h3>
                <p className="text-gray-700 text-lg mb-4">
                  Swing through trees solving math with jungle friends!
                </p>
                <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3">
                  <div className="font-bold text-green-800">Learn: Counting, Fractions, Geometry</div>
                </div>
              </div>
            </GameCard>
            
            <GameCard glow>
              <div className="text-center">
                <div className="text-8xl mb-4">🏙️</div>
                <h3 className="text-3xl font-display font-bold mb-3 text-blue-600">
                  Code City
                </h3>
                <p className="text-gray-700 text-lg mb-4">
                  Program robots and build in the city of tomorrow!
                </p>
                <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3">
                  <div className="font-bold text-blue-800">Learn: Block Coding, Logic, Algorithms</div>
                </div>
              </div>
            </GameCard>
            
            <GameCard glow>
              <div className="text-center">
                <div className="text-8xl mb-4">🚀</div>
                <h3 className="text-3xl font-display font-bold mb-3 text-purple-600">
                  Science Spaceport
                </h3>
                <p className="text-gray-700 text-lg mb-4">
                  Blast off and discover the wonders of science!
                </p>
                <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-3">
                  <div className="font-bold text-purple-800">Learn: Physics, Chemistry, Biology</div>
                </div>
              </div>
            </GameCard>
          </div>
        </div>
      </div>

      {/* Safety Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <GameCard variant="premium" className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-7xl mb-4">🛑</div>
            <h2 className="text-4xl font-game font-bold mb-6 text-gray-800">
              100% Safe & Private
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-4xl mb-2">✅</div>
                <p className="font-bold text-lg">COPPA Compliant</p>
                <p className="text-gray-600">Kid-safe privacy</p>
              </div>
              <div>
                <div className="text-4xl mb-2">👪</div>
                <p className="font-bold text-lg">Parent Controls</p>
                <p className="text-gray-600">Full dashboard</p>
              </div>
              <div>
                <div className="text-4xl mb-2">🚫</div>
                <p className="font-bold text-lg">No Ads</p>
                <p className="text-gray-600">Pure learning fun</p>
              </div>
            </div>
          </div>
        </GameCard>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-roblox-blue to-roblox-purple py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-game font-bold text-white mb-6 text-game-shadow">
            Ready for Adventure? 🎉
          </h2>
          <p className="text-2xl text-white/90 mb-8 font-display">
            Join thousands of kids learning through epic gameplay!
          </p>
          <GameButton
            size="xl"
            variant="success"
            onClick={() => navigate('/signup')}
            glow
          >
            🚀 Start Playing Free
          </GameButton>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xl font-display mb-4">🎮 KidQuest Academy - Where Learning Meets Adventure!</p>
          <p className="text-gray-400">© 2024 KidQuest Academy. All rights reserved.</p>
          <div className="mt-6 space-x-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
