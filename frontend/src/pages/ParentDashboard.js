import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildrenProfiles, getParentDashboard } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AVATARS } from '@/data/avatars';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const weeklyTrend = useMemo(() => {
    if (!dashboard?.recent_sessions) {
      return [];
    }

    const today = new Date();

    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));

      const sessionsForDay = dashboard.recent_sessions.filter((session) => {
        if (!session.started_at) return false;
        const sessionDate = new Date(session.started_at);
        return sessionDate.toDateString() === day.toDateString();
      });

      const minutes = sessionsForDay.reduce(
        (sum, session) => sum + Math.floor((session.duration_seconds || 0) / 60),
        0
      );

      return {
        label: day.toLocaleDateString(undefined, { weekday: 'short' }),
        minutes,
        sessions: sessionsForDay.length,
      };
    });
  }, [dashboard]);

  const highestMinutes = useMemo(() => {
    return weeklyTrend.reduce((max, day) => (day.minutes > max ? day.minutes : max), 1);
  }, [weeklyTrend]);

  const hasWeeklyActivity = weeklyTrend.some((day) => day.sessions > 0 || day.minutes > 0);

  const goalProgress = dashboard?.weekly_stats?.goal_completion_percentage ?? 0;
  const minutesGoal = dashboard?.weekly_stats?.minutes_goal ?? 0;
  const streakDays = dashboard?.weekly_stats?.streak_days ?? 0;
  const accuracyRate = dashboard?.weekly_stats?.accuracy_rate ?? 0;
  const averageDuration = dashboard?.weekly_stats?.average_duration_minutes ?? 0;
  const scoreTrend = dashboard?.weekly_stats?.score_trend ?? 0;
  const activeDays = dashboard?.weekly_stats?.active_days ?? 0;

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
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
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

              <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl">🔥</div>
                  <div className="text-3xl font-bold">{streakDays}</div>
                  <div className="text-lg">Day Streak</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-bold">{accuracyRate}%</div>
                  <div className="text-lg">Answer Accuracy</div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Stats */}
            <Card>
              <CardHeader>
                <CardTitle>This Week's Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    <div className="text-3xl mb-2">🗓️</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {activeDays}
                    </div>
                    <div className="text-sm text-gray-600">Active Days</div>
                  </div>
                  <div className="text-center p-4 bg-pink-50 rounded-lg">
                    <div className="text-3xl mb-2">📈</div>
                    <div className={`text-2xl font-bold ${scoreTrend >= 0 ? 'text-rose-500' : 'text-gray-500'}`}>
                      {scoreTrend >= 0 ? '+' : ''}{scoreTrend}
                    </div>
                    <div className="text-sm text-gray-600">Score Trend vs Last Week</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Minutes Goal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{dashboard.weekly_stats.total_time_minutes} minutes logged</span>
                  <span>{minutesGoal} minute goal</span>
                </div>
                <Progress value={goalProgress} className="h-3 bg-purple-100" />
                <div className="text-sm text-gray-600">
                  {goalProgress >= 100
                    ? 'Goal achieved—amazing dedication!'
                    : `Just ${Math.max(minutesGoal - dashboard.weekly_stats.total_time_minutes, 0)} minutes to go.`}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Learning Rhythm</CardTitle>
                <p className="text-sm text-gray-500">Track how consistently sessions are spread through the week.</p>
              </CardHeader>
              <CardContent>
                {weeklyTrend.length && hasWeeklyActivity ? (
                  <div className="grid grid-cols-7 gap-3">
                    {weeklyTrend.map((day) => (
                      <div key={day.label} className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-gray-500">{day.label}</span>
                        <div className="h-24 w-9 bg-purple-100 rounded-full overflow-hidden flex items-end">
                          <div
                            className="w-full bg-gradient-to-t from-purple-500 to-pink-400 transition-all"
                            style={{ height: `${day.minutes ? Math.max((day.minutes / highestMinutes) * 100, 12) : 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-600">{day.minutes}m</span>
                        <span className="text-[10px] text-gray-400">{day.sessions} sessions</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No sessions logged yet this week.</p>
                )}
              </CardContent>
            </Card>

            {/* Skill Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Skill Development</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 mb-4">
                  <span>
                    Skills practiced this week:{' '}
                    <span className="font-semibold text-purple-600">
                      {dashboard.weekly_stats.skills_practiced}
                    </span>
                  </span>
                  <span>
                    Avg session length:{' '}
                    <span className="font-semibold text-purple-600">{averageDuration} min</span>
                  </span>
                </div>
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

            {dashboard.focus_areas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Focus Areas</CardTitle>
                  <p className="text-sm text-gray-500">Target these skills to unlock the next big leap.</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboard.focus_areas.map((area, index) => (
                      <div
                        key={`${area.skill}-${index}`}
                        className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-purple-700 capitalize">{area.skill.replace('_', ' ')}</div>
                          <div className="text-xs text-gray-600">
                            Last practiced: {area.last_practiced ? new Date(area.last_practiced).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div className="sm:text-right space-y-1">
                          <div className="text-sm font-bold text-purple-700">{area.mastery_percentage.toFixed(0)}% mastery</div>
                          <p className="text-xs text-purple-700 max-w-xs">{area.practice_prompt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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

            {dashboard.engagement_insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard.engagement_insights.map((insight, index) => (
                      <div
                        key={`${insight}-${index}`}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-purple-100"
                      >
                        <div className="text-xl">✨</div>
                        <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;