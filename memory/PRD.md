# FORGE - AI-Powered Fitness & Workout Tracker

## Product Overview
FORGE is a comprehensive fitness tracking app with AI-powered coaching personas that read daily data to provide personalized advice. Built for Android & iOS with Expo React Native.

## Core Features

### 1. Dashboard
- Daily calorie overview (consumed vs burned vs net)
- Workout count, meals logged, muscle groups worked
- Quick actions (Log Workout, Log Meal)
- AI Coach quick access cards

### 2. Workout Tracker
- 6 muscle groups: Chest, Back, Legs, Shoulders, Arms, Core
- 8 exercises per muscle group (48 total)
- Set logging with weight (kg) and reps
- Calorie burn estimation per workout
- Notes per exercise
- Delete workouts (long press)

### 3. Nutrition Tracker
- Manual meal logging (Breakfast, Lunch, Dinner, Snack)
- AI-powered image analysis - snap mess menu screenshots
- Calorie tracking per item and per meal
- Daily total calorie display
- Delete meals (long press)

### 4. AI Coaches (GPT-5.2)
- **Coach Iron** (Trainer): Analyzes workouts, suggests improvements, creates training plans
- **Dr. Fuel** (Nutritionist): Analyzes meals/menu images, counts calories, diet optimization
- **BroFit** (Buddy): Uncensored fitness Q&A, supplements, recovery, training tips
- All personas read daily data (workouts, meals, measurements, profile)
- Chat history persisted in MongoDB
- Image attachment support (especially for nutritionist)

### 5. Body Measurements
- Track: Weight, Body Fat %, Chest, Waist, Hips, Arms (L/R), Thighs (L/R)
- Historical measurement records
- Latest measurements displayed on profile

### 6. User Profile
- Name, Age, Gender, Height, Weight
- Goal setting: Build Muscle, Lose Fat, Maintain
- Activity level tracking

### 7. Connected Devices (Placeholder)
- Google Fit / Smartwatch integration (Coming Soon)
- Designed for future calorie sync, steps, heart rate

## Tech Stack
- **Frontend**: Expo React Native with expo-router (tab navigation)
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB (fitness_app)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Image Analysis**: GPT-5.2 Vision for meal/menu screenshot analysis

## API Endpoints
- `GET /api/health` - Health check
- `GET /api/exercises` - Exercise database (6 muscle groups)
- `POST/GET/DELETE /api/workouts` - Workout CRUD
- `POST/GET/DELETE /api/meals` - Meal CRUD
- `POST /api/meals/analyze` - AI meal image analysis
- `POST/GET /api/measurements` - Body measurements
- `GET /api/measurements/latest` - Latest measurement
- `POST /api/chat/{persona}` - AI chat (trainer/nutritionist/buddy)
- `GET/DELETE /api/chat/{persona}/history` - Chat history
- `GET /api/dashboard` - Daily summary
- `GET/PUT /api/profile` - User profile

## Design
- Dark theme (#0A0A0A background, #141414 surfaces)
- Primary accent: Electric Red (#FF3B30)
- Success: Green (#34C759), Warning: Orange (#FF9F0A)
- Tab navigation with 5 tabs: Dashboard, Workout, Nutrition, AI Coach, Profile
