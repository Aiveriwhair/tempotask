import { NavLink, Route, Routes } from "react-router-dom";
import { BarChart3, CalendarDays, ListChecks, Settings2, TimerIcon } from "lucide-react";
import "./App.css";
import ActivitiesPage from "./pages/ActivitiesPage";
import CalendarPage from "./pages/CalendarPage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";
import { useTimer } from "./lib/TimerContext";
import { computeElapsedSeconds, formatMinutes, formatSeconds } from "./lib/format";

const NAV_ITEMS = [
  { to: "/", end: true, label: "Activités", icon: ListChecks },
  { to: "/calendar", end: false, label: "Calendrier", icon: CalendarDays },
  { to: "/stats", end: false, label: "Stats", icon: BarChart3 },
  { to: "/settings", end: false, label: "Réglages", icon: Settings2 },
];

function App() {
  const { runningActivity, now, todayMinutes } = useTimer();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <TimerIcon size={16} />
          </span>
          TempoTask
        </div>
        <nav>
          {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {runningActivity ? (
            <div className="running-indicator">
              <span className="pulse-dot" />
              <div>
                <div className="running-name">
                  {runningActivity.name}
                  {runningActivity.running_paused_at ? " (pause)" : ""}
                </div>
                <div className="running-time">
                  {formatSeconds(
                    computeElapsedSeconds(
                      runningActivity.running_start_time as string,
                      runningActivity.running_paused_at,
                      runningActivity.running_paused_duration_seconds,
                      now
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="running-indicator idle">Aucun timer actif</div>
          )}
          <div className="sidebar-today">Aujourd'hui : {formatMinutes(todayMinutes)}</div>
        </div>
      </aside>
      <main className="content">
        <div className="content-inner">
          <Routes>
            <Route path="/" element={<ActivitiesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
