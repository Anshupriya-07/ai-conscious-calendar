import { useState } from "react";

function App() {
  const [tasks, setTasks] = useState([]);          
  const [taskInput, setTaskInput] = useState("");  
  const [energy, setEnergy] = useState(5);         
  const [mood, setMood] = useState("Neutral");     
  const [schedule, setSchedule] = useState([]);    

  const chipColors = [
    "bg-pink-200",
    "bg-yellow-200",
    "bg-green-200",
    "bg-blue-200",
    "bg-purple-200",
    "bg-orange-200",
    "bg-teal-200",
  ];

  const getRandomColor = () =>
    chipColors[Math.floor(Math.random() * chipColors.length)];

  const handleAddTask = () => {
    if (taskInput.trim() !== "") {
      setTasks([...tasks, { text: taskInput.trim(), color: getRandomColor() }]);
      setTaskInput("");
      setSchedule([]);
    }
  };

  const handleRemoveTask = (index) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
    setSchedule([]);
  };

  const handleGenerateSchedule = async () => {
    if (tasks.length === 0) {
      alert("Please add at least one task before generating a schedule.");
      return;
    }

    const API_URL = "https://ai-conscious-calendar-gyds.onrender.com";

    const payload = {
      tasks: tasks.map((t) => t.text),
      energy,
      mood
    };

    console.log("Sending to backend:", payload); // 🔥 Log payload for debugging

    try {
      const response = await fetch(`${API_URL}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Backend error:", response.status, text);
        alert("Error generating schedule. See console for details.");
        return;
      }

      const data = await response.json();
      console.log("Received from backend:", data); // 🔥 Log backend response
      setSchedule(data.schedule || []);
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
      alert("Error generating schedule. Check backend console.");
    }
  };

  const getCardStyle = (type) => {
    switch (type) {
      case "Deep Work": return "bg-gradient-to-br from-red-400 to-red-200 text-white";
      case "Creative": return "bg-gradient-to-br from-purple-400 to-pink-300 text-white";
      case "Shallow": return "bg-gradient-to-br from-blue-400 to-blue-200 text-white";
      case "Break": return "bg-gradient-to-br from-yellow-300 to-yellow-100 text-gray-800";
      default: return "bg-gray-200 text-gray-800";
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
          <div key={i} className={`flex items-center ${t.color} shadow px-4 py-2 rounded-xl`}>
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
        <label className="block mt-6 mb-3 font-semibold text-gray-700">Mood:</label>
<div className="flex gap-4 justify-center">
  <button
    onClick={() => setMood("Tired")}
    className={`text-3xl p-2 rounded-full ${mood === "Tired" ? "ring-4 ring-blue-400" : ""}`}
  >
    😴
  </button>
  <button
    onClick={() => setMood("Neutral")}
    className={`text-3xl p-2 rounded-full ${mood === "Neutral" ? "ring-4 ring-blue-400" : ""}`}
  >
    😐
  </button>
  <button
    onClick={() => setMood("Happy")}
    className={`text-3xl p-2 rounded-full ${mood === "Happy" ? "ring-4 ring-blue-400" : ""}`}
  >
    😁
  </button>
  <button
    onClick={() => setMood("Stressed")}
    className={`text-3xl p-2 rounded-full ${mood === "Stressed" ? "ring-4 ring-blue-400" : ""}`}
  >
    😡
  </button>
</div>

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
          <div key={idx} className={`${getCardStyle(item.type)} p-5 rounded-2xl shadow-lg transform transition hover:scale-105`}>
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