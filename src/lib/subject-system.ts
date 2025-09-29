import { SubjectWorld, Activity, Subject, Difficulty } from './types';

// Subject World Configurations
const SUBJECT_WORLDS: Omit<SubjectWorld, 'activities' | 'progress' | 'unlocked'>[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    description: 'Explore the world of numbers, equations, and problem-solving',
    icon: '🔢',
    color: 'bg-blue-500'
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Discover the wonders of physics, chemistry, and biology',
    icon: '🔬',
    color: 'bg-green-500'
  },
  {
    id: 'history',
    name: 'History',
    description: 'Journey through time and learn about past civilizations',
    icon: '🏛️',
    color: 'bg-amber-500'
  },
  {
    id: 'language_arts',
    name: 'Language Arts',
    description: 'Master the art of reading, writing, and communication',
    icon: '📚',
    color: 'bg-purple-500'
  },
  {
    id: 'geography',
    name: 'Geography',
    description: 'Explore the world and learn about different places and cultures',
    icon: '🌍',
    color: 'bg-teal-500'
  },
  {
    id: 'art',
    name: 'Art',
    description: 'Express creativity through drawing, painting, and design',
    icon: '🎨',
    color: 'bg-pink-500'
  }
];

// Activity Templates for each subject
const ACTIVITY_TEMPLATES: Record<Subject, Omit<Activity, 'id' | 'subject' | 'completed' | 'locked'>[]> = {
  'Mathematics': [
    {
      title: 'Number Ninja',
      description: 'Solve basic arithmetic problems to defeat enemies',
      difficulty: 'Easy',
      type: 'quiz',
      xpReward: 50,
      treasureReward: 5
    },
    {
      title: 'Fraction Quest',
      description: 'Navigate through a maze by solving fraction problems',
      difficulty: 'Medium',
      type: 'puzzle',
      xpReward: 75,
      treasureReward: 8
    },
    {
      title: 'Algebra Adventure',
      description: 'Unlock treasure chests by solving algebraic equations',
      difficulty: 'Hard',
      type: 'challenge',
      xpReward: 100,
      treasureReward: 12
    },
    {
      title: 'Geometry Guardian',
      description: 'Protect the kingdom by calculating areas and perimeters',
      difficulty: 'Medium',
      type: 'quiz',
      xpReward: 80,
      treasureReward: 10
    }
  ],
  'Science': [
    {
      title: 'Element Explorer',
      description: 'Discover the periodic table through interactive experiments',
      difficulty: 'Easy',
      type: 'quiz',
      xpReward: 50,
      treasureReward: 5
    },
    {
      title: 'Physics Phenomenon',
      description: 'Learn about forces and motion through fun simulations',
      difficulty: 'Medium',
      type: 'puzzle',
      xpReward: 75,
      treasureReward: 8
    },
    {
      title: 'Biology Beast',
      description: 'Study living organisms and their ecosystems',
      difficulty: 'Hard',
      type: 'challenge',
      xpReward: 100,
      treasureReward: 12
    },
    {
      title: 'Chemistry Cauldron',
      description: 'Mix potions and learn about chemical reactions',
      difficulty: 'Medium',
      type: 'quiz',
      xpReward: 80,
      treasureReward: 10
    }
  ],
  'History': [
    {
      title: 'Ancient Civilizations',
      description: 'Explore the pyramids and learn about ancient Egypt',
      difficulty: 'Easy',
      type: 'story',
      xpReward: 50,
      treasureReward: 5
    },
    {
      title: 'Medieval Mystery',
      description: 'Solve puzzles set in medieval castles and kingdoms',
      difficulty: 'Medium',
      type: 'puzzle',
      xpReward: 75,
      treasureReward: 8
    },
    {
      title: 'World War Chronicles',
      description: 'Learn about significant historical events and their impact',
      difficulty: 'Hard',
      type: 'challenge',
      xpReward: 100,
      treasureReward: 12
    },
    {
      title: 'Renaissance Revival',
      description: 'Discover the art and science of the Renaissance period',
      difficulty: 'Medium',
      type: 'story',
      xpReward: 80,
      treasureReward: 10
    }
  ],
  'Language Arts': [
    {
      title: 'Vocabulary Voyage',
      description: 'Expand your vocabulary by collecting word treasures',
      difficulty: 'Easy',
      type: 'quiz',
      xpReward: 50,
      treasureReward: 5
    },
    {
      title: 'Grammar Guardian',
      description: 'Protect the realm by fixing grammatical errors',
      difficulty: 'Medium',
      type: 'puzzle',
      xpReward: 75,
      treasureReward: 8
    },
    {
      title: 'Poetry Palace',
      description: 'Create beautiful poems and learn about literary devices',
      difficulty: 'Hard',
      type: 'story',
      xpReward: 100,
      treasureReward: 12
    },
    {
      title: 'Reading Ranger',
      description: 'Improve reading comprehension through exciting stories',
      difficulty: 'Medium',
      type: 'story',
      xpReward: 80,
      treasureReward: 10
    }
  ],
  'Geography': [
    {
      title: 'World Explorer',
      description: 'Travel the globe and learn about different countries',
      difficulty: 'Easy',
      type: 'quiz',
      xpReward: 50,
      treasureReward: 5
    },
    {
      title: 'Climate Quest',
      description: 'Understand weather patterns and climate zones',
      difficulty: 'Medium',
      type: 'puzzle',
      xpReward: 75,
      treasureReward: 8
    },
    {
      title: 'Landmark Legend',
      description: 'Identify famous landmarks and their significance',
      difficulty: 'Hard',
      type: 'challenge',
      xpReward: 100,
      treasureReward: 12
    },
    {
      title: 'Map Master',
      description: 'Navigate using maps and learn about coordinates',
      difficulty: 'Medium',
      type: 'puzzle',
      xpReward: 80,
      treasureReward: 10
    }
  ],
  'Art': [
    {
      title: 'Color Creator',
      description: 'Learn about color theory and create beautiful palettes',
      difficulty: 'Easy',
      type: 'quiz',
      xpReward: 50,
      treasureReward: 5
    },
    {
      title: 'Shape Sculptor',
      description: 'Create 3D sculptures using geometric shapes',
      difficulty: 'Medium',
      type: 'puzzle',
      xpReward: 75,
      treasureReward: 8
    },
    {
      title: 'Masterpiece Maker',
      description: 'Study famous artworks and create your own masterpiece',
      difficulty: 'Hard',
      type: 'challenge',
      xpReward: 100,
      treasureReward: 12
    },
    {
      title: 'Design Detective',
      description: 'Analyze different art styles and design principles',
      difficulty: 'Medium',
      type: 'story',
      xpReward: 80,
      treasureReward: 10
    }
  ]
};

export function initializeSubjectWorlds(): SubjectWorld[] {
  const stored = localStorage.getItem('subjectWorlds');
  if (stored) {
    return JSON.parse(stored);
  }

  const worlds: SubjectWorld[] = SUBJECT_WORLDS.map((world, index) => ({
    ...world,
    unlocked: index === 0, // First world (Mathematics) is unlocked by default
    progress: 0,
    activities: generateActivitiesForSubject(world.name)
  }));

  localStorage.setItem('subjectWorlds', JSON.stringify(worlds));
  return worlds;
}

function generateActivitiesForSubject(subject: Subject): Activity[] {
  const templates = ACTIVITY_TEMPLATES[subject];
  return templates.map((template, index) => ({
    id: `${subject.toLowerCase().replace(' ', '_')}_${index + 1}`,
    ...template,
    subject,
    completed: false,
    locked: index > 0 // First activity is unlocked, others are locked
  }));
}

export function getSubjectWorlds(): SubjectWorld[] {
  return initializeSubjectWorlds();
}

export function updateSubjectProgress(subjectId: string, activityId: string): SubjectWorld[] {
  const worlds = getSubjectWorlds();
  const updatedWorlds = worlds.map(world => {
    if (world.id === subjectId) {
      const updatedActivities = world.activities.map(activity => {
        if (activity.id === activityId) {
          return { ...activity, completed: true };
        }
        return activity;
      });

      // Unlock next activity if current one is completed
      const currentIndex = updatedActivities.findIndex(a => a.id === activityId);
      if (currentIndex !== -1 && currentIndex < updatedActivities.length - 1) {
        updatedActivities[currentIndex + 1].locked = false;
      }

      // Calculate progress
      const completedCount = updatedActivities.filter(a => a.completed).length;
      const progress = (completedCount / updatedActivities.length) * 100;

      return {
        ...world,
        activities: updatedActivities,
        progress: Math.round(progress)
      };
    }
    return world;
  });

  // Check if we should unlock the next world
  const updatedWorldsWithUnlocks = checkAndUnlockNextWorld(updatedWorlds);
  
  localStorage.setItem('subjectWorlds', JSON.stringify(updatedWorldsWithUnlocks));
  return updatedWorldsWithUnlocks;
}

function checkAndUnlockNextWorld(worlds: SubjectWorld[]): SubjectWorld[] {
  return worlds.map((world, index) => {
    if (!world.unlocked && index > 0) {
      const previousWorld = worlds[index - 1];
      // Unlock if previous world has at least 50% progress
      if (previousWorld.progress >= 50) {
        return { ...world, unlocked: true };
      }
    }
    return world;
  });
}

export function getSubjectById(subjectId: string): SubjectWorld | undefined {
  const worlds = getSubjectWorlds();
  return worlds.find(world => world.id === subjectId);
}

export function getActivityById(subjectId: string, activityId: string): Activity | undefined {
  const world = getSubjectById(subjectId);
  return world?.activities.find(activity => activity.id === activityId);
}

export function saveSubjectWorlds(worlds: SubjectWorld[]): void {
  localStorage.setItem('subjectWorlds', JSON.stringify(worlds));
}
