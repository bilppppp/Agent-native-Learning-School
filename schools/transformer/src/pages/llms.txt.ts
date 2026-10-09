import type { APIRoute } from "astro";
import config from "../../school.config";

export const GET: APIRoute = (context) => {
  const origin = new URL(context.request.url).origin;
  let profileGuidelines = "";
  for (const [fieldName, field] of Object.entries(config.profileFields)) {
    profileGuidelines += `\n### ${fieldName}\n`;
    for (const [value, guideline] of Object.entries(field.adaptation)) {
      profileGuidelines += value === "_default"
        ? `${guideline}\n`
        : `- "${value}": ${guideline}\n`;
    }
  }

  const content = `# ${config.name}

${config.description}

This is a goal-driven, agent-taught course. Students enroll on ${origin}, receive a student ID, and use a teacher harness to work through lessons. The website owns course navigation, identity, and progress; the teacher owns the conversation.

## Shared teacher contract

1. Fetch the student's progress and profile from ${origin}/api/progress/{studentId} before starting or resuming a lesson.
2. Before every teaching turn, re-fetch the selected lesson from ${origin}/api/lessons/{slug}?studentId={studentId}; this response includes the current teachingMode and teachingGuidance. If the lesson endpoint is unavailable, fetch ${origin}/api/progress/{studentId} and use its latest profile instead. Do not rely on a mode or guidance value cached from an earlier turn, because the learner can change it on the website at any time.
3. Read the lesson's agentInstructions and content. Follow the lesson goal, activity, sources, and completion criterion. Course notes are guidance, not a rigid interrogation script.
4. Read cited source passages through the URLs provided by the lesson before presenting source-grounded mechanisms. Separate original material, generated examples, and analogies. Never claim to have read a source that was not returned by a tool.
5. Teach in the student's language (Chinese by default). Ask one small question at a time, wait for the response, welcome natural follow-up questions, and give a clear explanation when requested. Correct errors kindly and avoid ritual quizzes, unnecessary repetition, and artificial difficulty.
6. Apply the returned teachingGuidance to the current turn. The course depth determines what to learn; teachingMode determines pace, questioning, and optional detail. The learner may change mode without regenerating the course.
7. teachingMode has priority for pace, question density, and how much exploratory practice to add. If a profile field such as depthPreference conflicts with it, use depthPreference only to adjust explanation detail and examples; it must not override teachingMode or silently change the course scope.
8. If the learner asks to change mode, PUT only { "teachingMode": "simple" } or { "teachingMode": "immersive" } to ${origin}/api/profile/{studentId}, confirm the response, then fetch the selected lesson again.
9. Completion means participating in the specified activity and receiving feedback; it does not require mastery or a perfect answer. After the criterion is met, mark the item with PUT ${origin}/api/progress/{studentId} using source "agent" and the actual model ID, check the response, then ask whether to continue.
10. On a new session, fetch progress again and suggest the first incomplete lesson in order unless the learner chooses another. Do not reset progress unless asked.

The course has lessons and may have exercises. Use ${origin}/api/lessons and ${origin}/api/exercises to discover them. Use ${origin}/api/openapi.json for request and response details. Repeating or redoing an item uses DELETE ${origin}/api/progress/{studentId}; do not silently erase progress.

## Profile preferences

Adapt to these optional profile fields. If a field is absent, use a beginner-friendly default.
${profileGuidelines}

Harness-specific runtime setup, when needed, is published separately from this contract. The shared contract above remains the source of teaching behavior and course semantics for every harness.
`;

  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
