"use strict";
import { DEFAULT_COOLDOWN, DEFAULT_HEIGHT, DEFAULT_PALETTE, DEFAULT_PALETTE_USABLE_REGION, DEFAULT_WIDTH, PLACEMENT_MODE, supabase } from "../../defaults.js";

export let BOARD = null;
export let CHANGES = null;
export let RAW_BOARD = null;
export let SOCKET_PIXELS = null;
export let PALETTE_USABLE_REGION = DEFAULT_PALETTE_USABLE_REGION;
export let PALETTE = DEFAULT_PALETTE;
export let WIDTH = DEFAULT_WIDTH;
export let HEIGHT = DEFAULT_HEIGHT;
export let COOLDOWN = 0;

export const intIdNames = new Map();
export let intIdPositions = new Map();
export let account = null;
export let intId = 12345;
export let chatName = "Oyuncu";
export let connectStatus = "initial";
export let canvasLocked = false;
export let placementMode = PLACEMENT_MODE.selectPixel;
export const spectators = new Set();
export let spectatingIntId = null;
export let cooldownEndDate = null;
export let onCooldown = false;

export let preloadedBoard = Promise.resolve(new ArrayBuffer(WIDTH * HEIGHT));
export async function fetchBoard() { return null; }

// --- SERBEST MOD AYARLARI ---
let isFreeMode = false;
let selectedColorIndex = 0;
let isPainting = false;

export function connect(device, server = "", vip = undefined) {
    if (connectStatus === "connected") return;
    connectStatus = "connected";

    setSize(WIDTH, HEIGHT);

    setTimeout(() => {
        window.dispatchEvent(new CustomEvent("intid", { detail: { intId }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("palette", { detail: { palette: PALETTE, start: PALETTE_USABLE_REGION.start, end: PALETTE_USABLE_REGION.end }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("online", { detail: { count: 1 }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("cooldown", { detail: { endDate: new Date(), cooldown: 0 }, bubbles: true, composed: true }));
    }, 500);

    // Verileri Çek
    supabase.from('pixels').select('*').then(({ data }) => {
        if (data) {
            data.forEach(p => {
                const idx = (parseInt(p.x) % WIDTH) + (parseInt(p.y) % HEIGHT) * WIDTH;
                if (BOARD) BOARD[idx] = parseInt(p.color);
                if (SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
            });
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
        }
    });

    // Canlı Takip
    supabase.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'pixels' }, payload => {
        const p = payload.new;
        if (p) {
            const idx = (parseInt(p.x) % WIDTH) + (parseInt(p.y) % HEIGHT) * WIDTH;
            if (BOARD) BOARD[idx] = parseInt(p.color);
            if (SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
        }
    }).subscribe();

    // ==========================================
    // SERBEST MOD
    // ==========================================
    const freeBtn = document.getElementById("freeModeToggle");
    const viewport = document.getElementById("viewport");
    const coloursContainer = document.getElementById("colours");

    // 1. Serbest Modu Aç/Kapat
    if (freeBtn) {
        freeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            isFreeMode = !isFreeMode;
            freeBtn.classList.toggle("active", isFreeMode);
            freeBtn.style.background = isFreeMode ? "#4CAF50" : "";
        });
    }

    // 2. Renk Seçimi - sadece renk indexini güncelle, başka hiçbir şey yapma
    if (coloursContainer) {
        coloursContainer.addEventListener("click", (e) => {
            if (!isFreeMode) return;
            const children = Array.from(coloursContainer.children);
            let target = e.target;
            while (target && target !== coloursContainer) {
                const index = children.indexOf(target);
                if (index !== -1) {
                    selectedColorIndex = index;
                    // Seçili rengi görsel olarak işaretle
                    children.forEach(c => c.style.outline = "");
                    children[index].style.outline = "3px solid white";
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    break;
                }
                target = target.parentNode;
            }
        }, { capture: true });
    }

    // 3. Canvas piksel koordinatını hesaplayan yardımcı fonksiyon
    function getPixelCoord(e) {
        const canvas = document.querySelector("canvas");
        if (!canvas) {
            // Fallback: positionIndicator'dan oku
            const text = document.getElementById("positionIndicator")?.innerText ?? "";
            const match = text.match(/\((\d+),\s*(\d+)\)/);
            if (!match) return null;
            return { x: parseInt(match[1]), y: parseInt(match[2]) };
        }

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;
        if (clientX == null) return null;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const px = Math.floor((clientX - rect.left) * scaleX);
        const py = Math.floor((clientY - rect.top) * scaleY);

        if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) return null;
        return { x: px, y: py };
    }

    // 4. Boyama fonksiyonu
    function paintPixel(e) {
        const coord = getPixelCoord(e);
        if (!coord) return;
        sendServerMessage("putPixel", { position: coord.x + coord.y * WIDTH, colour: selectedColorIndex });
    }

    // 5. Pointer olayları - capture:true ile oyunun kendi olaylarını engelle
    if (viewport) {
        viewport.addEventListener("pointerdown", (e) => {
            if (!isFreeMode) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            isPainting = true;
            paintPixel(e);
        }, { capture: true });

        viewport.addEventListener("pointermove", (e) => {
            if (!isFreeMode || !isPainting) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            paintPixel(e);
        }, { capture: true });

        viewport.addEventListener("pointerup", () => {
            isPainting = false;
        }, { capture: true });

        viewport.addEventListener("pointercancel", () => {
            isPainting = false;
        }, { capture: true });
    }
}

export function sendServerMessage(name, args) {
    if (name === "putPixel") {
        let pos = args?.position ?? (Array.isArray(args) ? args[0] : null);
        let col = args?.colour ?? (Array.isArray(args) ? args[1] : null);

        if (pos !== null && col !== null) {
            const x = pos % WIDTH;
            const y = Math.floor(pos / WIDTH);

            setPixelI(pos, col);
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));

            supabase.from('pixels').upsert({ x: x, y: y, color: col.toString() }).then();
            setCooldown(Date.now());
        }
    }
}

export function setSize(width, height) {
    WIDTH = width; HEIGHT = height;
    BOARD = new Uint8Array(width * height).fill(255);
    SOCKET_PIXELS = new Uint8Array(width * height).fill(255);
    RAW_BOARD = new Uint8Array(width * height).fill(255);
    CHANGES = new Uint8Array(width * height).fill(255);
    window.dispatchEvent(new CustomEvent("size", { detail: { width, height }, bubbles: true, composed: true }));
}

export function setCooldown(endDate) {
    cooldownEndDate = endDate;
    onCooldown = false;
    window.dispatchEvent(new CustomEvent("cooldownstart", { detail: { endDate, onCooldown: false }, bubbles: true, composed: true }));
}

export function setPixelI(index, colour) {
    if (BOARD) BOARD[index] = colour;
    if (SOCKET_PIXELS) SOCKET_PIXELS[index] = colour;
}
