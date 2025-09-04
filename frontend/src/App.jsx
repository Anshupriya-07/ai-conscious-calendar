import { useState } from "react";

function App() {
  const [tasks, setTasks] = useState([]);          // array of {text, color}
  const [taskInput, setTaskInput] = useState("");  // input for new task
  const [energy, setEnergy] = useState(5);         // energy slider 1–10
  const [mood, setMood] = useState("Neutral");     // mood select
  const [schedule, setSchedule] = useState([]);    // schedule from backend

  // Some pastel Pinterest-like colors
  const chipColors = [
    "bg-pink-200",
    "bg-yellow-200",
    "bg-green-200",
    "bg-blue-200",
    "bg-purple-200",
    "bg-orange-200",
    "bg-teal-200",
  ];

  // Pick random color for new chip
  const getRandomColor = () =>
    chipColors[Math.floor(Math.random() * chipColors.length)];

  // Add a task
  const handleAddTask = () => {
    if (taskInput.trim() !== "") {
      setTasks([...tasks, { text: taskInput.trim(), color: getRandomColor() }]);
      setTaskInput("");
      setSchedule([]); // clear old schedule when tasks change
    }
  };

  // Remove a task
  const handleRemoveTask = (index) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
    setSchedule([]); // clear old schedule when tasks change
  };

  // Call backend to generate schedule
  const handleGenerateSchedule = async () => {
    if (tasks.length === 0) {
      alert("Please add at least one task before generating a schedule.");
      return;
    }

    // Relative path for same-origin backend (works on Render monorepo)
    const API_URL = "";

    try {
      const response = await fetch(`${API_URL}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasks.map((t) => t.text), // only send text
          energy,
          mood,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Backend error:", response.status, text);
        alert("Error generating schedule. See console for details.");
        return;
      }

      const data = await response.json();
      setSchedule(data.schedule || []);
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
      alert("Error generating schedule. Check backend console.");
    }
  };

  // Card colors for schedule
  const getCardStyle = (type) => {
    switch (type) {
      case "Deep Work":
        return "bg-gradient-to-br from-red-400 to-red-200 text-white";
      case "Creative":
        return "bg-gradient-to-br from-purple-400 to-pink-300 text-white";
      case "Shallow":
        return "bg-gradient-to-br from-blue-400 to-blue-200 text-white";
      case "Break":
        return "bg-gradient-to-br from-yellow-300 to-yellow-100 text-gray-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-6">
      <h1 className="text-4xl font-extrabold mb-6 text-center text-gray-800">
        AI Conscious Scheduler
      </h1>

      {/* Task input */}
      <div className="mb-6 flex gap-2 justify-center">
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="Enter a task"
          className="border p-3 rounded-xl flex-1 max-w-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleAddTask}
          className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
        >
          Add
        </button>
      </div>

      {/* Task chips */}
      <div className="mb-8 flex flex-wrap gap-3 justify-center">
        {tasks.map((t, i) => (
          <div
            key={i}
            className={`flex items-center ${t.color} shadow px-4 py-2 rounded-xl`}
          >
            <span className="font-medium">{t.text}</span>
            <button
              onClick={() => handleRemoveTask(i)}
              className="ml-3 text-red-600 font-bold hover:text-red-800"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Mood / Energy input */}
      <div className="mb-8 max-w-md mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <label className="block mb-3 font-semibold text-gray-700">
          Energy (1-10): <span className="text-blue-600">{energy}</span>
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
          className="w-full accent-blue-600"
        />

        <label className="block mt-6 mb-3 font-semibold text-gray-700">
          Mood:
        </label>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="border p-3 rounded-xl w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="Neutral">Neutral</option>
          <option value="Tired">Tired</option>
          <option value="Happy">Happy</option>
          <option value="Stressed">Stressed</option>
        </select>
      </div>

      {/* Generate schedule button */}
      <div className="text-center">
        <button
          onClick={handleGenerateSchedule}
          className="mb-10 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-md transition"
        >
          Generate Schedule
        </button>
      </div>

      {/* Schedule display */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {schedule.length === 0 && (
          <p className="text-gray-500 italic col-span-full text-center">
            No schedule generated yet. Add tasks and click "Generate Schedule".
          </p>
        )}
        {schedule.map((item, idx) => (
          <div
            key={idx}
            className={`${getCardStyle(item.type)} p-5 rounded-2xl shadow-lg transform transition hover:scale-105`}
          >
            <p className="text-lg font-bold">{item.time}</p>
            <p className="mt-1">{item.task}</p>
            {item.reason && <p className="mt-2 text-sm opacity-80">{item.reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
