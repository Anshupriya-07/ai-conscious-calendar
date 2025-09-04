// api.js

// Check if backend is healthy
export async function getHealth() {
  try {
    const response = await fetch("https://ai-conscious-calendar-gyds.onrender.com/health");
    if (!response.ok) {
      const text = await response.text();
      console.error("Health check failed:", response.status, text);
      throw new Error("Backend health check failed");
    }
    return await response.json();
  } catch (err) {
    console.error("Failed to fetch health:", err);
    throw err;
  }
}

// Generate schedule by calling the correct POST endpoint
export async function generateSchedule(tasks, energy, mood) {
  try {
    const response = await fetch(
      "https://ai-conscious-calendar-gyds.onrender.com/schedule", // Correct endpoint
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, energy, mood }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Backend error:", response.status, text);
      throw new Error("Failed to generate schedule. See console for details.");
    }

    const data = await response.json();

    // Defensive check: ensure schedule is an array
    if (!data.schedule || !Array.isArray(data.schedule)) {
      console.warn("Unexpected backend response:", data);
      data.schedule = [];
    }

    return data;
  } catch (err) {
    console.error("Error calling generateSchedule:", err);
    throw err;
  }
}
