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

// --- SERBEST MOD (FREE DRAW) HAFIZASI VE BUTON KONTROLÜ ---
let activeColor = 0; // Varsayılan renk (0 = Siyah)
let isFreeMode = false; // Serbest mod başlangıçta kapalı

export function connect(device, server = "", vip = undefined) {
    if (connectStatus === "connected") return;
    connectStatus = "connected";

    setSize(WIDTH, HEIGHT);

    // Yükleme ekranını anında geçiren sinyaller
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent("intid", { detail: { intId }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("palette", { detail: { palette: PALETTE, start: PALETTE_USABLE_REGION.start, end: PALETTE_USABLE_REGION.end }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("online", { detail: { count: 1 }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("cooldown", { detail: { endDate: new Date(), cooldown: 0 }, bubbles: true, composed: true }));
    }, 500);

    // Supabase'den eski pikselleri çek
    supabase.from('pixels').select('*').then(({ data }) => {
        if (data) {
            data.forEach(p => {
                const idx = (parseInt(p.x) % WIDTH) + (parseInt(p.y) % HEIGHT) * WIDTH;
                if(BOARD) BOARD[idx] = parseInt(p.color);
                if(SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
            });
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
        }
    }).catch(e => console.error(e));

    // Canlı güncellemeleri dinle
    supabase.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'pixels' }, payload => {
        const p = payload.new;
        if (p) {
            const idx = (parseInt(p.x) % WIDTH) + (parseInt(p.y) % HEIGHT) * WIDTH;
            if(BOARD) BOARD[idx] = parseInt(p.color);
            if(SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
        }
    }).subscribe();

    // ==========================================
    // YENİ: SERBEST MOD (HIZLI ÇİZİM) BEYNİ
    // ==========================================
    
    // 1. Serbest Mod Butonuna Tıklama Olayı (Aç/Kapat)
    const freeBtn = document.getElementById("freeModeToggle");
    if (freeBtn) {
        // Eğer butona tıklanırsa...
        freeBtn.addEventListener("click", () => {
            isFreeMode = !isFreeMode; // Durumu tersine çevir
            
            if (isFreeMode) {
                freeBtn.classList.add("active"); // Butonu turuncu yap
            } else {
                freeBtn.classList.remove("active"); // Butonu normal hale getir
            }
        });
    }

    // 2. Paletteki renklere tıklandığında o rengi hafızaya al
    const coloursDiv = document.getElementById("colours");
    if (coloursDiv) {
        coloursDiv.addEventListener("click", (e) => {
            const children = Array.from(coloursDiv.children);
            let target = e.target;
            while(target && target.id !== "colours") {
                const index = children.indexOf(target);
                if (index !== -1) { 
                    activeColor = index; // Seçilen rengi hafızaya kaydet
                    break; 
                }
                target = target.parentNode;
            }
        });
    }

    // 3. Tuvale tıklandığında serbest mod açıksa anında pikseli koy
    const viewportDiv = document.getElementById("viewport");
    if (viewportDiv) {
        viewportDiv.addEventListener("pointerup", (e) => {
            if (isFreeMode && !onCooldown) {
                
                // Orijinal menünün (paletin) açılmasını anında iptal et ("Tak tak tak" basabilmek için)
                setTimeout(() => {
                    const pcancel = document.getElementById("pcancel");
                    if (pcancel) pcancel.click(); // Paleti geri kapatır
                }, 10);

                // Koordinatları okuyup pikseli yerleştir
                setTimeout(() => {
                    const text = document.getElementById("positionIndicator").innerText;
                    const match = text.match(/\((\d+),\s*(\d+)\)/);
                    if (match) {
                        const x = parseInt(match[1]);
                        const y = parseInt(match[2]);
                        const pos = x + (y * WIDTH);
                        // Pikseli sunucuya gönder
                        sendServerMessage("putPixel", { position: pos, colour: activeColor });
                    }
                }, 50);
            }
        });
    }
}

export function sendServerMessage(name, args) {
    if (name === "putPixel") {
        let pos = args?.position ?? (Array.isArray(args) ? args[0] : null);
        let col = args?.colour ?? (Array.isArray(args) ? args[1] : null);
        
        if (pos !== null && col !== null) {
            const x = pos % WIDTH;
            const y = Math.floor(pos / WIDTH);
            
            // Ekrana anında çiz
            setPixelI(pos, col);
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));

            // Veritabanına (Supabase) kaydet
            supabase.from('pixels').upsert({ x: x, y: y, color: col.toString() }).then();
            
            // Bekleme süresi (Cooldown) yok - Seri çizime devam
            setCooldown(Date.now());
        }
    }
}

export async function makeServerRequest() { return null; }

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
