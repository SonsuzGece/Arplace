"use strict";
import { DEFAULT_BOARD, DEFAULT_BOARD_FALLBACK, DEFAULT_COOLDOWN, DEFAULT_HEIGHT, DEFAULT_PALETTE, DEFAULT_PALETTE_USABLE_REGION, DEFAULT_SERVER, DEFAULT_WIDTH, PLACEMENT_MODE, RENDERER_TYPE, supabase } from "../../defaults.js";
import { addIpcMessageHandler, handleIpcMessage, makeIpcRequest, sendIpcMessage } from "shared-ipc";

// Types
/** @typedef {Object} LiveChatMessage ... vb orijinal yorumlar */

export let BOARD = null;
export let CHANGES = null;
export let RAW_BOARD = null;
export let SOCKET_PIXELS = null;
export let PALETTE_USABLE_REGION = DEFAULT_PALETTE_USABLE_REGION;
export let PALETTE = DEFAULT_PALETTE;
export let WIDTH = DEFAULT_WIDTH;
export let HEIGHT = DEFAULT_HEIGHT;
export let COOLDOWN = DEFAULT_COOLDOWN;

export const intIdNames = new Map();
export let intIdPositions = new Map();
export let account = null;
export let intId = null;
export let chatName = null;
export let connectStatus = "initial";
export let canvasLocked = false;
export let placementMode = PLACEMENT_MODE.selectPixel;
export const spectators = new Set();
export let spectatingIntId = null;
export let cooldownEndDate = null;
export let onCooldown = false;

// YÜKLEME EKRANI BEKLEME SORUNU ÇÖZÜMÜ 1: Ölü sunucuyu beklemeden anında boş tuval ver
export let preloadedBoard = Promise.resolve(new ArrayBuffer(WIDTH * HEIGHT));
export async function fetchBoard() {
	return new ArrayBuffer(WIDTH * HEIGHT); 
}

let fetchCooldown = 50;
let fetchFailTimeout = null;

const httpServerUrl = (localStorage.server || DEFAULT_SERVER).replace("wss://", "https://").replace("ws://", "http://");
const res = await fetch(`${httpServerUrl}/public/game-worker.js?v=${Date.now()}`);
const code = await res.text();
const blob = new Blob([code], { type: "application/javascript" });
const url = URL.createObjectURL(blob);
const wsCapsule = new Worker(url, { type: "module" });
wsCapsule.addEventListener("message", handleIpcMessage);
window.addEventListener("beforeunload", (e) => { sendIpcMessage(wsCapsule, "stop"); });
const undefineGlobals = new CustomEvent("undefineglobals");
window.dispatchEvent(undefineGlobals);
const automated = !!(window.navigator.webdriver || window.outerHeight === 0 || navigator?.plugins?.length === 0 || /HeadlessChrome/.test(navigator.userAgent));

addIpcMessageHandler("handleConnect", () => { connectStatus = "connected"; });
addIpcMessageHandler("handlePalette", (/**@type {[number[],number,number]}*/[palette, start, end]) => {
	PALETTE = palette; PALETTE_USABLE_REGION.start = start; PALETTE_USABLE_REGION.end = end;
	window.dispatchEvent(new CustomEvent("palette", { detail: { palette, start, end }, bubbles: true, composed: true }));
});
addIpcMessageHandler("handleCooldownInfo", /**@type {[Date, number]}*/([endDate, cooldown]) => {
	setCooldown(endDate.getTime()); COOLDOWN = cooldown;
	window.dispatchEvent(new CustomEvent("cooldown", { detail: { endDate, cooldown }, bubbles: true, composed: true }));
});
addIpcMessageHandler("handleCanvasInfo", async (/**@type {[number,number]}*/[width, height]) => { setSize(width, height); window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true })); });
addIpcMessageHandler("handleChanges", async (/**@type {[number,number,ArrayBuffer]}*/[width, height, changes]) => { setSize(width, height); window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true })); });
addIpcMessageHandler("setOnline", (/**@type {number}*/count) => { window.dispatchEvent(new CustomEvent("online", { detail: { count }, bubbles: true, composed: true })); });
addIpcMessageHandler("handlePlacerInfoRegion", () => {});
addIpcMessageHandler("handleSetIntId", (/**@type {number}*/userIntId) => { intId = userIntId; window.dispatchEvent(new CustomEvent("intid", { detail: { intId }, bubbles: true, composed: true })); });
addIpcMessageHandler("setCanvasLocked", (/**@type {[boolean, string|null]}*/[locked, reason]) => { canvasLocked = locked; window.dispatchEvent(new CustomEvent("canvaslocked", { detail: { locked, reason }, bubbles: true, composed: true })); });
addIpcMessageHandler("handlePixels", () => {});
addIpcMessageHandler("handleRejectedPixel", () => {});
addIpcMessageHandler("handleCooldown", (/**@type {Date}*/endDate) => { setCooldown(endDate.getTime()); });
addIpcMessageHandler("setChatName", (/**@type {string}*/name) => { chatName = name; window.dispatchEvent(new CustomEvent("chatname", { detail: { chatName }, bubbles: true, composed: true })); });
addIpcMessageHandler("handleNameInfo", () => {});
addIpcMessageHandler("addLiveChatMessage", () => {});
addIpcMessageHandler("addPlaceChatMessage", () => {});
addIpcMessageHandler("handleLiveChatDelete", () => {});
addIpcMessageHandler("handleLiveChatReaction", () => {});
addIpcMessageHandler("applyPunishment", () => {});
addIpcMessageHandler("handleChallenge", () => {});
addIpcMessageHandler("handleSpectating", () => {});
addIpcMessageHandler("handleUnspectating", () => {});
addIpcMessageHandler("handleSpectated", () => {});
addIpcMessageHandler("handleUnspectated", () => {});
addIpcMessageHandler("handleDisconnect", () => {});

export function connect(device, server = DEFAULT_SERVER, vip = undefined) {
	if (connectStatus !== "initial" && connectStatus !== "disconnected") return;
	connectStatus = "connected";

	setSize(WIDTH, HEIGHT);

	// YÜKLEME EKRANI BEKLEME SORUNU ÇÖZÜMÜ 2: Ölü sunucuyu bekleme, arayüze anında "hazırız" sinyali yolla
	setTimeout(() => {
		window.dispatchEvent(new CustomEvent("intid", { detail: { intId: 12345 }, bubbles: true, composed: true }));
		window.dispatchEvent(new CustomEvent("palette", { detail: { palette: PALETTE, start: PALETTE_USABLE_REGION.start, end: PALETTE_USABLE_REGION.end }, bubbles: true, composed: true }));
		window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true }));
		window.dispatchEvent(new CustomEvent("online", { detail: { count: 1 }, bubbles: true, composed: true }));
		setCooldown(Date.now()); 
	}, 500);

	// YAMA BURADA BAŞLIYOR: Supabase'den eski pikselleri çek
	try {
		supabase.from('pixels').select('*').then(({ data, error }) => {
			if (data && data.length > 0) {
				data.forEach(p => {
					const idx = p.x % WIDTH + (p.y % HEIGHT) * WIDTH;
					if(BOARD) BOARD[idx] = parseInt(p.color);
					if(SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
				});
				window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
			}
		});
		
		// Canlı Dinleme
		supabase.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'pixels' }, payload => {
			const p = payload.new;
			if (p) {
				const idx = p.x % WIDTH + (p.y % HEIGHT) * WIDTH;
				if(BOARD) BOARD[idx] = parseInt(p.color);
				if(SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
				window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
			}
		}).subscribe();
	} catch(err) {
		console.error("Supabase Yükleme Hatası:", err);
	}
}

export function sendServerMessage(name, args=undefined, event=undefined) {
	// YAMA BURADA BAŞLIYOR: Supabase'e kaydet
	if (name === "putPixel") {
		try {
			let pos, col;
			if (args && args.position !== undefined && args.colour !== undefined) {
				pos = args.position; col = args.colour;
			} else if (Array.isArray(args)) {
				pos = args[0]; col = args[1];
			}
			
			if (pos !== undefined && col !== undefined) {
				const x = pos % WIDTH;
				const y = Math.floor(pos / WIDTH);
				
				// Ekranda göster ve kaydet
				setPixelI(pos, col);
				window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
				supabase.from('pixels').upsert({ x: x, y: y, color: col.toString() }).then();
				
				setCooldown(Date.now());
			}
		} catch(err) {}
	}
}

export async function makeServerRequest(call, args=undefined) { return null; }
function dispatchFetchBoardFail(type) {}

export function setSize(width, height) {
	WIDTH = width; HEIGHT = height;
	BOARD = new Uint8Array(width * height).fill(255);
	SOCKET_PIXELS = new Uint8Array(width * height).fill(255);
	CHANGES = new Uint8Array(width * height).fill(255);
	RAW_BOARD = new Uint8Array(width * height).fill(255);
	window.dispatchEvent(new CustomEvent("size", { detail: { width, height }, bubbles: true, composed: true }));
}

let cooldownTimeout = null;
export function setCooldown(endDate) {
	if (cooldownTimeout !== null) { clearTimeout(cooldownTimeout); cooldownTimeout = null; }
	cooldownEndDate = endDate;
	const now = Date.now();
	if (endDate !== null) {
		if (endDate > now) {
			onCooldown = true;
			cooldownTimeout = setTimeout(() => {
				onCooldown = false;
				window.dispatchEvent(new CustomEvent("cooldownend", { detail: { endDate, onCooldown } }));
			}, endDate - now);
		} else { onCooldown = false; }
	} else { onCooldown = true; }
	window.dispatchEvent(new CustomEvent("cooldownstart", { detail: { endDate, onCooldown } }));
}

export function setPixel(x, y, colour) {
	const index = x % WIDTH + (y % HEIGHT) * WIDTH;
	setPixelI(index, colour);
}

export function setPixelI(index, colour) {
	if (!BOARD || !SOCKET_PIXELS) return;
	BOARD[index] = colour;
	SOCKET_PIXELS[index] = colour;
}
