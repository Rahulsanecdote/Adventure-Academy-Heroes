import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMathActivities, createSession, updateSession } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const MathMountain = () => {
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [activities, setActivities] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(0);
  const [session, setSession] = useState(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [encouragement, setEncouragement] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    const storedChild = localStorage.getItem('currentChild');
    if (storedChild) {
      const childData = JSON.parse(storedChild);
      setChild(childData);

      try {
        // Start session
        const sessionData = await createSession(childData.id, 'counting', 1);
        setSession(sessionData);

        // Get activities
        const activityData = await getMathActivities(childData.id, 'counting', 5);
        setActivities(activityData.activities);
        setEncouragement(activityData.encouragement_message);
      } catch (error) {
        console.error('Failed to load activities:', error);
      }
    }
    setLoading(false);
  };

  const handleAnswer = async (answer) => {
    const activity = activities[currentActivity];
    const correct = answer === activity.correct_answer;
    
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      setScore(score + 20);
      setCorrectCount(correctCount + 1);
    }

    // Wait for feedback animation
    setTimeout(() => {
      setShowFeedback(false);
      
      if (currentActivity < activities.length - 1) {
        setCurrentActivity(currentActivity + 1);
      } else {
        completeSession();
      }
    }, 2000);
  };

  const completeSession = async () => {
    if (session) {
      try {
        const result = await updateSession(
          session.session_id,
          score,
          correctCount,
          activities.length
        );
        setEncouragement(result.encouragement);
        setCompleted(true);
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
        <div className="text-white text-4xl">Loading Math Mountain... 🏔️</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-2xl">
          <CardHeader className="text-center">
            <div className="text-8xl mb-4">🏆</div>
            <CardTitle className="text-5xl font-bold text-purple-600 mb-4">
              Amazing Work!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="text-3xl font-bold text-orange-600">
              {encouragement}
            </div>
            
            <div className="grid grid-cols-2 gap-4 my-8">
              <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl p-6 text-white">
                <div className="text-5xl font-bold">{score}</div>
                <div className="text-xl">Points Earned</div>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white">
                <div className="text-5xl font-bold">{correctCount}/{activities.length}</div>
                <div className="text-xl">Correct Answers</div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl py-8"
              >
                🎮 Play Again
              </Button>
              <Button
                onClick={() => navigate('/adventure-hub')}
                variant="outline"
                className="w-full text-xl py-6"
              >
                🏝️ Back to Adventure Hub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activity = activities[currentActivity];

  if (!activity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
        <div className="text-white text-2xl">No activities available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-300 via-red-400 to-pink-500 p-4">
      {/* Header */}
      <div className="container mx-auto py-6 flex items-center justify-between">
        <Button
          onClick={() => navigate('/adventure-hub')}
          variant="outline"
          className="bg-white"
        >
          ← Back
        </Button>
        
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-full px-6 py-3 shadow-lg">
            <span className="text-2xl font-bold text-purple-600">
              {currentActivity + 1} / {activities.length}
            </span>
          </div>
          <div className="bg-white rounded-full px-6 py-3 shadow-lg">
            <span className="text-2xl font-bold text-orange-600">
              ⭐ {score}
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="container mx-auto max-w-4xl">
        <Card className="shadow-2xl mt-8">
          <CardHeader className="bg-gradient-to-r from-orange-400 to-red-500 text-white">
            <div className="text-6xl text-center mb-4">🏔️</div>
            <CardTitle className="text-3xl text-center">Math Mountain Challenge</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* Question */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-purple-600 mb-6">
                {activity.question_text}
              </h2>
              
              {/* Visual representation for counting */}
              {activity.activity_type === 'counting' && activity.question_data.count && (
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {Array.from({ length: activity.question_data.count }).map((_, i) => (
                    <div key={i} className="text-6xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                      {activity.question_data.context === 'apples' && '🍎'}
                      {activity.question_data.context === 'stars' && '⭐'}
                      {activity.question_data.context === 'balloons' && '🎈'}
                      {activity.question_data.context === 'teddy bears' && '🧸'}
                      {activity.question_data.context === 'cookies' && '🍪'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-2 gap-6">
              {activity.activity_type === 'counting' && (
                <>
                  {[
                    parseInt(activity.correct_answer),
                    parseInt(activity.correct_answer) + 1,
                    parseInt(activity.correct_answer) - 1,
                    parseInt(activity.correct_answer) + 2
                  ].sort(() => Math.random() - 0.5).map((num, i) => (
                    num > 0 && (
                      <Button
                        key={i}
                        onClick={() => handleAnswer(String(num))}
                        disabled={showFeedback}
                        className="h-32 text-6xl bg-gradient-to-br from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white rounded-3xl transform hover:scale-105 transition-all"
                      >
                        {num}
                      </Button>
                    )
                  ))}
                </>
              )}
            </div>

            {/* Hints */}
            {activity.hints && activity.hints.length > 0 && (
              <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
                <div className="text-center">
                  <span className="text-2xl">💡 Hint: </span>
                  <span className="text-xl text-gray-700">{activity.hints[0]}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Overlay */}
        {showFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-3xl p-12 shadow-2xl transform scale-110 ${isCorrect ? 'animate-bounce' : 'animate-shake'}`}>
              <div className="text-9xl text-center mb-4">
                {isCorrect ? '🎉' : '💪'}
              </div>
              <div className="text-4xl font-bold text-center">
                {isCorrect ? 'Amazing!' : 'Try Again!'}
              </div>
              <div className="text-2xl text-center mt-4 text-gray-600">
                {isCorrect ? '+20 points!' : 'You can do it!'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MathMountain;