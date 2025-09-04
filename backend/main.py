import os
import json
import traceback
from dotenv import load_dotenv
from groq import Groq

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ---------------------------
# Load environment variables
# ---------------------------
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key or api_key.startswith("YOUR_"):
    raise ValueError("Groq API key not loaded properly. Check your .env file.")
else:
    print("Groq key loaded:", api_key[:6] + "*****")

# Initialize Groq client
client = Groq(api_key=api_key)

# ---------------------------
# Initialize FastAPI
# ---------------------------
app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------------
# CORS (allow all origins in simple deployments)
# ---------------------------
# For production, set FRONTEND_URL env var and add it to allowed origins instead of "*".
frontend_url = os.getenv("FRONTEND_URL", "").strip()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
]
if frontend_url:
    origins.append(frontend_url)

# If you need permissive CORS during quick deploy/testing:
allow_all = os.getenv("ALLOW_ALL_ORIGINS", "true").lower() in ("1", "true", "yes")
if allow_all:
    origins = ["*"]
    allow_credentials_flag = False
else:
    allow_credentials_flag = True
# Note: when origins == ["*"], do not set allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials_flag,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Request and Response Models
# ---------------------------
class TaskInput(BaseModel):
    tasks: list[str]
    energy: int
    mood: str

class ScheduleItem(BaseModel):
    time: str
    task: str
    type: str
    reason: str

class ScheduleResponse(BaseModel):
    schedule: list[ScheduleItem]

# ---------------------------
# Energy-aware scheduling
# ---------------------------
def assign_slots(tasks, energy, mood):
    energy_slots = {
        "high": ["9 AM", "11 AM"],
        "medium": ["1 PM", "3 PM"],
        "low": ["5 PM", "7 PM"]
    }
    type_priority = {"Deep Work": 1, "Creative": 2, "Shallow": 3}
    # tasks is a list of dicts: {task, type, reason}
    tasks_sorted = sorted(tasks, key=lambda t: type_priority.get(t.get('type', ''), 3))

    schedule = []
    slot_counters = {"high": 0, "medium": 0, "low": 0}

    for task in tasks_sorted:
        t_type = task.get('type', '')

        if t_type == "Deep Work":
            zone = "high" if energy >= 5 and mood.lower() not in ["tired", "low"] else "medium"
        elif t_type == "Creative":
            zone = "low" if energy <= 4 else "medium"
        else:
            zone = "medium" if energy >= 5 else "low"

        slots = energy_slots[zone]
        idx = slot_counters[zone] % len(slots)
        time_slot = slots[idx]
        slot_counters[zone] += 1

        schedule.append({
            "time": time_slot,
            "task": task.get('task', ''),
            "type": task.get('type', ''),
            "reason": task.get('reason', "")
        })

    return schedule

# ---------------------------
# Break-aware scheduling
# ---------------------------
def assign_slots_with_breaks(tasks, energy, mood):
    schedule = assign_slots(tasks, energy, mood)
    final_schedule = []
    deep_work_count = 0

    for item in schedule:
        final_schedule.append(item)
        if item.get('type') == "Deep Work":
            deep_work_count += 1
            if deep_work_count % 2 == 0:
                final_schedule.append({
                    "time": "Break",
                    "task": "Take a short break",
                    "type": "Break",
                    "reason": "Recharge before next deep work session"
                })
    return final_schedule

# ---------------------------
# Schedule generation endpoint
# ---------------------------
@app.post("/schedule", response_model=ScheduleResponse)
def generate_schedule(input: TaskInput):
    schedule = []

    for i, task_text in enumerate(input.tasks):
        prompt = f"""
Classify the following task strictly as one of [Deep Work, Creative, Shallow].
Also provide a one-line reason. Respond ONLY in JSON format like:
{{"type": "Deep Work", "reason": "Requires focused, uninterrupted work."}}
Task: {task_text}
"""
        task_type, reason = "Unknown", ""

        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )

            # Safely extract model response (defensive in case SDK shape differs)
            raw_content = ""
            try:
                raw_content = (
                    getattr(response.choices[0].message, "content", None)
                    or response.choices[0].message.get("content", "")
                )
            except Exception:
                # fallback if SDK structure is different
                raw_content = str(response)

            raw_content = raw_content.strip()

            # Clean JSON if wrapped in code fences
            if raw_content.startswith("```"):
                raw_content = raw_content.strip("` \n")
                if raw_content.startswith("json"):
                    raw_content = raw_content[len("json"):].strip()

            print("\n==== RAW RESPONSE ====")
            print(raw_content)
            print("====================\n")

            try:
                parsed = json.loads(raw_content)
                task_type = parsed.get("type", "Unknown")
                reason = parsed.get("reason", "")
            except json.JSONDecodeError:
                print("❌ Failed to parse JSON from Groq response.")

        except Exception as e:
            print("\n" + "="*50)
            print("Groq error caught!")
            print(e)
            traceback.print_exc()
            print("="*50 + "\n")

        schedule.append({
            "task": task_text,
            "type": task_type,
            "reason": reason
        })

    final_schedule = assign_slots_with_breaks(schedule, input.energy, input.mood)
    return {"schedule": final_schedule}

# ---------------------------
# Serve React build (dist) as static files
# ---------------------------
# Mount the 'dist' folder created by `npm run build`.
# Keep this mount AFTER API routes so endpoints like /schedule still work.
app.mount("/", StaticFiles(directory="dist", html=True), name="static")

# ---------------------------
# Run with Render-compatible settings
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Render provides PORT
    uvicorn.run(app, host="0.0.0.0", port=port)

