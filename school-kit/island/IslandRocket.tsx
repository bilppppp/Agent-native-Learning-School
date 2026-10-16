import { useEffect, useRef } from "react";
import { RocketIcon } from "naive-icons";

const THRESHOLD = 80;
const VISIBILITY_HEIGHT = 480;

type ParticleKind = "smoke" | "fire";
type FlightType = "wander" | "loops" | "spiral" | "fall" | "zigzag";

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
	growth: number;
	life: number;
	full: number;
	kind: ParticleKind;
	tone: number;
}

interface Point {
	x: number;
	y: number;
}

interface Flight {
	type: FlightType;
	dir: number;
	radius: number;
	cx: number;
	cy: number;
	loopStart: Point;
	loops: number;
	amp: number;
	points: Point[];
	anchor: Point;
	origin: Point;
	started: number;
	ignition: number;
	flightDuration: number;
	lastAngle: number;
	landingStartAngle: number | null;
	landingTarget: number | null;
	landPuff: boolean;
}

export default function IslandRocket() {
	const rocketRef = useRef<HTMLButtonElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const guideRef = useRef<HTMLDivElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const rocket = rocketRef.current;
		const canvas = canvasRef.current;
		const guide = guideRef.current;
		const status = statusRef.current;
		const context = canvas?.getContext("2d");
		if (!rocket || !canvas || !guide || !status || !context) return;
		const ctx = context;

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const state = {
			mode: "idle" as "idle" | "dragging" | "launching",
			pointerId: null as number | null,
			start: null as { pointerX: number; pointerY: number; x: number; y: number } | null,
			anchor: null as Point | null,
			x: 0,
			y: 0,
			pull: 0,
			moved: false,
			suppressClick: false,
			armed: false,
			flight: null as Flight | null,
			lastType: null as FlightType | null,
		};
		const particles: Particle[] = [];
		let previousTime = 0;
		let raf = 0;
		let hintTimeout = 0;
		let disposed = false;

		const rand = (a: number, b: number) => a + Math.random() * (b - a);
		const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);
		const parked = (x: number, y: number) => ({
			x: clamp(x, 40, window.innerWidth - 40),
			y: clamp(y, 48, window.innerHeight - 48),
		});

		function setRocket(x: number, y: number, angle = 0) {
			state.x = x;
			state.y = y;
			rocket.style.left = `${x}px`;
			rocket.style.top = `${y}px`;
			rocket.style.setProperty("--lean", `${angle}deg`);
		}

		function syncVisible() {
			const show = window.scrollY > VISIBILITY_HEIGHT || state.mode !== "idle";
			rocket.classList.toggle("is-visible", show);
		}

		function resize() {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(window.innerWidth * dpr);
			canvas.height = Math.round(window.innerHeight * dpr);
			canvas.style.width = `${window.innerWidth}px`;
			canvas.style.height = `${window.innerHeight}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			if (state.mode === "idle") {
				const next = parked(state.x || window.innerWidth - 56, state.y || window.innerHeight - 64);
				setRocket(next.x, next.y);
			}
		}

		function message(text: string, tone = "", autoHide = false) {
			window.clearTimeout(hintTimeout);
			hintTimeout = 0;
			status.textContent = text;
			status.className = `island-rocket-status show ${tone}`.trim();
			if (autoHide) hintTimeout = window.setTimeout(() => hideMessage(), 1800);
		}

		function hideMessage() {
			window.clearTimeout(hintTimeout);
			hintTimeout = 0;
			status.textContent = "";
			status.className = "island-rocket-status";
		}

		function toggleGuide(start: Point, pull: number) {
			guide.style.display = pull > 3 ? "block" : "none";
			guide.style.left = `${start.x}px`;
			guide.style.top = `${start.y + 22}px`;
			guide.style.height = `${Math.max(2, pull - 14)}px`;
		}

		function emit(x: number, y: number, kind: ParticleKind = "smoke", count = 1, angle = 0) {
			const radians = (angle * Math.PI) / 180;
			const tailX = -Math.sin(radians);
			const tailY = Math.cos(radians);
			for (let index = 0; index < count; index += 1) {
				const fire = kind === "fire";
				const life = fire ? rand(140, 290) : rand(400, 870);
				particles.push({
					x: x + rand(-5, 5),
					y: y + rand(-4, 4),
					vx: tailX * rand(0.45, fire ? 3.3 : 1.55) + rand(-0.85, 0.85),
					vy: tailY * rand(0.45, fire ? 3.3 : 1.55) + rand(-0.85, 0.85),
					r: fire ? rand(2, 5) : rand(3, 9),
					growth: fire ? -0.012 : rand(0.02, 0.046),
					life,
					full: life,
					kind,
					tone: Math.floor(rand(0, 3)),
				});
			}
		}

		function particleTick(dt: number) {
			const step = Math.min(dt / 16.667, 2);
			for (let index = particles.length - 1; index >= 0; index -= 1) {
				const particle = particles[index];
				particle.life -= dt;
				if (particle.life <= 0) {
					particles.splice(index, 1);
					continue;
				}
				particle.x += particle.vx * step;
				particle.y += particle.vy * step;
				particle.r = Math.max(0.1, particle.r + particle.growth * step);
				const alpha = clamp(particle.life / particle.full, 0, 1);
				ctx.beginPath();
				ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
				if (particle.kind === "fire") {
					ctx.fillStyle =
						particle.tone === 0
							? `rgba(255,207,88,${alpha * 0.8})`
							: `rgba(235,124,61,${alpha * 0.7})`;
				} else if (particle.tone === 0) {
					ctx.fillStyle = `rgba(255,254,239,${alpha * 0.75})`;
				} else if (particle.tone === 1) {
					ctx.fillStyle = `rgba(193,181,162,${alpha * 0.55})`;
				} else {
					ctx.fillStyle = `rgba(229,219,205,${alpha * 0.72})`;
				}
				ctx.fill();
			}
		}

		function finishFlight() {
			state.flight = null;
			state.mode = "idle";
			rocket.classList.remove("launching", "armed");
			rocket.style.opacity = "";
			const next = parked(state.anchor?.x ?? state.x, state.anchor?.y ?? state.y);
			setRocket(next.x, next.y, 0);
			if (!hintTimeout) hideMessage();
			syncVisible();
		}

		const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
		const smooth = (value: number) => {
			const t = clamp(value, 0, 1);
			return t * t * (3 - 2 * t);
		};
		function cubic(t: number, p0: number, p1: number, p2: number, p3: number) {
			const a = 1 - t;
			return a * a * a * p0 + 3 * a * a * t * p1 + 3 * a * t * t * p2 + t * t * t * p3;
		}
		function curve(a: Point, b: Point, c: Point, d: Point, t: number) {
			return { x: cubic(t, a.x, b.x, c.x, d.x), y: cubic(t, a.y, b.y, c.y, d.y) };
		}
		function catmull(a: number, b: number, c: number, d: number, t: number) {
			const t2 = t * t;
			const t3 = t2 * t;
			return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
		}

		function chooseType() {
			const types: FlightType[] = ["wander", "loops", "spiral", "fall", "zigzag"].filter(
				(type) => type !== state.lastType,
			);
			const type = types[Math.floor(Math.random() * types.length)];
			state.lastType = type;
			return type;
		}

		function buildFlight(origin: Point): Flight {
			const type = chooseType();
			const width = window.innerWidth;
			const height = window.innerHeight;
			const anchor = parked(state.anchor?.x ?? origin.x, state.anchor?.y ?? origin.y);
			const dir = origin.x > width * 0.72 ? -1 : origin.x < width * 0.28 ? 1 : Math.random() < 0.5 ? -1 : 1;
			const radius = Math.min(rand(38, 76), width * 0.14, height * 0.145);
			const cx = clamp(origin.x + dir * rand(26, 105), radius + 29, width - radius - 29);
			const cy = Math.max(radius + 37, Math.min(origin.y - radius - 75, height * 0.42));
			const loopStart = { x: cx, y: cy + radius };
			const loops = Math.floor(rand(1, 4));
			const amp = Math.min(rand(60, 160), width * 0.3);
			const points = [origin];
			for (let index = 1; index <= 5; index += 1) {
				const u = index / 5;
				points.push({
					x: clamp(
						origin.x + (index % 2 ? dir : -dir) * amp * rand(0.48, 1) + dir * amp * 0.2 * u,
						22,
						width - 22,
					),
					y: lerp(origin.y, -170, u),
				});
			}
			return {
				type,
				dir,
				radius,
				cx,
				cy,
				loopStart,
				loops,
				amp,
				points,
				anchor,
				origin,
				started: performance.now(),
				ignition: rand(280, 400),
				flightDuration:
					type === "fall"
						? rand(2750, 3450)
						: type === "loops"
							? rand(2600, 3300)
							: type === "spiral"
								? rand(2500, 3200)
								: rand(1850, 2700),
				lastAngle: 0,
				landingStartAngle: null,
				landingTarget: null,
				landPuff: false,
			};
		}

		function flightPoint(flight: Flight, amount: number) {
			const u = clamp(amount, 0, 1);
			const origin = flight.origin;
			const radius = flight.radius;
			const dir = flight.dir;
			const theta = Math.PI * 2 * flight.loops;
			if (flight.type === "wander") {
				const rise = origin.y + 175;
				return {
					x: clamp(
						origin.x +
							dir * flight.amp * 0.48 * (Math.sin(u * Math.PI * 3.7) + 0.6 * Math.sin(u * Math.PI * 7.2)) +
							dir * flight.amp * 0.18 * u,
						22,
						window.innerWidth - 22,
					),
					y: origin.y - rise * u + 22 * Math.sin(u * Math.PI * 5) * Math.sin(Math.PI * u),
				};
			}
			if (flight.type === "zigzag") {
				const segment = Math.min(4, Math.floor(u * 5));
				const t = clamp(u * 5 - segment, 0, 1);
				const points = flight.points;
				return {
					x: clamp(
						catmull(
							points[Math.max(0, segment - 1)].x,
							points[segment].x,
							points[segment + 1].x,
							points[Math.min(5, segment + 2)].x,
							t,
						),
						22,
						window.innerWidth - 22,
					),
					y: catmull(
						points[Math.max(0, segment - 1)].y,
						points[segment].y,
						points[segment + 1].y,
						points[Math.min(5, segment + 2)].y,
						t,
					),
				};
			}
			if (flight.type === "spiral") {
				const phase = theta * u;
				const ring = Math.sin(Math.PI * u);
				return {
					x: clamp(
						origin.x + flight.dir * flight.amp * 0.47 * u + radius * (Math.cos(phase) - 1) * ring,
						22,
						window.innerWidth - 22,
					),
					y: origin.y - (origin.y + 180) * u + radius * Math.sin(phase) * ring,
				};
			}
			const introEnd = flight.type === "fall" ? 0.25 : 0.29;
			const loopEnd = flight.type === "fall" ? 0.64 : 0.75;
			const start = flight.loopStart;
			if (u < introEnd) {
				return curve(
					origin,
					{ x: origin.x + dir * radius * 0.65, y: origin.y - 115 },
					{ x: start.x - dir * radius * 0.68, y: start.y + 26 },
					start,
					u / introEnd,
				);
			}
			if (u < loopEnd) {
				const phase = (theta * (u - introEnd)) / (loopEnd - introEnd);
				return { x: flight.cx + dir * radius * Math.sin(phase), y: flight.cy + radius * Math.cos(phase) };
			}
			if (flight.type === "loops") {
				const t = (u - loopEnd) / (1 - loopEnd);
				return curve(
					start,
					{ x: start.x + dir * radius * 1.15, y: start.y - 20 },
					{ x: clamp(flight.cx + dir * flight.amp, 22, window.innerWidth - 22), y: -90 },
					{ x: clamp(flight.cx + dir * flight.amp * 0.37, 22, window.innerWidth - 22), y: -170 },
					t,
				);
			}
			const t = (u - loopEnd) / (1 - loopEnd);
			const anchor = flight.anchor;
			return curve(
				start,
				{ x: clamp(start.x + dir * radius * 1.65, 22, window.innerWidth - 22), y: start.y - 55 },
				{
					x: clamp(anchor.x - dir * radius * 0.95, 22, window.innerWidth - 22),
					y: Math.max(start.y + 110, anchor.y - 145),
				},
				anchor,
				smooth(t),
			);
		}

		function flightTick(now: number) {
			const flight = state.flight;
			if (!flight) return;
			const elapsed = now - flight.started;
			if (elapsed < flight.ignition) {
				const shake = (Math.random() - 0.5) * 2.5;
				setRocket(flight.origin.x + shake, flight.origin.y - Math.min(4, elapsed / 50), shake * 2);
				if (Math.random() < 0.74) emit(flight.origin.x, flight.origin.y + 27, "smoke", 3);
				if (Math.random() < 0.7) emit(flight.origin.x, flight.origin.y + 27, "fire", 2);
			} else {
				const u = clamp((elapsed - flight.ignition) / flight.flightDuration, 0, 1);
				const point = flightPoint(flight, u);
				const before = flightPoint(flight, Math.max(0, u - 0.002));
				const after = flightPoint(flight, Math.min(1, u + 0.002));
				let angle = (Math.atan2(after.x - before.x, -(after.y - before.y)) * 180) / Math.PI;
				while (angle - flight.lastAngle > 180) angle -= 360;
				while (angle - flight.lastAngle < -180) angle += 360;
				if (flight.type === "fall" && u > 0.88) {
					if (flight.landingStartAngle === null) {
						flight.landingStartAngle = angle;
						flight.landingTarget = Math.round(angle / 360) * 360;
					}
					angle = lerp(
						flight.landingStartAngle,
						flight.landingTarget ?? 0,
						smooth((u - 0.88) / 0.12),
					);
				}
				flight.lastAngle = angle;
				setRocket(point.x, point.y, angle);
				rocket.style.opacity = flight.type !== "fall" && u > 0.94 ? String(clamp((1 - u) / 0.06, 0, 1)) : "1";
				const radians = (angle * Math.PI) / 180;
				const exhaustX = point.x - Math.sin(radians) * 27;
				const exhaustY = point.y + Math.cos(radians) * 27;
				if (u < 0.97) {
					emit(exhaustX, exhaustY, "smoke", u < 0.78 ? 3 : 2, angle);
					if (flight.type !== "fall" || u < 0.67 || u > 0.84) emit(exhaustX, exhaustY, "fire", 1, angle);
				}
				if (flight.type === "fall" && u > 0.95 && !flight.landPuff) {
					flight.landPuff = true;
					emit(flight.anchor.x, flight.anchor.y + 30, "smoke", 24, 0);
				}
			}
			if (elapsed > flight.ignition + flight.flightDuration + 80) finishFlight();
		}

		function tick(now: number) {
			if (disposed) return;
			const dt = Math.min(now - previousTime || 16, 50);
			previousTime = now;
			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
			if (state.flight) flightTick(now);
			particleTick(dt);
			if (state.flight || particles.length) raf = requestAnimationFrame(tick);
			else raf = 0;
		}

		function startTicker() {
			if (!raf) {
				previousTime = performance.now();
				raf = requestAnimationFrame(tick);
			}
		}

		function scrollTop() {
			window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
		}

		function launch() {
			if (state.mode === "launching") return;
			state.mode = "launching";
			state.armed = false;
			guide.style.display = "none";
			rocket.classList.remove("dragging");
			rocket.classList.add("launching", "armed");
			syncVisible();
			state.flight = buildFlight({ x: state.x, y: state.y });
			message("点火成功！不知道会飞到哪里…", "good", true);
			if (reducedMotion.matches) {
				finishFlight();
				return;
			}
			emit(state.x, state.y + 26, "smoke", 18);
			startTicker();
		}

		function onPointerDown(event: PointerEvent) {
			if (state.mode === "launching" || (event.pointerType === "mouse" && event.button !== 0)) return;
			if (state.mode === "dragging") return;
			state.suppressClick = false;
			try {
				rocket.setPointerCapture(event.pointerId);
			} catch {
				/* 没有真实指针时仍继续跟踪这次拖动 */
			}
			state.pointerId = event.pointerId;
			state.start = { pointerX: event.clientX, pointerY: event.clientY, x: state.x, y: state.y };
			state.anchor = { x: state.x, y: state.y };
			state.mode = "dragging";
			state.pull = 0;
			state.armed = false;
			state.moved = false;
			rocket.classList.add("dragging");
			event.preventDefault();
		}

		function onPointerMove(event: PointerEvent) {
			if (state.mode !== "dragging" || event.pointerId !== state.pointerId || !state.start) return;
			const dx = event.clientX - state.start.pointerX;
			const dy = event.clientY - state.start.pointerY;
			if (Math.hypot(dx, dy) > 6) state.moved = true;
			if (!state.moved) return;
			const nearVertical = dy > 5 && Math.abs(dx) <= Math.min(36, Math.max(16, dy * 0.37));
			if (nearVertical) {
				state.pull = clamp(dy, 0, 118);
				state.armed = dy >= THRESHOLD;
				setRocket(state.start.x, state.start.y + state.pull);
				toggleGuide(state.start, state.pull);
				rocket.classList.toggle("armed", state.armed);
				if (state.armed) message("松开！准备发射", "ready");
				else hideMessage();
				if (state.armed && !reducedMotion.matches) {
					emit(state.x, state.y + 30, "smoke", 2);
					startTicker();
				}
			} else {
				state.pull = 0;
				state.armed = false;
				rocket.classList.remove("armed");
				guide.style.display = "none";
				const next = parked(state.start.x + dx, state.start.y + dy);
				setRocket(next.x, next.y, clamp(dx * 0.08, -8, 8));
				message("拖到喜欢的位置，松手停靠");
			}
		}

		function pointerFinish(event: PointerEvent, cancel = false) {
			if (state.mode !== "dragging" || event.pointerId !== state.pointerId || !state.start) return;
			const wasMoved = state.moved;
			const isLaunch = state.armed && !cancel;
			state.pointerId = null;
			state.mode = "idle";
			state.armed = false;
			rocket.classList.remove("dragging", "armed");
			guide.style.display = "none";
			if (wasMoved) {
				state.suppressClick = true;
				if (isLaunch) {
					launch();
					return;
				}
				if (state.pull > 0 || cancel) {
					const next = parked(state.start.x, state.start.y);
					const fromX = state.x;
					const fromY = state.y;
					const startTime = performance.now();
					const spring = (now: number) => {
						if (disposed || state.mode !== "idle") return;
						const t = clamp((now - startTime) / 260, 0, 1);
						const ease = 1 - (1 - t) ** 3;
						setRocket(fromX + (next.x - fromX) * ease, fromY + (next.y - fromY) * ease);
						if (t < 1) requestAnimationFrame(spring);
					};
					requestAnimationFrame(spring);
				} else {
					state.anchor = { x: state.x, y: state.y };
				}
			}
			hideMessage();
			syncVisible();
		}

		function onPointerUp(event: PointerEvent) {
			pointerFinish(event);
		}

		function onPointerCancel(event: PointerEvent) {
			pointerFinish(event, true);
		}

		function onLostCapture(event: PointerEvent) {
			if (state.mode === "dragging") pointerFinish(event, true);
		}

		function onClick(event: MouseEvent) {
			if (state.suppressClick) {
				state.suppressClick = false;
				event.preventDefault();
				return;
			}
			if (state.mode === "launching") return;
			scrollTop();
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			if (state.mode === "launching") return;
			scrollTop();
		}

		rocket.addEventListener("pointerdown", onPointerDown);
		rocket.addEventListener("pointermove", onPointerMove);
		rocket.addEventListener("pointerup", onPointerUp);
		rocket.addEventListener("pointercancel", onPointerCancel);
		rocket.addEventListener("lostpointercapture", onLostCapture);
		rocket.addEventListener("click", onClick);
		rocket.addEventListener("keydown", onKeyDown);
		window.addEventListener("resize", resize);
		window.addEventListener("scroll", syncVisible, { passive: true });
		resize();
		const home = parked(window.innerWidth - 56, window.innerHeight - 64);
		setRocket(home.x, home.y);
		state.anchor = { ...home };
		syncVisible();

		return () => {
			disposed = true;
			window.clearTimeout(hintTimeout);
			if (raf) cancelAnimationFrame(raf);
			rocket.removeEventListener("pointerdown", onPointerDown);
			rocket.removeEventListener("pointermove", onPointerMove);
			rocket.removeEventListener("pointerup", onPointerUp);
			rocket.removeEventListener("pointercancel", onPointerCancel);
			rocket.removeEventListener("lostpointercapture", onLostCapture);
			rocket.removeEventListener("click", onClick);
			rocket.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("resize", resize);
			window.removeEventListener("scroll", syncVisible);
		};
	}, []);

	return (
		<>
			<canvas ref={canvasRef} className="island-rocket-fx" aria-hidden="true" />
			<div ref={guideRef} className="island-rocket-guide" aria-hidden="true" />
			<div ref={statusRef} className="island-rocket-status" role="status" aria-live="polite" />
			<button
				ref={rocketRef}
				type="button"
				className="island-rocket"
				aria-label="返回顶部；向下拉动可发射火箭"
			>
				<span className="island-rocket-craft">
					<RocketIcon size={64} />
					<svg className="island-rocket-flame" viewBox="0 0 48 28" aria-hidden="true">
						<path d="M24 2 C16 12 21 20 24 26 C27 20 32 12 24 2Z" fill="#ff9c30" />
						<path d="M24 10 C20 16 22 21 24 24 C28 18 27 14 24 10Z" fill="#ffe17c" />
					</svg>
				</span>
			</button>
		</>
	);
}
