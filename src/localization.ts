export type SabilyLocale =
  | "en" | "ar" | "fr" | "es-ES" | "it" | "de" | "ru"
  | "zh-CN" | "zh-TW" | "ja" | "ko" | "ur" | "sw";

export type LocaleDirection = "ltr" | "rtl";

export const SABILY_LOCALES: ReadonlyArray<{
  code: SabilyLocale;
  label: string;
  nativeLabel: string;
  direction: LocaleDirection;
}> = [
  { code: "en", label: "English", nativeLabel: "English", direction: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", direction: "rtl" },
  { code: "fr", label: "French", nativeLabel: "Français", direction: "ltr" },
  { code: "es-ES", label: "Spanish", nativeLabel: "Español", direction: "ltr" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", direction: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", direction: "ltr" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", direction: "ltr" },
  { code: "zh-CN", label: "Chinese (Simplified)", nativeLabel: "简体中文", direction: "ltr" },
  { code: "zh-TW", label: "Chinese (Traditional)", nativeLabel: "繁體中文", direction: "ltr" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", direction: "ltr" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", direction: "ltr" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", direction: "rtl" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili", direction: "ltr" },
] as const;

const supportedCodes = new Set<string>(SABILY_LOCALES.map((locale) => locale.code));

export function normalizeLocale(value: string | null | undefined): SabilyLocale {
  const candidate = (value || "en").trim().replace("_", "-");
  if (supportedCodes.has(candidate)) return candidate as SabilyLocale;

  const lower = candidate.toLowerCase();
  if (lower === "zh-hant" || lower === "zh-tw" || lower === "zh-hk" || lower === "zh-mo") return "zh-TW";
  if (lower === "zh" || lower === "zh-hans" || lower === "zh-cn" || lower === "zh-sg") return "zh-CN";
  if (lower.startsWith("es")) return "es-ES";

  const base = lower.split("-")[0];
  const match = SABILY_LOCALES.find((locale) => locale.code.toLowerCase() === base);
  return match?.code || "en";
}

export function getLocaleDirection(value: string | null | undefined): LocaleDirection {
  const locale = normalizeLocale(value);
  return locale === "ar" || locale === "ur" ? "rtl" : "ltr";
}

export function getLocaleLabel(value: string | null | undefined): string {
  const locale = normalizeLocale(value);
  return SABILY_LOCALES.find((item) => item.code === locale)?.nativeLabel || "English";
}

export function formatLocaleDate(
  value: Date | number | string,
  locale: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(normalizeLocale(locale), options).format(new Date(value));
}

export function formatLocaleNumber(
  value: number,
  locale: string | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(normalizeLocale(locale), options).format(value);
}
