"use strict";
import { DEFAULT_COOLDOWN, DEFAULT_HEIGHT, DEFAULT_PALETTE, DEFAULT_PALETTE_USABLE_REGION, DEFAULT_WIDTH, PLACEMENT_MODE, supabase } from "../../defaults";

// SİSTEM DEĞİŞKENLERİ
export let BOARD = null;
export let CHANGES = null;
export let RAW_BOARD = null;
export let SOCKET_PIXELS = null;
export let PALETTE_USABLE_REGION = DEFAULT_PALETTE_USABLE_REGION;
export let PALETTE = DEFAULT_PALETTE;
export let WIDTH = DEFAULT_WIDTH;
export let HEIGHT = DEFAULT_HEIGHT;
export let COOLDOWN = 0; // Bekleme süresini kapattık

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

// Yükleme ekranını kandırıyoruz
export let preloadedBoard = Promise.resolve(new Uint8Array(DEFAULT_WIDTH * DEFAULT_HEIGHT).fill(31).buffer);

export async function fetchBoard() {
    return new Uint8Array(WIDTH * HEIGHT).fill(31).buffer;
}

// BAĞLANTI FONKSİYONU
export function connect(device, server = "", vip = undefined) {
    if (connectStatus === "connected") return;
    connectStatus = "connected";

    // Tuvali oluştur (31 beyaz renktir)
    setSize(WIDTH, HEIGHT);

    // PANELİ AÇAN SİNYALLER (Gecikmeli gönderiyoruz ki arayüz yakalayabilsin)
    const fire = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));

    setTimeout(() => {
        fire("intid", { intId });
        fire("chatname", { chatName });
        fire("palette", { palette: PALETTE, start: PALETTE_USABLE_REGION.start, end: PALETTE_USABLE_REGION.end });
        fire("online", { count: 1 });
        fire("boardloaded", {});
        fire("cooldown", { endDate: new Date(), cooldown: 0 });
        
        // "Bağlanıyor" yazısını siler
        fire("connected", {}); 
    }, 500);

    // SUPABASE: KAYITLI PİKSELLERİ YÜKLE
    supabase.from('pixels').select('*').then(({ data, error }) => {
        if (data && data.length > 0) {
            console.log(data.length + " piksel veritabanından çekildi.");
            data.forEach(p => {
                const idx = parseInt(p.x) + (parseInt(p.y) * WIDTH);
                if (BOARD) BOARD[idx] = parseInt(p.color);
                if (SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
            });
            // Ekranı güncelle
            fire("pixels", { pixels: data.map(p => ({ position: parseInt(p.x) + parseInt(p.y) * WIDTH, colour: parseInt(p.color) })) });
        }
    });

    // SUPABASE: CANLI YAYIN (Başkası koyarsa gör)
    supabase.channel('any').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pixels' }, payload => {
        const p = payload.new;
        const idx = parseInt(p.x) + (parseInt(p.y) * WIDTH);
        setPixelI(idx, parseInt(p.color));
        fire("pixels", { pixels: [{ position: idx, colour: parseInt(p.color) }] });
    }).subscribe();
}

// PİKSEL KOYMA FONKSİYONU
export function sendServerMessage(name, args) {
    if (name === "putPixel") {
        const pos = args.position ?? args[0];
        const col = args.colour ?? args[1];
        
        const x = pos % WIDTH;
        const y = Math.floor(pos / WIDTH);
        
        // Kendi ekranımızda boya
        setPixelI(pos, col);
        window.dispatchEvent(new CustomEvent("pixels", { 
            detail: { pixels: [{ position: pos, colour: col }] }, 
            bubbles: true, 
            composed: true 
        }));

        // VERİTABANINA KAYDET
        supabase.from('pixels').upsert({ x: x, y: y, color: col.toString() }).then(({error}) => {
            if(error) console.error("Kaydetme hatası:", error);
        });

        setCooldown(Date.now());
    }
}

export async function makeServerRequest() { return null; }

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
    onCooldown = (endDate > Date.now());
    window.dispatchEvent(new CustomEvent("cooldownstart", { detail: { endDate, onCooldown }, bubbles: true, composed: true }));
}

export function setPixel(x, y, colour) { setPixelI(x + y * WIDTH, colour); }

export function setPixelI(index, colour) {
    if (BOARD) BOARD[index] = colour;
    if (SOCKET_PIXELS) SOCKET_PIXELS[index] = colour;
}
