# KidQuest Academy

## Interactive Learning Platform for Kids (Ages 7-12)

KidQuest Academy is a production-ready web application that combines the engaging gameplay of Roblox with educational content in Math, Coding, and Science. Kids explore 3D worlds, complete quests, earn rewards, and customize their avatars while learning!

---

## 🎯 Features

### Core Features (Phase 1 - COMPLETE)
- ✅ Parent authentication with JWT
- ✅ Child profile management (multiple children per parent)
- ✅ Quest system with 3 worlds:
  - Math Jungle
  - Code City
  - Science Spaceport
- ✅ Progress tracking and XP/level system
- ✅ Rewards system (coins, badges, cosmetics)
- ✅ Parent dashboard with child statistics
- ✅ Responsive design with Tailwind CSS
- ✅ COPPA-compliant privacy design

### Upcoming Features (Phases 2-6)
- ⏳ 3D hub world with Babylon.js
- ⏳ Avatar customization system
- ⏳ Quest runner engine with interactive puzzles
- ⏳ Math, Coding, and Science mini-games
- ⏳ Admin content editor

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Babylon.js** for 3D rendering (Phase 4)

### Backend
- **FastAPI** (Python)
- **MongoDB** for database
- **JWT** for authentication
- **Pydantic** for validation
- **Bcrypt** for password hashing

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB
- Yarn

### Installation

1. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt

# Run database seed
python -m app.seed_data

# Start backend (via supervisor or manually)
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

2. **Frontend Setup**
```bash
cd frontend
yarn install
yarn dev
```

3. **Access the App**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

## 👤 Accounts

**Admin Account** (for quest management):
- There are **no default credentials**. An admin account is created only when
  you seed the database with the `ADMIN_EMAIL` and `ADMIN_PASSWORD`
  environment variables set:
  ```bash
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=<a-strong-password> python -m app.seed_data
  ```
- ⚠️ The default admin password published in earlier versions of this README
  must be considered **compromised** — rotate it anywhere it was reused.

**Parent Account** (create via signup):
- Create your own parent account at `/signup`

---

## 📚 Database Schema

### Collections

1. **users** - Parent/admin accounts
   - id, email, hashed_password, role, created_at, consent_timestamp

2. **child_profiles** - Kid accounts
   - id, parent_id, username, age_band, avatar, total_xp, level, coins

3. **quests** - Learning quests
   - id, title, description, world, subject, difficulty, xp_reward, coin_reward

4. **quest_steps** - Individual quest steps
   - id, quest_id, step_order, step_type, title, config, hints

5. **progress** - Child quest progress
   - id, child_id, quest_id, started_at, completed_at, steps_progress

6. **cosmetics** - Avatar customization items
   - id, name, category, value, unlock_requirement, coin_cost

7. **inventory** - Child's owned items
   - id, child_id, item_type, item_id, earned_at

---

## 🛡️ Safety & Privacy

### COPPA Compliance
- No personally identifiable information collected from children
- Usernames only (no real names)
- Parent consent required
- Parent-controlled accounts
- No advertising or data selling
- Data deletion capabilities

### Security Features
- JWT-based authentication
- Bcrypt password hashing
- Role-based access control (parent/child/admin)
- CORS protection
- Input validation with Pydantic

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create parent account
- `POST /api/auth/login` - Parent login
- `POST /api/auth/child-session/{child_id}` - Start child session
- `GET /api/auth/me` - Get current user

### Children
- `POST /api/children` - Create child profile
- `GET /api/children` - Get all children
- `GET /api/children/{child_id}` - Get child details
- `PATCH /api/children/{child_id}/avatar` - Update avatar
- `DELETE /api/children/{child_id}` - Delete child

### Quests
- `GET /api/quests` - Get all quests
- `GET /api/quests/child/{child_id}` - Get quests for child (with progress)
- `GET /api/quests/{quest_id}` - Get quest details

### Progress
- `POST /api/progress/start-quest` - Start a quest
- `PATCH /api/progress/{progress_id}` - Update progress
- `POST /api/progress/complete-quest/{progress_id}` - Complete quest
- `GET /api/progress/child/{child_id}` - Get child's progress
- `GET /api/progress/child/{child_id}/stats` - Get statistics

### Admin
- `POST /api/admin/quests` - Create quest
- `PUT /api/admin/quests/{quest_id}` - Update quest
- `DELETE /api/admin/quests/{quest_id}` - Delete quest

---

## 🎮 Seeded Content

The app comes with pre-seeded quests:

### Math Jungle 🌴
1. **Number Adventure** - Counting and basic addition
2. **Fraction Forest** - Introduction to fractions

### Code City 🏙️
1. **Robot Rescue** - Block-based programming basics

### Science Spaceport 🚀
1. **Gravity Experiment** - Understanding gravity and physics

---

## 📈 Development Roadmap

### ✅ Phase 1: Foundation (COMPLETE)
- Project structure
- Authentication system
- Database models
- Basic API endpoints
- UI components
- Parent flows

### 🚧 Phase 2: Enhanced Backend
- Additional quest types
- Inventory management
- Badge system
- Hint buddy integration

### 🚧 Phase 3: UI Polish
- Avatar customization UI
- Quest board interface
- Rewards screen
- Admin panel

### 🚧 Phase 4: 3D World
- Babylon.js integration
- Hub world scene
- Avatar movement
- Quest portals

### 🚧 Phase 5: Quest System
- Interactive math puzzles
- Block-based coding interface
- Science simulations
- Reward ceremonies

### 🚧 Phase 6: Testing & Deployment
- E2E tests
- Performance optimization
- Production deployment

---

## 🧑‍💻 Development

### Environment Variables

**Backend (.env)**
```env
MONGO_URL=mongodb://localhost:27017/kidquest
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

**Frontend (.env)**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Scripts

**Backend**
```bash
# Seed database
python -m app.seed_data

# Run tests (TODO)
pytest
```

**Frontend**
```bash
# Development
yarn dev

# Build
yarn build

# Preview production build
yarn preview
```

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions are welcome! Please read CONTRIBUTING.md for guidelines.

---

## 📞 Support

For support, email support@kidquest.com or open an issue on GitHub.

---

**Built with ❤️ for kids who love to learn!**