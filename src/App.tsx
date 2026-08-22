import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LocaleProvider from "./lib/i18n/LocaleProvider";
import AppShell from "./app/layout/AppShell";
import LandingPage from "./features/landing/LandingPage";
import { ProjectStateProvider } from "./features/project-state";
import { DEFAULT_LOCALE, isValidAppLocale } from "./lib/i18n/types";

function RootRedirect() {
  const navigate = useNavigate();
  const stored = localStorage.getItem("krunditark-locale");
  const browserLang =
    typeof navigator !== "undefined" ? navigator.language.split("-")[0] : DEFAULT_LOCALE;
  const initial =
    stored && isValidAppLocale(stored)
      ? stored
      : isValidAppLocale(browserLang)
        ? browserLang
        : DEFAULT_LOCALE;

  useEffect(() => {
    navigate(initial, { replace: true });
  }, [initial, navigate]);

  return null;
}

export default function App() {
  return (
    <ProjectStateProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:locale" element={<LocaleProvider />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="landing" replace />} />
            <Route path="landing" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="landing" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={`${DEFAULT_LOCALE}/landing`} replace />} />
      </Routes>
    </ProjectStateProvider>
  );
}
