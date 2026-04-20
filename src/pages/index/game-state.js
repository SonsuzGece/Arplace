"use strict";
import { DEFAULT_COOLDOWN, DEFAULT_HEIGHT, DEFAULT_PALETTE, DEFAULT_PALETTE_USABLE_REGION, DEFAULT_WIDTH, PLACEMENT_MODE, supabase } from "../../defaults";

// Temel Değişkenler
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
export let intId = 12345;
export let chatName = "Oyuncu";
export let connectStatus = "initial";
export let canvasLocked = false;
export let placementMode = PLACEMENT_MODE.selectPixel;
export const spectators = new Set();
export let spectatingIntId = null;
export let cooldownEndDate = null;
export let onCooldown = false;

// ✅ DÜZELTİLDİ: preloadedBoard artık Supabase'den gerçek veriyi yüklüyor
export let preloadedBoard = new Promise(async (resolve) => {
    const buffer = new ArrayBuffer(DEFAULT_WIDTH * DEFAULT_HEIGHT);
    const view = new Uint8Array(buffer);
    view.fill(31);
    try {
        const { data } = await supabase.from('pixels').select('*');
        if (data) {
            data.forEach(pixel => {
                const index = pixel.x + pixel.y * DEFAULT_WIDTH;
                if (index >= 0 && index < view.length) {
                    view[index] = parseInt(pixel.color);
                }
            });
        }
    } catch (e) {
        console.warn("preloadedBoard yüklenemedi:", e);
    }
    resolve(buffer);
});

export async function fetchBoard() { return null; }

// ✅ DÜZELTİLDİ: boardloaded artık piksel verisi GELDİKTEN SONRA ateşleniyor
export function connect(device, server = "", vip = undefined) {
    if (connectStatus !== "initial" && connectStatus !== "disconnected") return;
    connectStatus = "connecting"; // Gerçekten bağlanılıyor

    setSize(WIDTH, HEIGHT);

    // Önce canlı kanalı dinlemeye başla (veri kaybetmemek için)
    supabase.channel('public:pixels')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pixels' }, payload => {
            const pixel = payload.new;
            if (pixel && BOARD) {
                const index = pixel.x + pixel.y * WIDTH;
                if (index >= 0 && index < BOARD.length) {
                    setPixelI(index, parseInt(pixel.color));
                    window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
                }
            }
        })
        .subscribe();

    // Supabase'den mevcut pikselleri yükle
    supabase.from('pixels').select('*').then(({ data, error }) => {
        if (data) {
            data.forEach(pixel => {
                const index = pixel.x + pixel.y * WIDTH;
                if (index >= 0 && index < BOARD.length) {
                    setPixelI(index, parseInt(pixel.color));
                }
            });
        }

        // ✅ Piksel verisi geldikten SONRA paneli ve paleti aç
        connectStatus = "connected";
        window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("online", { detail: { count: 1 }, bubbles: true, composed: true }));

    }).catch((err) => {
        console.warn("Piksel yüklenemedi, yine de açılıyor:", err);
        // Hata olsa bile takılı kalmasın
        connectStatus = "connected";
        window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("online", { detail: { count: 1 }, bubbles: true, composed: true }));
    });
}

// PİKSEL KOYMA
export function sendServerMessage(name, args = undefined, event = undefined) {
    if (name === "putPixel") {
        const position = args.position !== undefined ? args.position : (Array.isArray(args) ? args[0] : null);
        const color = args.colour !== undefined ? args.colour : (Array.isArray(args) ? args[1] : null);

        if (position !== null && color !== null) {
            const x = position % WIDTH;
            const y = Math.floor(position / WIDTH);

            setPixelI(position, color);
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));

            // Supabase'e kaydet
            supabase.from('pixels').upsert({ x, y, color: color.toString() }).then();

            // ✅ DÜZELTİLDİ: Cooldown sadece 0'dan büyükse çalışsın
            if (COOLDOWN > 0) {
                setCooldown(Date.now() + COOLDOWN);
            }
        }
    }
}

export async function makeServerRequest(call, args = undefined) { return null; }

export function setSize(width, height) {
    WIDTH = width;
    HEIGHT = height;
    BOARD = new Uint8Array(width * height).fill(31);
    SOCKET_PIXELS = new Uint8Array(width * height).fill(31);
    RAW_BOARD = new Uint8Array(width * height).fill(31);
    CHANGES = new Uint8Array(width * height).fill(255);
    window.dispatchEvent(new CustomEvent("size", { detail: { width, height }, bubbles: true, composed: true }));
}

export function setCooldown(endDate) {
    cooldownEndDate = endDate;
    onCooldown = endDate > Date.now();
    window.dispatchEvent(new CustomEvent("cooldownstart", { detail: { endDate, onCooldown }, bubbles: true, composed: true }));
}

// ✅ DÜZELTİLDİ: % WIDTH ve % HEIGHT kaldırıldı (index hesabı yanlışlığa yol açıyordu)
export function setPixel(x, y, colour) {
    const index = x + y * WIDTH;
    setPixelI(index, colour);
}

export function setPixelI(index, colour) {
    if (!BOARD || !SOCKET_PIXELS) return;
    if (index < 0 || index >= BOARD.length) return; // ✅ Sınır kontrolü eklendi
    BOARD[index] = colour;
    SOCKET_PIXELS[index] = colour;
}
