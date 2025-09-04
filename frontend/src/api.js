// api.js

// Check if backend is healthy
export async function getHealth() {
  const response = await fetch("https://ai-conscious-calendar-gyds.onrender.com/health");
  return await response.json();
}

// Generate schedule by calling the correct POST endpoint
export async function generateSchedule(tasks, energy, mood) {
  const response = await fetch("https://ai-conscious-calendar-gyds.onrender.com/schedule", { // <-- /schedule added
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks,
      energy,
      mood,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Backend error:", response.status, text);
    throw new Error("Failed to generate schedule. See console for details.");
  }

  return await response.json();
}
