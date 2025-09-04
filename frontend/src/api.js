export async function getHealth() {
  const response = await fetch("http://127.0.0.1:8000/health");
  return await response.json();
}

export async function generateSchedule(tasks, energy, mood) {
  const response = await fetch("http://127.0.0.1:8000/schedule", {
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
