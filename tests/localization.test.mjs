import test from "node:test";
import assert from "node:assert/strict";
import {
  SABILY_LOCALES,
  normalizeLocale,
  getLocaleDirection,
  getLocaleLabel,
  formatLocaleNumber,
} from "../src/localization.ts";

test("registers the 13 approved Sabily locales", () => {
  assert.deepEqual(SABILY_LOCALES.map((item) => item.code), [
    "en", "ar", "fr", "es-ES", "it", "de", "ru",
    "zh-CN", "zh-TW", "ja", "ko", "ur", "sw",
  ]);
});

test("normalizes regional locale preferences safely", () => {
  assert.equal(normalizeLocale("es-MX"), "es-ES");
  assert.equal(normalizeLocale("zh-Hant"), "zh-TW");
  assert.equal(normalizeLocale("zh-Hans"), "zh-CN");
  assert.equal(normalizeLocale("unknown-locale"), "en");
  assert.equal(normalizeLocale(null), "en");
});

test("sets RTL only for Arabic and Urdu", () => {
  assert.equal(getLocaleDirection("ar"), "rtl");
  assert.equal(getLocaleDirection("ur-PK"), "rtl");
  assert.equal(getLocaleDirection("en"), "ltr");
  assert.equal(getLocaleDirection("zh-TW"), "ltr");
});

test("exposes native locale labels and Intl number formatting", () => {
  assert.equal(getLocaleLabel("ar"), "العربية");
  assert.equal(typeof formatLocaleNumber(12345.6, "de"), "string");
  assert.notEqual(formatLocaleNumber(12345.6, "de"), formatLocaleNumber(12345.6, "en"));
});
