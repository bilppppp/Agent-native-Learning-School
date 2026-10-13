import settings from "../../school.settings.json";

export const TEACHING_MODES = ["simple", "immersive"] as const;

export type TeachingMode = (typeof TEACHING_MODES)[number];

export const DEFAULT_TEACHING_MODE: TeachingMode =
  settings.teachingMode === "immersive" ? "immersive" : "simple";

export function normalizeTeachingMode(value: unknown): TeachingMode {
  if (value === "simple") return "simple";
  if (value === "immersive") return "immersive";
  return DEFAULT_TEACHING_MODE;
}

export function teachingGuidance(mode: TeachingMode): string {
  if (mode === "immersive") {
    return [
      "Use a patient, exploratory pace.",
      "Ask one small question at a time and invite predictions, observations, calculations, or short experiments.",
      "Follow useful follow-up questions, connect the current idea to the lesson goal, and add mechanism-level detail when it helps.",
      "Give explanations when requested, then check the learner's understanding with a fresh example or transfer question.",
      "Treat any depth preference as explanation-detail guidance only; it does not override this mode's pace or the course scope.",
    ].join(" ");
  }

  return [
    "Use a clear, focused pace.",
    "Ask one small question at a time, keep explanations concise, and prioritize the lesson's core idea.",
    "Use one useful example or observation before adding optional detail.",
    "Follow natural questions without turning the lesson into a long quiz or a rigid script.",
    "Treat any depth preference as explanation-detail guidance only; it does not override this mode's pace or the course scope.",
  ].join(" ");
}

export function modeFromProfile(profile: Record<string, unknown> | null | undefined): TeachingMode {
  return normalizeTeachingMode(profile?.teachingMode);
}
