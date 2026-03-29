from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'fitness_app')]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============== EXERCISE DATABASE ==============
EXERCISES_DB = {
    "Chest": ["Barbell Bench Press", "Incline Dumbbell Press", "Cable Fly", "Dumbbell Fly", "Push-ups", "Decline Bench Press", "Chest Dips", "Machine Chest Press"],
    "Back": ["Pull-ups", "Lat Pulldown", "Barbell Row", "Dumbbell Row", "Seated Cable Row", "Deadlift", "T-Bar Row", "Face Pulls"],
    "Legs": ["Barbell Squat", "Leg Press", "Romanian Deadlift", "Walking Lunges", "Leg Curl", "Leg Extension", "Calf Raises", "Bulgarian Split Squat"],
    "Shoulders": ["Overhead Press", "Lateral Raise", "Front Raise", "Reverse Fly", "Barbell Shrugs", "Arnold Press", "Upright Row", "Face Pulls"],
    "Arms": ["Barbell Curl", "Hammer Curl", "Tricep Pushdown", "Skull Crushers", "Preacher Curl", "Overhead Tricep Extension", "Concentration Curl", "Close-Grip Bench Press"],
    "Core": ["Plank", "Crunches", "Russian Twist", "Hanging Leg Raises", "Mountain Climbers", "Ab Wheel Rollout", "Cable Woodchops", "Dead Bug"]
}

# ============== PYDANTIC MODELS ==============
class WorkoutSet(BaseModel):
    weight: float = 0
    reps: int = 0

class WorkoutLogCreate(BaseModel):
    date: str
    muscle_group: str
    exercise: str
    sets: List[WorkoutSet]
    notes: str = ""

class MealItem(BaseModel):
    name: str
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0

class MealLogCreate(BaseModel):
    date: str
    meal_type: str
    items: List[MealItem]
    total_calories: float = 0
    notes: str = ""

class BodyMeasurementCreate(BaseModel):
    date: str
    weight: float = 0
    body_fat: float = 0
    chest: float = 0
    waist: float = 0
    hips: float = 0
    left_arm: float = 0
    right_arm: float = 0
    left_thigh: float = 0
    right_thigh: float = 0

class ChatRequest(BaseModel):
    text: str
    image_base64: str = ""

class UserProfile(BaseModel):
    name: str = "User"
    age: int = 25
    gender: str = "male"
    height: float = 170
    weight: float = 70
    goal: str = "build_muscle"
    activity_level: str = "moderate"

class ImageAnalyzeRequest(BaseModel):
    image_base64: str
    meal_type: str = "lunch"

# ============== HELPERS ==============
def estimate_calories(sets: List[WorkoutSet]) -> float:
    total = 0.0
    for s in sets:
        w = s.weight if s.weight > 0 else 70.0
        total += max(5.0, w * s.reps * 0.01)
    return round(total, 1)

async def get_today_data(date_str: str = None) -> Dict[str, Any]:
    if not date_str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    workouts = await db.workouts.find({"date": date_str}, {"_id": 0}).to_list(100)
    meals = await db.meals.find({"date": date_str}, {"_id": 0, "image_base64": 0}).to_list(100)
    measurements = await db.measurements.find({}, {"_id": 0}).sort("created_at", -1).to_list(1)
    profile = await db.profile.find_one({}, {"_id": 0})
    total_cal_in = sum(m.get("total_calories", 0) for m in meals)
    total_cal_out = sum(w.get("calories_burned", 0) for w in workouts)
    return {
        "date": date_str,
        "workouts": workouts,
        "meals": meals,
        "latest_measurements": measurements[0] if measurements else {},
        "profile": profile or {},
        "total_calories_in": total_cal_in,
        "total_calories_out": total_cal_out,
    }

PERSONA_PROMPTS = {
    "trainer": """You are Coach Iron, an elite fitness trainer AI. You're direct, motivating, and data-driven.
YOUR ROLE: Analyze workout logs, suggest improvements, recommend exercises, rep ranges, progressive overload.
Provide form tips and injury prevention. Create workout splits when asked.
STYLE: Confident, knowledgeable, slightly intense. Use fitness terminology naturally. Keep responses concise.""",

    "nutritionist": """You are Dr. Fuel, a sports nutritionist AI. You're precise, scientific, and practical.
YOUR ROLE: Analyze meal images/descriptions, estimate calories and macros. Advise what to eat and avoid from mess menus.
Count and track calorie intake. Recommend meal timing and portions. When shown a food image, identify each item with detailed nutritional breakdown.
STYLE: Be specific with numbers (calories, protein grams). Be practical about food choices. Keep responses concise.""",

    "buddy": """You are BroFit, a fitness buddy AI. You're the knowledgeable gym bro everyone wishes they had.
YOUR ROLE: Answer ANY fitness-related question without holding back. Discuss supplements, recovery, training techniques, body transformation.
Share honest opinions about routines, diet plans, fitness trends. Be real about what works and what doesn't.
STYLE: Casual, friendly, like talking to your most knowledgeable gym buddy. Be uncensored and honest. No BS. Keep responses concise."""
}

async def chat_with_persona(persona: str, user_text: str, image_base64: str = "") -> str:
    if not EMERGENT_LLM_KEY:
        return "AI service not configured. Please set up the EMERGENT_LLM_KEY."
    today_data = await get_today_data()
    context_parts = [PERSONA_PROMPTS.get(persona, "You are a helpful fitness assistant.")]
    context_parts.append(f"\n\n=== TODAY'S DATA ({today_data['date']}) ===")
    if today_data['profile']:
        p = today_data['profile']
        context_parts.append(f"User: {p.get('name','User')}, {p.get('age','?')}y, {p.get('gender','?')}, {p.get('height','?')}cm, {p.get('weight','?')}kg, Goal: {p.get('goal','?')}")
    if today_data['workouts']:
        lines = []
        for w in today_data['workouts']:
            sets_str = ", ".join([f"{s.get('weight',0)}kg x {s.get('reps',0)}" for s in w.get('sets', [])])
            lines.append(f"  {w['exercise']} ({w['muscle_group']}): {sets_str}")
        context_parts.append("Workouts:\n" + "\n".join(lines))
    else:
        context_parts.append("Workouts: None logged yet")
    if today_data['meals']:
        lines = []
        for m in today_data['meals']:
            items_str = ", ".join([f"{i.get('name','?')} ({i.get('calories',0)}cal)" for i in m.get('items', [])])
            lines.append(f"  {m['meal_type']}: {items_str} ({m.get('total_calories',0)}cal total)")
        context_parts.append("Meals:\n" + "\n".join(lines))
    else:
        context_parts.append("Meals: None logged yet")
    context_parts.append(f"Calories: {today_data['total_calories_in']} in / {today_data['total_calories_out']} burned")
    if today_data['latest_measurements']:
        m = today_data['latest_measurements']
        context_parts.append(f"Body: {m.get('weight','?')}kg, {m.get('body_fat','?')}% BF, Chest {m.get('chest','?')}cm, Waist {m.get('waist','?')}cm")
    recent = await db.chat_messages.find({"persona": persona}, {"_id": 0}).sort("created_at", -1).to_list(8)
    recent.reverse()
    if recent:
        context_parts.append("\n=== RECENT CHAT ===")
        for msg in recent[-6:]:
            role = "User" if msg['role'] == 'user' else "You"
            context_parts.append(f"{role}: {msg['text'][:300]}")
    system_message = "\n".join(context_parts)
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"{persona}-{str(uuid.uuid4())[:8]}",
        system_message=system_message
    )
    chat.with_model("openai", "gpt-5.2")
    if image_base64:
        image_content = ImageContent(image_base64=image_base64)
        user_message = UserMessage(text=user_text, file_contents=[image_content])
    else:
        user_message = UserMessage(text=user_text)
    response = await chat.send_message(user_message)
    return response

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Forge Fitness API"}

@api_router.get("/health")
async def health():
    return {"status": "ok"}

@api_router.get("/exercises")
async def get_exercises():
    return EXERCISES_DB

# --- Workouts ---
@api_router.post("/workouts")
async def create_workout(workout: WorkoutLogCreate):
    cal = estimate_calories(workout.sets)
    doc = {
        "id": str(uuid.uuid4()),
        "date": workout.date,
        "muscle_group": workout.muscle_group,
        "exercise": workout.exercise,
        "sets": [s.dict() for s in workout.sets],
        "notes": workout.notes,
        "calories_burned": cal,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workouts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/workouts")
async def get_workouts(date: str = None):
    query = {}
    if date:
        query["date"] = date
    return await db.workouts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: str):
    result = await db.workouts.delete_one({"id": workout_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# --- Meals ---
@api_router.post("/meals")
async def create_meal(meal: MealLogCreate):
    total = sum(item.calories for item in meal.items)
    doc = {
        "id": str(uuid.uuid4()),
        "date": meal.date,
        "meal_type": meal.meal_type,
        "items": [i.dict() for i in meal.items],
        "total_calories": total if total > 0 else meal.total_calories,
        "notes": meal.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.meals.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/meals")
async def get_meals(date: str = None):
    query = {}
    if date:
        query["date"] = date
    return await db.meals.find(query, {"_id": 0, "image_base64": 0}).sort("created_at", -1).to_list(100)

@api_router.delete("/meals/{meal_id}")
async def delete_meal(meal_id: str):
    result = await db.meals.delete_one({"id": meal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

@api_router.post("/meals/analyze")
async def analyze_meal_image(req: ImageAnalyzeRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI not configured")
    if not req.image_base64 or len(req.image_base64) < 100:
        raise HTTPException(status_code=400, detail="Invalid image data. Please provide a valid base64-encoded image.")
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"meal-{str(uuid.uuid4())[:8]}",
            system_message="You are a precise food nutritionist. Analyze the food image and return a JSON array of food items. Format: [{\"name\": \"food\", \"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number}]. Only return valid JSON array, nothing else."
        )
        chat.with_model("openai", "gpt-5.2")
        image_content = ImageContent(image_base64=req.image_base64)
        user_message = UserMessage(
            text=f"Analyze this {req.meal_type} image. Identify each food item and estimate calories, protein(g), carbs(g), fat(g). Return ONLY a valid JSON array.",
            file_contents=[image_content]
        )
        response = await chat.send_message(user_message)
        try:
            json_str = response.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            items = json.loads(json_str.strip())
            return {"items": items, "raw_response": response}
        except Exception:
            return {"items": [], "raw_response": response}
    except Exception as e:
        logger.error(f"Meal analysis error: {e}")
        raise HTTPException(status_code=400, detail="Could not analyze the image. Please try a clearer photo.")

# --- Body Measurements ---
@api_router.post("/measurements")
async def create_measurement(measurement: BodyMeasurementCreate):
    doc = {
        "id": str(uuid.uuid4()),
        **measurement.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.measurements.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/measurements")
async def get_measurements():
    return await db.measurements.find({}, {"_id": 0}).sort("date", -1).to_list(50)

@api_router.get("/measurements/latest")
async def get_latest_measurement():
    m = await db.measurements.find({}, {"_id": 0}).sort("date", -1).to_list(1)
    return m[0] if m else {}

# --- Chat ---
@api_router.post("/chat/{persona}")
async def send_chat(persona: str, req: ChatRequest):
    if persona not in ["trainer", "nutritionist", "buddy"]:
        raise HTTPException(status_code=400, detail="Invalid persona")
    user_doc = {
        "id": str(uuid.uuid4()),
        "persona": persona,
        "role": "user",
        "text": req.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(user_doc)
    response_text = await chat_with_persona(persona, req.text, req.image_base64)
    assistant_doc = {
        "id": str(uuid.uuid4()),
        "persona": persona,
        "role": "assistant",
        "text": response_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(assistant_doc)
    return {"id": assistant_doc["id"], "persona": persona, "role": "assistant", "text": response_text, "created_at": assistant_doc["created_at"]}

@api_router.get("/chat/{persona}/history")
async def get_chat_history(persona: str, limit: int = 50):
    if persona not in ["trainer", "nutritionist", "buddy"]:
        raise HTTPException(status_code=400, detail="Invalid persona")
    return await db.chat_messages.find({"persona": persona}, {"_id": 0}).sort("created_at", 1).to_list(limit)

@api_router.delete("/chat/{persona}/history")
async def clear_chat(persona: str):
    if persona not in ["trainer", "nutritionist", "buddy"]:
        raise HTTPException(status_code=400, detail="Invalid persona")
    await db.chat_messages.delete_many({"persona": persona})
    return {"message": "Cleared"}

# --- Dashboard ---
@api_router.get("/dashboard")
async def get_dashboard(date: str = None):
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    data = await get_today_data(date)
    muscle_groups = list(set(w.get("muscle_group", "") for w in data["workouts"]))
    return {
        "date": date,
        "calories_consumed": data["total_calories_in"],
        "calories_burned": data["total_calories_out"],
        "net_calories": data["total_calories_in"] - data["total_calories_out"],
        "workout_count": len(data["workouts"]),
        "muscle_groups_worked": muscle_groups,
        "meals_count": len(data["meals"]),
        "latest_measurements": data["latest_measurements"],
        "profile": data["profile"],
    }

# --- Profile ---
@api_router.get("/profile")
async def get_profile():
    profile = await db.profile.find_one({}, {"_id": 0})
    if not profile:
        default = UserProfile().dict()
        await db.profile.insert_one(default)
        default.pop("_id", None)
        return default
    return profile

@api_router.put("/profile")
async def update_profile(profile: UserProfile):
    doc = profile.dict()
    await db.profile.update_one({}, {"$set": doc}, upsert=True)
    return doc

# ============== APP CONFIG ==============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
