"use strict";
import { DEFAULT_COOLDOWN, DEFAULT_HEIGHT, DEFAULT_PALETTE, DEFAULT_PALETTE_USABLE_REGION, DEFAULT_WIDTH, PLACEMENT_MODE, supabase } from "../../defaults";

// Sitenin Görüntü Değişkenleri
export let BOARD = null;
export let CHANGES = null;
export let RAW_BOARD = null;
export let SOCKET_PIXELS = null;
export let PALETTE_USABLE_REGION = DEFAULT_PALETTE_USABLE_REGION;
export let PALETTE = DEFAULT_PALETTE;
export let WIDTH = DEFAULT_WIDTH;
export let HEIGHT = DEFAULT_HEIGHT;
export let COOLDOWN = DEFAULT_COOLDOWN;

// Sitenin Çökmemesi İçin Korunan Yan Değişkenler
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

// Yükleme Ekranını Geçmek İçin Sahte Değişken
export let preloadedBoard = Promise.resolve(new ArrayBuffer(WIDTH * HEIGHT));

// Orijinal fetchBoard (artık boş)
export async function fetchBoard() { return null; }

// SUPABASE BAĞLANTI MOTORUMUZ
export function connect(device, server = "", vip = undefined) {
    if (connectStatus !== "initial" && connectStatus !== "disconnected") return;
    connectStatus = "connected";

    // 1. Tuvali oluştur (31 numaralı renk paletimizde beyazdır)
    setSize(WIDTH, HEIGHT);

    // 2. Sayfa açıldığında veritabanındaki eski pikselleri çek
    supabase.from('pixels').select('*').then(({ data, error }) => {
        if (data) {
            for (const pixel of data) {
                const index = pixel.x % WIDTH + (pixel.y % HEIGHT) * WIDTH;
                setPixelI(index, parseInt(pixel.color));
            }
            // Ekrana yansıt
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
        }
    });

    // 3. CANLI YAYIN: Başkası piksel koyduğunda anında gör (Realtime)
    supabase
        .channel('public:pixels')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pixels' }, payload => {
            const pixel = payload.new;
            if (pixel && pixel.x !== undefined && pixel.y !== undefined && pixel.color !== undefined) {
                const index = pixel.x % WIDTH + (pixel.y % HEIGHT) * WIDTH;
                setPixelI(index, parseInt(pixel.color));
                window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
            }
        })
        .subscribe();

    // Sitenin yükleme (Loading) ekranında kalmaması için "Her şey hazır" sinyali gönder
    window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true }));
    window.dispatchEvent(new CustomEvent("online", { detail: { count: 1 }, bubbles: true, composed: true }));
}

// BİZ PİKSEL KOYDUĞUMUZDA NE OLACAK?
export function sendServerMessage(name, args=undefined, event=undefined) {
    if (name === "putPixel") {
        const position = args.position !== undefined ? args.position : (Array.isArray(args) ? args[0] : null);
        const color = args.colour !== undefined ? args.colour : (Array.isArray(args) ? args[1] : null);
        
        if (position !== null && color !== null) {
            // Index'i X ve Y koordinatlarına çevir
            const x = position % WIDTH;
            const y = Math.floor(position / WIDTH);
            
            // Bizim ekranımıza anında koy (gecikme hissetmemek için)
            setPixelI(position, color);
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));

            // Supabase'e kaydet (diğerleri de görsün)
            supabase.from('pixels').upsert({ x: x, y: y, color: color.toString() }).then();
            
            // Bekleme süresi (Cooldown) başlat
            setCooldown(Date.now() + COOLDOWN);
        }
    }
}

// Sitenin Hata Vermemesi İçin Boş Bırakılan Yardımcılar
export async function makeServerRequest(call, args=undefined) {
    return null; 
}

export function setSize(width, height) {
    WIDTH = width;
    HEIGHT = height;
    BOARD = new Uint8Array(width * height).fill(31); 
    SOCKET_PIXELS = new Uint8Array(width * height).fill(31);
    RAW_BOARD = new Uint8Array(width * height).fill(31);
    CHANGES = new Uint8Array(width * height).fill(255);

    window.dispatchEvent(new CustomEvent("size", { detail: { width, height }, bubbles: true, composed: true }));
}

let cooldownTimeout = null;
export function setCooldown(endDate) {
    if (cooldownTimeout !== null) {
        clearTimeout(cooldownTimeout);
        cooldownTimeout = null;
    }
    
    cooldownEndDate = endDate;
    const now = Date.now();

    if (endDate !== null) {
        if (endDate > now) {
            onCooldown = true;
            cooldownTimeout = setTimeout(() => {
                onCooldown = false;
                window.dispatchEvent(new CustomEvent("cooldownend", { detail: { endDate, onCooldown } }));
            }, endDate - now);
        } else {
            onCooldown = false;
        }
    } else {
        onCooldown = true;
    }

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
