import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { progressAPI, childrenAPI, challengesAPI } from '../services/api';
import { AvatarCustomizer, DEFAULT_AVATAR } from '../components/ui/AvatarCustomizer';
import { GameButton } from '../components/ui/GameButton';
import { GameCard } from '../components/ui/GameCard';
import { Avatar } from '../components/ui/Avatar';
import { StatDisplay } from '../components/ui/StatDisplay';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Loading } from '../components/ui/Loading';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import type { ChildProfile, ChildStats, AvatarCustomization, SkillEvidence } from '../types';
import { LogOut, Plus, TrendingUp, Award, Star } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, children, logout, refreshChildren } = useAuth();
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [childStats, setChildStats] = useState<ChildStats | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildUsername, setNewChildUsername] = useState('');
  const [newChildAge, setNewChildAge] = useState<'7-8' | '9-10' | '11-12'>('7-8');
  const [newChildAvatar, setNewChildAvatar] = useState<AvatarCustomization>(DEFAULT_AVATAR);
  const [showEditAvatar, setShowEditAvatar] = useState(false);
  const [editAvatar, setEditAvatar] = useState<AvatarCustomization>(DEFAULT_AVATAR);
  const [evidence, setEvidence] = useState<SkillEvidence[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (children.length === 0) {
      navigate('/parent/onboarding');
    } else if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0]);
    }
  }, [children, navigate]);

  useEffect(() => {
    if (selectedChild) {
      loadChildStats(selectedChild.id);
      loadSkillEvidence(selectedChild.id);
    }
  }, [selectedChild]);

  // Phase 1: per-quest skill evidence from the server-validated Math Challenge
  const loadSkillEvidence = async (childId: string) => {
    try {
      const data = await challengesAPI.getEvidence(childId);
      setEvidence(data);
    } catch (error) {
      console.error('Failed to load skill evidence:', error);
    }
  };

  const loadChildStats = async (childId: string) => {
    try {
      const stats = await progressAPI.getChildStats(childId);
      setChildStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleAddChild = async () => {
    if (!newChildUsername.trim()) return;
    
    setLoading(true);
    try {
      await childrenAPI.create({
        parent_id: user!.id,
        username: newChildUsername.trim(),
        age_band: newChildAge,
        avatar: newChildAvatar,
      });
      await refreshChildren();
      setShowAddChild(false);
      setNewChildUsername('');
    } catch (error) {
      console.error('Failed to create child:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditAvatar = () => {
    if (!selectedChild) return;
    setEditAvatar({ ...DEFAULT_AVATAR, ...selectedChild.avatar });
    setShowEditAvatar(true);
  };

  const handleSaveAvatar = async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const updated = await childrenAPI.updateAvatar(selectedChild.id, editAvatar);
      await refreshChildren();
      setSelectedChild(updated);
      setShowEditAvatar(false);
    } catch (error) {
      console.error('Failed to update avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (child: ChildProfile) => {
    // Store active child ID for resilience on refresh
    localStorage.setItem('activeChildId', child.id);
    navigate(`/game/${child.id}`);
  };

  if (!selectedChild) {
    return <Loading text="Loading dashboard..." />;
  }

  const xpToNextLevel = (selectedChild.level * 100) - (selectedChild.total_xp || 0);
  const levelProgress = (((selectedChild.total_xp || 0) % 100) / 100) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
      {/* Header - Game Style */}
      <header className="bg-gradient-to-r from-roblox-blue to-roblox-darkblue border-b-4 border-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🎮</div>
            <h1 className="text-3xl font-game font-bold text-white text-game-shadow">
              KidQuest Academy
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <span className="text-white font-semibold">👨‍👩‍👧 {user?.email}</span>
            </div>
            <GameButton variant="danger" size="sm" onClick={logout}>
              <LogOut size={16} className="mr-2 inline" />
              Logout
            </GameButton>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Children Selector - Game Style */}
        <GameCard className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-display font-bold text-gray-800">👶 Your Players</h2>
            <GameButton size="sm" onClick={() => setShowAddChild(true)}>
              <Plus size={16} className="mr-2 inline" />
              Add Child
            </GameButton>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`p-6 rounded-2xl border-4 transition-all duration-200 text-center ${
                  selectedChild?.id === child.id
                    ? 'border-roblox-blue bg-blue-50 scale-105 shadow-glow'
                    : 'border-gray-300 hover:border-roblox-blue hover:scale-105 bg-white'
                }`}
              >
                <Avatar 
                  username={child.username} 
                  level={child.level}
                  size="lg"
                  showLevel
                  className="mb-3 mx-auto"
                />
                <div className="font-display font-bold text-xl text-gray-800">{child.username}</div>
                <div className="text-sm text-gray-600 font-semibold">Level {child.level}</div>
              </button>
            ))}
          </div>
        </GameCard>

        {/* Stats Grid - Game Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatDisplay
            icon={<TrendingUp />}
            label="Level"
            value={selectedChild.level}
            color="purple"
            animate
          />
          <StatDisplay
            icon={<Star />}
            label="Total XP"
            value={selectedChild.total_xp}
            color="blue"
            animate
          />
          <StatDisplay
            icon={<Award />}
            label="Completed"
            value={childStats?.quests_completed || 0}
            color="green"
            animate
          />
          <StatDisplay
            icon={<span className="text-3xl">🪙</span>}
            label="Coins"
            value={selectedChild.coins}
            color="yellow"
            animate
          />
        </div>

        {/* Level Progress */}
        <GameCard className="mb-8">
          <h3 className="text-2xl font-display font-bold mb-4 text-gray-800">
            🎯 Level Progress
          </h3>
          <ProgressBar
            progress={levelProgress}
            label={`Level ${selectedChild.level}`}
            color="rainbow"
            size="lg"
          />
          <p className="text-center mt-3 text-gray-600 font-semibold">
            {xpToNextLevel} XP until Level {selectedChild.level + 1}!
          </p>
        </GameCard>

        {/* Subject Progress */}
        <GameCard className="mb-8">
          <h2 className="text-3xl font-display font-bold mb-6 text-gray-800">
            📊 Progress by Subject
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <SubjectCard
              emoji="🧮"
              subject="Math"
              completed={childStats?.stats_by_subject.math || 0}
              color="green"
            />
            <SubjectCard
              emoji="💻"
              subject="Coding"
              completed={childStats?.stats_by_subject.coding || 0}
              color="blue"
            />
            <SubjectCard
              emoji="🔬"
              subject="Science"
              completed={childStats?.stats_by_subject.science || 0}
              color="purple"
            />
          </div>
        </GameCard>

        {/* Skill Evidence (Phase 1: server-validated Math Challenge) */}
        <GameCard className="mb-8">
          <h2 className="text-3xl font-display font-bold mb-6 text-gray-800">
            🧮 Math Jungle — Skill Evidence
          </h2>
          {evidence.length === 0 ? (
            <p className="text-gray-600 text-lg">
              No Math Challenge evidence yet. It appears here after{' '}
              {selectedChild.username} plays a Math Jungle quest — every attempt is
              graded on the server, so these numbers are verified.
            </p>
          ) : (
            <div className="space-y-4">
              {evidence.map((ev) => (
                <div
                  key={ev.quest_id}
                  className="flex flex-wrap items-center justify-between gap-4 bg-green-50 border-4 border-green-200 rounded-2xl p-4"
                >
                  <div>
                    <div className="font-display font-bold text-xl text-gray-800">
                      {ev.quest_title}
                    </div>
                    <div className="text-gray-600 text-sm">
                      Last played:{' '}
                      {ev.last_played
                        ? new Date(ev.last_played).toLocaleDateString()
                        : '—'}
                    </div>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <div className="text-2xl font-game text-gray-800">{ev.attempts}</div>
                      <div className="text-xs text-gray-500 font-semibold">ATTEMPTS</div>
                    </div>
                    <div>
                      <div className="text-2xl font-game text-gray-800">
                        {ev.total_correct}/{ev.total_questions}
                      </div>
                      <div className="text-xs text-gray-500 font-semibold">CORRECT</div>
                    </div>
                    <div>
                      <div className="text-2xl">{ev.passed ? '✅' : '⏳'}</div>
                      <div className="text-xs text-gray-500 font-semibold">
                        {ev.passed ? 'PASSED' : 'IN PROGRESS'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GameCard>

        {/* Play Button */}
        <div className="text-center space-y-4">
          <div>
            <GameButton
              size="xl"
              onClick={() => handleStartSession(selectedChild)}
              glow
            >
              🎮 Start {selectedChild.username}'s Game Session
            </GameButton>
          </div>
          <div>
            <GameButton variant="purple" onClick={handleOpenEditAvatar}>
              🎨 Customise {selectedChild.username}'s Avatar
            </GameButton>
          </div>
        </div>
      </div>

      {/* Add Child Modal */}
      <Modal
        isOpen={showAddChild}
        onClose={() => setShowAddChild(false)}
        title="🎉 Add New Player"
      >
        <Input
          label="Player Username"
          value={newChildUsername}
          onChange={(e) => setNewChildUsername(e.target.value)}
          placeholder="e.g., SuperGamer99"
        />
        
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-3 text-lg">Age Range</label>
          <div className="grid grid-cols-3 gap-4">
            {(['7-8', '9-10', '11-12'] as const).map((age) => (
              <button
                key={age}
                onClick={() => setNewChildAge(age)}
                className={`p-4 rounded-xl border-4 font-bold text-lg transition-all ${
                  newChildAge === age
                    ? 'border-roblox-blue bg-blue-50 scale-105'
                    : 'border-gray-300 hover:border-roblox-blue'
                }`}
              >
                {age}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-3 text-lg">Avatar</label>
          <AvatarCustomizer value={newChildAvatar} onChange={setNewChildAvatar} />
        </div>

        <GameButton onClick={handleAddChild} disabled={loading} className="w-full">
          {loading ? 'Creating...' : '✨ Create Player Profile'}
        </GameButton>
      </Modal>

      {/* Edit Avatar Modal (Phase 1) */}
      <Modal
        isOpen={showEditAvatar}
        onClose={() => setShowEditAvatar(false)}
        title="🎨 Customise Avatar"
      >
        <AvatarCustomizer value={editAvatar} onChange={setEditAvatar} />
        <GameButton onClick={handleSaveAvatar} disabled={loading} className="w-full">
          {loading ? 'Saving...' : '💾 Save Avatar'}
        </GameButton>
      </Modal>
    </div>
  );
};

const SubjectCard: React.FC<{
  emoji: string;
  subject: string;
  completed: number;
  color: 'green' | 'blue' | 'purple';
}> = ({ emoji, subject, completed, color }) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-300',
    blue: 'bg-blue-50 border-blue-300',
    purple: 'bg-purple-50 border-purple-300',
  };
  
  const textColors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`${colorClasses[color]} border-4 rounded-2xl p-6 text-center hover:scale-105 transition-transform`}>
      <div className="text-6xl mb-3">{emoji}</div>
      <div className="font-display font-bold text-2xl mb-3 text-gray-800">{subject}</div>
      <div className={`text-5xl font-game ${textColors[color]} mb-2`}>
        {completed}
      </div>
      <div className="text-gray-600 font-semibold">Quests Complete</div>
      <ProgressBar
        progress={Math.min((completed / 10) * 100, 100)}
        color={color}
        size="sm"
        showPercentage={false}
        className="mt-4"
      />
    </div>
  );
};
