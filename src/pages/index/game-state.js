"use strict";
import { DEFAULT_HEIGHT, DEFAULT_PALETTE, DEFAULT_PALETTE_USABLE_REGION, DEFAULT_WIDTH, PLACEMENT_MODE, supabase } from "../../defaults.js";

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
export async function makeServerRequest() { return null; }

let isFreeMode = false;
let selectedColorIndex = 0;

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

    // ======================================================
    // SERBEST MOD
    // ======================================================

    // Oyunun renk seçme eventini dinle - hangi rengin seçildiğini takip et
    window.addEventListener("colourselect", (e) => {
        if (e.detail?.colour !== undefined) {
            selectedColorIndex = e.detail.colour;
        }
    });

    // Yedek: colours div'indeki selected class'ını takip et
    setTimeout(() => {
        const colours = document.getElementById("colours");
        if (colours) {
            colours.addEventListener("click", (e) => {
                // Tıklamayı engelleme - sadece hangi index'e basıldığını öğren
                const children = Array.from(colours.children);
                let t = e.target;
                while (t && t !== colours) {
                    const idx = children.indexOf(t);
                    if (idx !== -1) { selectedColorIndex = idx; break; }
                    t = t.parentNode;
                }
            });
        }
    }, 1000);

    // Serbest Mod Butonu
    const freeBtn = document.getElementById("freeModeToggle");
    if (freeBtn) {
        freeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            isFreeMode = !isFreeMode;
            freeBtn.classList.toggle("active", isFreeMode);

            if (isFreeMode) {
                // Oyunun kendi place butonuna tıkla → palet açılır
                const placeBtn = document.getElementById("place");
                if (placeBtn) placeBtn.click();
            }
        });
    }

    // pok (✓) butonuna basılınca: serbest moddaysa paleti kapat, boyama yap
    setTimeout(() => {
        const pokBtn = document.getElementById("pok");
        if (pokBtn) {
            pokBtn.addEventListener("click", (e) => {
                if (!isFreeMode) return;
                // Serbest moddayken ✓ butonunu engelle, palet kapansın sadece
                e.stopImmediatePropagation();
                e.preventDefault();
                const paletteDiv = document.getElementById("palette");
                if (paletteDiv) paletteDiv.style.transform = "translateY(100%)";
            }, { capture: true });
        }
    }, 1000);

    // Viewport - serbest moddayken tıklayınca direkt boya
    const viewport = document.getElementById("viewport");
    if (viewport) {
        let isPainting = false;
        let lastPos = -1;

        function paintAt() {
            const text = document.getElementById("positionIndicator")?.innerText ?? "";
            const match = text.match(/\((\d+),\s*(\d+)\)/);
            if (!match) return;
            const x = parseInt(match[1]);
            const y = parseInt(match[2]);
            const pos = x + y * WIDTH;
            if (pos === lastPos) return;
            lastPos = pos;
            sendServerMessage("putPixel", { position: pos, colour: selectedColorIndex });
        }

        viewport.addEventListener("pointerdown", (e) => {
            if (!isFreeMode) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            isPainting = true;
            lastPos = -1;
            requestAnimationFrame(paintAt);
        }, { capture: true });

        viewport.addEventListener("pointermove", (e) => {
            if (!isFreeMode || !isPainting) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            requestAnimationFrame(paintAt);
        }, { capture: true });

        viewport.addEventListener("click", (e) => {
            if (!isFreeMode) return;
            e.stopImmediatePropagation();
            e.preventDefault();
        }, { capture: true });

        window.addEventListener("pointerup", () => { isPainting = false; lastPos = -1; });
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

export function setPixel(x, y, colour) {
    setPixelI(x % WIDTH + (y % HEIGHT) * WIDTH, colour);
}

export function setPixelI(index, colour) {
    if (BOARD) BOARD[index] = colour;
    if (SOCKET_PIXELS) SOCKET_PIXELS[index] = colour;
}
