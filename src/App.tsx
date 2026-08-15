import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./app/layout/AppShell";
import LandingPage from "./features/landing/LandingPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
