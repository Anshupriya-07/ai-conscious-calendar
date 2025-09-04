export async function getHealth() {
<<<<<<< HEAD
  const response = await fetch("https://ai-conscious-calendar.onrender.com/health");
=======
  const response = await fetch("http://127.0.0.1:8000/health");
>>>>>>> 29745e87863b4ff13c95bcb393bc217598833823
  return await response.json();
}

export async function generateSchedule(tasks, energy, mood) {
<<<<<<< HEAD
  const response = await fetch("https://ai-conscious-calendar.onrender.com/generate", {
=======
  const response = await fetch("http://127.0.0.1:8000/schedule", {
>>>>>>> 29745e87863b4ff13c95bcb393bc217598833823
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
