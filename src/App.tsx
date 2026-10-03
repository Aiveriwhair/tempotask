import { NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import ActivitiesPage from "./pages/ActivitiesPage";
import CalendarPage from "./pages/CalendarPage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";
import { useTimer } from "./lib/TimerContext";
import { computeElapsedSeconds, formatMinutes, formatSeconds } from "./lib/format";

function App() {
  const { runningActivity, now, todayMinutes } = useTimer();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">⏱ TempoTask</div>
        <nav>
          <NavLink to="/" end className="nav-link">
            Activités
          </NavLink>
          <NavLink to="/calendar" className="nav-link">
            Calendrier
          </NavLink>
          <NavLink to="/stats" className="nav-link">
            Stats
          </NavLink>
          <NavLink to="/settings" className="nav-link">
            Réglages
          </NavLink>
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
        <Routes>
          <Route path="/" element={<ActivitiesPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
