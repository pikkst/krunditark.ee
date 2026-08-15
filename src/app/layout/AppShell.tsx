import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../lib/i18n/LocaleProvider";
import { APP_LOCALES } from "../../lib/i18n/types";

export default function AppShell() {
  const { t } = useTranslation();
  const { locale, changeLocale } = useLocale();

  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>{t("header.brand")}</strong>
        <select
          value={locale}
          onChange={(e) => changeLocale(e.target.value as typeof locale)}
          aria-label={t("locale.switchLabel")}
        >
          {APP_LOCALES.map((l) => (
            <option key={l} value={l}>
              {t(`locale.${l}`)}
            </option>
          ))}
        </select>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
