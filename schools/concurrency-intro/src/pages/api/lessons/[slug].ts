import { env } from "cloudflare:workers";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import config from "../../../../school.config";
import { getProgress } from "../../../lib/progress";
import { mdxToProse } from "../../../lib/mdx-to-prose";
import { QUIZ_INSTRUCTIONS } from "../../../lib/quiz-instructions";
import {
  DEFAULT_TEACHING_MODE,
  modeFromProfile,
  teachingGuidance,
} from "../../../lib/teaching";

function buildInterviewQuestions(): string {
  const entries = Object.entries(config.profileFields);
  if (entries.length === 0) return "";

  return entries
    .map(([fieldName, field], i) => {
      const num = i + 1;
      const selectType = field.type === "multi" ? "Multi select" : "Single select";
      const optionLabels = field.options
        .map((o) => (o.description ? `${o.label} (${o.description})` : o.label))
        .join(", ");
      const apiValues = field.options.map((o) => `"${o.value}"`).join(", ");
      return `Question ${num} — ${field.question}\n  ${selectType}. Options: ${optionLabels}.\n  API value for ${fieldName}: ${apiValues}.`;
    })
    .join("\n\n  ");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS: APIRoute = async () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const GET: APIRoute = async ({ params, request }) => {
  const origin = new URL(request.url).origin;
  const lessons = await getCollection("lessons");
  const lesson = lessons.find((l) => l.data.slug === params.slug);

  if (!lesson) {
    return new Response(JSON.stringify({ error: "Lesson not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let rawInstructions = lesson.data.agentInstructions;
  if (lesson.data.quiz) rawInstructions += `\n\n${QUIZ_INSTRUCTIONS}`;
  const interviewQuestions = buildInterviewQuestions();
  const agentInstructions = rawInstructions
    .replaceAll("${origin}", origin)
    .replaceAll("{origin}", origin)
    .replaceAll("${interviewQuestions}", interviewQuestions)
    .replaceAll("{interviewQuestions}", interviewQuestions);

  const studentId = new URL(request.url).searchParams.get("studentId");
  let mode: "simple" | "immersive" = DEFAULT_TEACHING_MODE;
  if (studentId) {
    const progress = await getProgress(env.PROGRESS, studentId);
    mode = modeFromProfile(progress?.profile);
  }

  const result = {
    order: lesson.data.order,
    slug: lesson.data.slug,
    title: lesson.data.title,
    description: lesson.data.description,
    agentOnly: lesson.data.agentOnly,
    agentInstructions,
    content: mdxToProse(lesson.body),
    teachingMode: mode,
    teachingGuidance: teachingGuidance(mode),
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
};
