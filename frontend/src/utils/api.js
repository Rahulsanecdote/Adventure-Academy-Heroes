import apiClient from '@/lib/apiClient';

// Child Profile API
export const createChildProfile = async (profileData) => {
  const response = await apiClient.post('/child/profile', profileData);
  return response.data;
};

export const getChildProfile = async (childId) => {
  const response = await apiClient.get(`/child/profile/${childId}`);
  return response.data;
};

export const getChildrenProfiles = async () => {
  const response = await apiClient.get('/child/profiles');
  return response.data;
};

// Activities API
export const getMathActivities = async (childId, activityType = 'counting', count = 5) => {
  const response = await apiClient.post('/activities/math', {
    child_id: childId,
    activity_type: activityType,
    count
  });
  return response.data;
};

// Progress API
export const createSession = async (childId, activityType, difficultyLevel = 1) => {
  const response = await apiClient.post('/progress/session', {
    child_id: childId,
    activity_type: activityType,
    difficulty_level: difficultyLevel
  });
  return response.data;
};

export const updateSession = async (sessionId, score, correctAnswers, totalQuestions) => {
  const response = await apiClient.put('/progress/session', {
    session_id: sessionId,
    score,
    correct_answers: correctAnswers,
    total_questions: totalQuestions,
    completed: true
  });
  return response.data;
};

export const getChildProgress = async (childId) => {
  const response = await apiClient.get(`/progress/${childId}`);
  return response.data;
};

// Dashboard API
export const getParentDashboard = async (childId) => {
  const response = await apiClient.get(`/dashboard/parent/${childId}`);
  return response.data;
};