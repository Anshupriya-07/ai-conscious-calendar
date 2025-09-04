export async function getHealth() {
  const response = await fetch("https://ai-conscious-calendar.onrender.com/health");
  return await response.json();
}

export async function generateSchedule(tasks, energy, mood) {
  const response = await fetch("https://ai-conscious-calendar.onrender.com/schedule", {
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

  return await response.json();
}

