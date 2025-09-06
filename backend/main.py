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

if not api_key:
    print("⚠️ Warning: GROQ_API_KEY not set. Schedule generation will fail.")

# ---------------------------
# FastAPI app
# ---------------------------
app = FastAPI(title="AI Conscious Scheduler")

# ---------------------------
# CORS setup
# ---------------------------
frontend_url = os.getenv("FRONTEND_URL", "").strip()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
]

if frontend_url:
    origins.append(frontend_url)

allow_all = os.getenv("ALLOW_ALL_ORIGINS", "true").lower() in ("1", "true", "yes")
if allow_all:
    origins = ["*"]
    allow_credentials_flag = False
else:
    allow_credentials_flag = True

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
# Energy + mood aware scheduling with breaks
# ---------------------------
def assign_slots_with_breaks(tasks, energy, mood):
    # Base slots per energy zone
    energy_slots = {
        "high": ["9 AM", "10 AM", "11 AM", "12 PM"],
        "medium": ["1 PM", "2 PM", "3 PM", "4 PM"],
        "low": ["5 PM", "6 PM", "7 PM", "8 PM"]
    }

    mood_lower = mood.lower()
    type_priority = {"Deep Work": 1, "Creative": 2, "Shallow": 3}
    tasks_sorted = sorted(tasks, key=lambda t: type_priority.get(t.get('type', ''), 3))

    schedule = []
    used_slots = set()
    deep_work_count = 0
    slot_extension_counter = 0

    for task in tasks_sorted:
        t_type = task.get("type", "")

        # Determine zone based on energy and mood
        if t_type == "Deep Work":
            if energy >= 7 and mood_lower not in ["tired", "low"]:
                zone = "high"
            elif energy >= 4:
                zone = "medium"
            else:
                zone = "low"
        elif t_type == "Creative":
            if mood_lower in ["happy", "excited", "inspired"]:
                zone = "high" if energy >= 5 else "medium"
            else:
                zone = "medium" if energy >= 5 else "low"
        else:  # Shallow
            zone = "medium" if energy >= 5 else "low"

        # Find first available slot in zone
        slot = next((s for s in energy_slots[zone] if s not in used_slots), None)

        # If all slots in the zone are used, extend dynamically
        if not slot:
            all_slots_flat = sum(energy_slots.values(), [])
            while True:
                base_slot = all_slots_flat[slot_extension_counter % len(all_slots_flat)]
                new_slot = f"{base_slot} (+{slot_extension_counter // len(all_slots_flat) + 1})"
                slot_extension_counter += 1
                if new_slot not in used_slots:
                    slot = new_slot
                    break

        used_slots.add(slot)

        schedule.append({
            "time": slot,
            "task": task.get("task", ""),
            "type": t_type,
            "reason": task.get("reason", "")
        })

        # Insert a break after every 2 Deep Work sessions
        if t_type == "Deep Work":
            deep_work_count += 1
            if deep_work_count % 2 == 0:
                break_slot = next((s for s in sum(energy_slots.values(), []) if s not in used_slots), None)
                if not break_slot:
                    break_slot = f"Break (+{slot_extension_counter})"
                    slot_extension_counter += 1
                used_slots.add(break_slot)
                schedule.append({
                    "time": break_slot,
                    "task": "Take a short break",
                    "type": "Break",
                    "reason": "Recharge before next deep work session"
                })

    return schedule

# ---------------------------
# Health check endpoint
# ---------------------------
@app.get("/health")
def health_check():
    return {"status": "ok"}

# ---------------------------
# Schedule generation endpoint (Batch Classification)
# ---------------------------
@app.post("/schedule", response_model=ScheduleResponse)
def generate_schedule(input: TaskInput):
    # Build one prompt for all tasks
    prompt = f"""
Classify the following tasks strictly as one of [Deep Work, Creative, Shallow].
For each task, also provide a one-line reason.

Respond ONLY with a JSON array in this format:
[
  {{"task": "Finish report", "type": "Deep Work", "reason": "Requires focus"}},
  {{"task": "Design logo", "type": "Creative", "reason": "Needs creativity"}}
]

Tasks: {json.dumps(input.tasks)}
"""

    schedule = []

    try:
        response = Groq(api_key).chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )

        # Extract model response
        raw_content = (
            getattr(response.choices[0].message, "content", None)
            or response.choices[0].message.get("content", "")
        ).strip()

        # Clean JSON if wrapped in code fences
        if raw_content.startswith("```"):
            raw_content = raw_content.strip("` \n")
            if raw_content.startswith("json"):
                raw_content = raw_content[len("json"):].strip()

        print("\n==== RAW RESPONSE ====")
        print(raw_content)
        print("====================\n")

        parsed = json.loads(raw_content)
        if isinstance(parsed, list):
            schedule = parsed
        else:
            print("❌ Unexpected format, falling back.")
            schedule = [{"task": t, "type": "Unknown", "reason": ""} for t in input.tasks]

    except Exception as e:
        print("\n" + "="*50)
        print("Groq error caught!")
        print(e)
        traceback.print_exc()
        print("="*50 + "\n")
        schedule = [{"task": t, "type": "Unknown", "reason": ""} for t in input.tasks]

    final_schedule = assign_slots_with_breaks(schedule, input.energy, input.mood)
    return {"schedule": final_schedule}

# ---------------------------
# Serve React build (dist) as static files
# ---------------------------
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")
else:
    print("⚠️ Warning: 'dist' folder not found. React frontend will not be served.")

# ---------------------------
# Run with Render-compatible settings
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

