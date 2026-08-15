import { Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>Krunditark</strong>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
