import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import config from "../../../../school.config";
import {
	getProfile,
	type StudentProfile,
	updateProfile,
} from "../../../lib/progress";
import { isValidStudentId } from "../../../lib/student-id";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function notFound(message: string) {
	return new Response(JSON.stringify({ error: message }), {
		status: 404,
		headers: { "Content-Type": "application/json", ...corsHeaders },
	});
}

function badRequest(message: string) {
	return new Response(JSON.stringify({ error: message }), {
		status: 400,
		headers: { "Content-Type": "application/json", ...corsHeaders },
	});
}

export const OPTIONS: APIRoute = async () => {
	return new Response(null, { status: 204, headers: corsHeaders });
};

export const GET: APIRoute = async ({ params }) => {
	const { studentId } = params;
	if (!studentId || !isValidStudentId(studentId)) {
		return badRequest("Invalid student ID format");
	}

	const profile = await getProfile(env.PROGRESS, studentId);
	if (profile === null) {
		return notFound("Student not found");
	}

	return new Response(JSON.stringify({ profile }), {
		headers: { "Content-Type": "application/json", ...corsHeaders },
	});
};

function validateProfile(body: Record<string, unknown>): {
	profile: Partial<StudentProfile>;
	errors: string[];
} {
	const profile: Partial<StudentProfile> = {};
	const errors: string[] = [];

	for (const [key, value] of Object.entries(body)) {
		const field = config.profileFields[key];
		if (!field) {
			errors.push(`Unknown profile field: ${key}`);
			continue;
		}

		const validValues = field.options.map((o) => o.value);

		if (field.type === "multi") {
			if (!Array.isArray(value)) {
				errors.push(`${key}: expected an array for multi-select field`);
				continue;
			}
			const invalid = value.filter((v) => !validValues.includes(v as string));
			if (invalid.length > 0) {
				errors.push(
					`${key}: invalid values ${invalid.join(", ")}. Must be from: ${validValues.join(", ")}`,
				);
				continue;
			}
			profile[key] = value as string[];
		} else {
			if (!validValues.includes(value as string)) {
				errors.push(`Invalid ${key}: must be one of ${validValues.join(", ")}`);
				continue;
			}
			profile[key] = value as string;
		}
	}

	return { profile, errors };
}

export const PUT: APIRoute = async ({ params, request }) => {
	const { studentId } = params;
	if (!studentId || !isValidStudentId(studentId)) {
		return badRequest("Invalid student ID format");
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return badRequest("Invalid JSON body");
	}

	const { profile, errors } = validateProfile(body);
	if (errors.length > 0) {
		return badRequest(errors.join("; "));
	}
	if (Object.keys(profile).length === 0) {
		return badRequest("No valid profile fields provided");
	}

	const updated = await updateProfile(env.PROGRESS, studentId, profile);
	if (updated === null) {
		return notFound("Student not found");
	}

	return new Response(JSON.stringify({ profile: updated }), {
		headers: { "Content-Type": "application/json", ...corsHeaders },
	});
};
