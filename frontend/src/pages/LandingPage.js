import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-bounce-slow">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 drop-shadow-2xl">
            🌟 Adventure Academy Heroes 🌟
          </h1>
          <p className="text-2xl md:text-4xl text-white font-semibold mb-8 drop-shadow-lg">
            Where Learning Becomes an Epic Adventure!
          </p>
        </div>

        {/* Main Character */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            <div className="text-9xl animate-bounce">
              🚀
            </div>
            <div className="absolute -top-4 -right-4 text-6xl animate-spin-slow">
              ⭐
            </div>
            <div className="absolute -bottom-4 -left-4 text-5xl animate-pulse">
              🌈
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-6xl mx-auto">
          <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold text-purple-600 mb-2">Fun Learning Games</h3>
            <p className="text-gray-700">Play through exciting obstacle courses while learning math, shapes, and more!</p>
          </div>
          
          <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
            <div className="text-6xl mb-4">🦸</div>
            <h3 className="text-2xl font-bold text-pink-600 mb-2">Be a Hero!</h3>
            <p className="text-gray-700">Choose your hero avatar and unlock amazing powers as you learn!</p>
          </div>
          
          <div className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-orange-600 mb-2">Earn Rewards</h3>
            <p className="text-gray-700">Collect achievements and trophies as you master new skills!</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Button
            onClick={() => navigate('/parent/signup')}
            className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white text-2xl px-12 py-8 rounded-full shadow-2xl transform hover:scale-110 transition-all"
          >
            🌟 Start Free Adventure 🌟
          </Button>
          
          <Button
            onClick={() => navigate('/parent/login')}
            variant="outline"
            className="bg-white/90 hover:bg-white text-purple-600 text-xl px-10 py-6 rounded-full shadow-xl border-4 border-purple-400"
          >
            Parent Login
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center text-white">
          <p className="text-xl mb-4">✨ Perfect for Ages 4-5 ✨</p>
          <p className="text-lg">Safe • Educational • Fun</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;