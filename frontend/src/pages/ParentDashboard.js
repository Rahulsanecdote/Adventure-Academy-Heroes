import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildrenProfiles, getParentDashboard } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AVATARS } from '@/data/avatars';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadDashboard(selectedChild.id);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      const childrenData = await getChildrenProfiles();
      setChildren(childrenData);
      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch (error) {
      console.error('Failed to load children:', error);
    }
    setLoading(false);
  };

  const loadDashboard = async (childId) => {
    try {
      const dashboardData = await getParentDashboard(childId);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <div className="text-white text-4xl">Loading dashboard... 📊</div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Children Yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>Create a child profile to get started!</p>
            <Button onClick={() => navigate('/onboarding')}>
              Create Child Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatar = AVATARS.find(a => a.id === selectedChild?.avatar_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-purple-600">Parent Dashboard</h1>
            <Button
              onClick={() => navigate('/adventure-hub')}
              variant="outline"
            >
              🏝️ Adventure Hub
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Child Selector */}
        <div className="mb-8">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {children.map((child) => {
              const childAvatar = AVATARS.find(a => a.id === child.avatar_id);
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    selectedChild?.id === child.id
                      ? 'bg-white shadow-xl ring-4 ring-purple-400'
                      : 'bg-white/60 hover:bg-white'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br ${childAvatar?.bgColor}`}>
                    {childAvatar?.emoji}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">{child.name}</div>
                    <div className="text-sm text-gray-600">Level {child.current_level}</div>
                  </div>
                </button>
              );
            })}
            <Button
              onClick={() => navigate('/onboarding')}
              variant="outline"
              className="min-w-[200px]"
            >
              + Add Child
            </Button>
          </div>
        </div>

        {dashboard && (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-bold">{dashboard.child_profile.current_level}</div>
                  <div className="text-lg">Current Level</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-bold">{dashboard.child_profile.total_score}</div>
                  <div className="text-lg">Total Points</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-400 to-emerald-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-bold">{dashboard.achievements.length}</div>
                  <div className="text-lg">Achievements</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl">🔥</div>
                  <div className="text-3xl font-bold">{dashboard.weekly_stats.sessions_count}</div>
                  <div className="text-lg">This Week</div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Stats */}
            <Card>
              <CardHeader>
                <CardTitle>This Week's Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl mb-2">📚</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {dashboard.weekly_stats.sessions_count}
                    </div>
                    <div className="text-sm text-gray-600">Learning Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl mb-2">⏱️</div>
                    <div className="text-2xl font-bold text-green-600">
                      {dashboard.weekly_stats.total_time_minutes}
                    </div>
                    <div className="text-sm text-gray-600">Minutes Learning</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {dashboard.weekly_stats.skills_practiced}
                    </div>
                    <div className="text-sm text-gray-600">Skills Practiced</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skill Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Skill Development</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard.skill_progress.map((skill) => (
                    <div key={skill.id}>
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold capitalize">
                          {skill.skill_type.replace('_', ' ')}
                        </span>
                        <span className="text-purple-600 font-bold">
                          {skill.mastery_percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all"
                          style={{ width: `${skill.mastery_percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {skill.total_attempts} attempts • Last practiced: {new Date(skill.last_practiced).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            {dashboard.achievements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Achievements 🏆</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboard.achievements.slice(0, 8).map((achievement) => (
                      <div
                        key={achievement.id}
                        className="bg-gradient-to-br from-yellow-200 to-orange-300 p-4 rounded-xl text-center"
                      >
                        <div className="text-4xl mb-2">{achievement.icon}</div>
                        <div className="font-bold text-sm">{achievement.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(achievement.earned_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle>AI-Powered Recommendations 🤖</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="text-2xl">💡</div>
                      <p className="text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;