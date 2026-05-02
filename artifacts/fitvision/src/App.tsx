import { useState } from "react";

type Screen = "welcome" | "dashboard";

function WelcomeScreen({ onSelect }: { onSelect: (gender: "man" | "woman") => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      <div className="mb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-stone-900">
          FitVision
        </h1>
        <p className="mt-3 text-base text-stone-500">
          Your personal fitness journey
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <button
          type="button"
          onClick={() => onSelect("man")}
          className="w-full rounded-2xl bg-stone-900 px-6 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-stone-800"
          style={{ minHeight: 60 }}
        >
          I am a Man
        </button>
        <button
          type="button"
          onClick={() => onSelect("woman")}
          className="w-full rounded-2xl border border-stone-200 bg-white px-6 text-lg font-semibold text-stone-900 shadow-sm transition active:scale-[0.98] active:bg-stone-100"
          style={{ minHeight: 60 }}
        >
          I am a Woman
        </button>
      </div>
    </div>
  );
}

function DashboardScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6">
      <h2 className="text-4xl font-bold text-stone-900">Welcome</h2>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("welcome");

  const goToDashboard = () => setScreen("dashboard");

  return (
    <div className="relative mx-auto h-full w-full max-w-md bg-stone-50">
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          screen === "welcome" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <WelcomeScreen onSelect={goToDashboard} />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          screen === "dashboard" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <DashboardScreen />
      </div>
    </div>
  );
}

export default App;
