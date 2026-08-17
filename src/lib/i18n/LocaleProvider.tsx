import { useEffect, useMemo, useCallback, createContext, useContext } from "react";
import { useNavigate, useParams, useLocation, Outlet } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n, { setAppLocale } from "./index";
import { AppLocale, DEFAULT_LOCALE, isValidAppLocale } from "./types";
import { stripBasePath } from "../basePath";

const LOCALE_STORAGE_KEY = "krunditark-locale";

const LocaleContext = createContext<{
  locale: AppLocale;
  changeLocale: (locale: AppLocale) => void;
} | null>(null);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

function getPathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

export default function LocaleProvider() {
  const { locale: urlLocale } = useParams<{ locale: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const locale = useMemo<AppLocale>(() => {
    if (urlLocale && isValidAppLocale(urlLocale)) {
      return urlLocale;
    }
    return DEFAULT_LOCALE;
  }, [urlLocale]);

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (urlLocale && !isValidAppLocale(urlLocale)) {
      const segments = getPathSegments(stripBasePath(location.pathname));
      segments[0] = DEFAULT_LOCALE;
      navigate(`/${segments.join("/") || "landing"}`, { replace: true });
    }
  }, [urlLocale, navigate, location.pathname]);

  const changeLocale = useCallback(
    (newLocale: AppLocale) => {
      const segments = getPathSegments(stripBasePath(location.pathname));
      if (segments.length === 0 || !isValidAppLocale(segments[0])) {
        segments.unshift(newLocale);
      } else {
        segments[0] = newLocale;
      }
      navigate(`/${segments.join("/") || "landing"}`, { replace: true });
    },
    [navigate, location.pathname]
  );

  useEffect(() => {
    setAppLocale(locale);
  }, [locale]);

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={{ locale, changeLocale }}>
        <Outlet />
      </LocaleContext.Provider>
    </I18nextProvider>
  );
}
