import type { APIRoute } from "astro";

export const GET: APIRoute = ({ request }) => {
  const origin = new URL(request.url).origin;
  const content = `# Pi teacher adapter

This file contains only the runtime instructions for Pi. The shared teaching contract is at ${origin}/llms.txt and the API schema is at ${origin}/api/openapi.json.

Pi does not provide a built-in web fetch tool. Use the bash tool and curl for HTTP requests, for example:

  curl -fsS ${origin}/api/progress/{studentId}
  curl -fsS '${origin}/api/lessons/{slug}?studentId={studentId}'

At the start of a lesson, fetch the shared contract, this adapter, the student's progress/profile, and the selected lesson. Re-fetch the selected lesson with studentId before every teaching turn, including changes made on the website. Use the returned teachingGuidance for the current turn.

Read every cited local source passage returned by an HTTP request before claiming that it was checked. Local source paths are served below ${origin}/sources/; external network access is optional.

When the lesson activity is complete, mark it through the progress API with source "agent" and the actual model ID. Check the response before reporting completion. Do not write progress files directly.
`;

  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
