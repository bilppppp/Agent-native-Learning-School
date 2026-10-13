// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import type { APIRoute } from "astro";
import { createStudent } from "../../lib/progress";
import { getProgressStore, runWithProgressStore } from "../../lib/store";
import { generateStudentId } from "../../lib/student-id";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS: APIRoute = async () => {
	return new Response(null, { status: 204, headers: corsHeaders });
};

export const POST: APIRoute = async ({ request }) =>
	runWithProgressStore(corsHeaders, async () => {
		const store = await getProgressStore();

		let deviceId: string | undefined;
		try {
			const body = await request.json();
			if (typeof body?.deviceId === "string") deviceId = body.deviceId;
		} catch {
			// Body is optional; ignore parse errors
		}

		const maxRetries = 10;
		for (let i = 0; i < maxRetries; i++) {
			const studentId = await generateStudentId(store);
			const progress = await createStudent(studentId, deviceId);
			if (progress) {
				return new Response(JSON.stringify({ studentId, progress }), {
					status: 201,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders,
					},
				});
			}
		}

		throw new Error("Failed to generate a unique student ID after retries");
	});
