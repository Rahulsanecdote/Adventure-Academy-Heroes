import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Child Profile API
export const createChildProfile = async (profileData) => {
  const response = await axios.post(`${API}/child/profile`, profileData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getChildProfile = async (childId) => {
  const response = await axios.get(`${API}/child/profile/${childId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getChildrenProfiles = async () => {
  const response = await axios.get(`${API}/child/profiles`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Activities API
export const getMathActivities = async (childId, activityType = 'counting', count = 5) => {
  const response = await axios.post(`${API}/activities/math`, {
    child_id: childId,
    activity_type: activityType,
    count
  });
  return response.data;
};

// Progress API
export const createSession = async (childId, activityType, difficultyLevel = 1) => {
  const response = await axios.post(`${API}/progress/session`, {
    child_id: childId,
    activity_type: activityType,
    difficulty_level: difficultyLevel
  });
  return response.data;
};

export const updateSession = async (sessionId, score, correctAnswers, totalQuestions) => {
  const response = await axios.put(`${API}/progress/session`, {
    session_id: sessionId,
    score,
    correct_answers: correctAnswers,
    total_questions: totalQuestions,
    completed: true
  });
  return response.data;
};

export const getChildProgress = async (childId) => {
  const response = await axios.get(`${API}/progress/${childId}`);
  return response.data;
};

// Dashboard API
export const getParentDashboard = async (childId) => {
  const response = await axios.get(`${API}/dashboard/parent/${childId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};