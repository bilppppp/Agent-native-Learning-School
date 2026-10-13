import settings from "../../school.settings.json";
import catalog from "./ui-messages.json";

export function normalizeUILanguage(value: unknown): "zh" | "en" {
	return typeof value === "string" && /^(en(?:[-_]|$)|english|英文|英语)/i.test(value.trim()) ? "en" : "zh";
}

export const language = normalizeUILanguage((settings as { language?: string }).language);
export const locale = language === "en" ? "en-US" : "zh-CN";
export const messages: Record<string, string> = catalog[language];

export function t(key: string, values: Record<string, string | number> = {}): string {
	return (messages[key] ?? key).replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}
