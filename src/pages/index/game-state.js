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
export async function makeServerRequest() { return null; }

// --- SERBEST MOD (FIRÇA) DEĞİŞKENLERİ ---
let isFreeMode = false;
let isPaletteOpen = false;
let selectedColorIndex = 0;
let isPainting = false;
let lastPos = -1;

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
    // SERBEST MOD (FIRÇA) MANTIĞI
    // ======================================================
    const freeBtn = document.getElementById("freeModeToggle");
    const paletteDiv = document.getElementById("palette");
    const coloursContainer = document.getElementById("colours");
    const pokBtn = document.getElementById("pok");
    const pcancelBtn = document.getElementById("pcancel");
    const viewport = document.getElementById("viewport");

    // Palet Kontrol Fonksiyonları
    function openPalette() {
        isPaletteOpen = true;
        if (paletteDiv) paletteDiv.style.transform = "translateY(0)";
        if (pokBtn) pokBtn.style.display = "none";       // Onay butonunu gizle
        if (pcancelBtn) pcancelBtn.style.display = "none"; // İptal butonunu gizle
    }

    function closePalette() {
        isPaletteOpen = false;
        if (paletteDiv) paletteDiv.style.transform = "translateY(100%)";
        if (!isFreeMode) {
            // Mod tamamen kapandıysa orijinal butonları geri getir
            if (pokBtn) pokBtn.style.display = "flex";
            if (pcancelBtn) pcancelBtn.style.display = "flex";
        }
    }

    // 1. Butona Tıklama (Aç / Renk Değiştir / Tamamen Kapat)
    if (freeBtn) {
        freeBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            if (!isFreeMode) {
                // MOD KAPALIYSA: Modu aç ve rengi seçmesi için paleti göster
                isFreeMode = true;
                freeBtn.classList.add("active");
                openPalette();
            } else {
                if (!isPaletteOpen) {
                    // MOD AÇIK AMA PALET KAPALIYSA (Boyama modunda): Rengi değiştirmesi için paleti geri aç
                    openPalette();
                } else {
                    // MOD AÇIK VE PALET AÇIKSA: Kullanıcı modu tamamen kapatmak istiyor demektir
                    isFreeMode = false;
                    freeBtn.classList.remove("active");
                    closePalette();
                }
            }
        });
    }

    // 2. Paletten Renk Seçimi (Anında kapanır ve boyamaya hazır olur)
    if (coloursContainer) {
        coloursContainer.addEventListener("click", (e) => {
            if (!isFreeMode) return;

            const children = Array.from(coloursContainer.children);
            let target = e.target;

            while (target && target !== coloursContainer) {
                const index = children.indexOf(target);
                if (index !== -1) {
                    selectedColorIndex = index;

                    // Seçili rengi çerçeve ile belirt (Beyaz outline)
                    children.forEach(c => c.style.outline = "");
                    children[index].style.outline = "3px solid white";

                    // RENGİ SEÇTİK -> PALETİ KAPAT -> DİREKT BOYAMAYA BAŞLA!
                    closePalette();

                    e.stopImmediatePropagation();
                    e.preventDefault();
                    break;
                }
                target = target.parentNode;
            }
        }, { capture: true }); // Oyunun kendi renk seçicisini ezer
    }

    // 3. Ekrana Tıklayıp/Sürükleyip Boyama (Fırça İşlemi)
    if (viewport) {
        function paintAt() {
            const text = document.getElementById("positionIndicator")?.innerText ?? "";
            // Regex düzeltildi! Doğru şekilde (X, Y) koordinatını alır
            const match = text.match(/\((\d+),\s*(\d+)\)/);
            if (!match) return;

            const x = parseInt(match[1]);
            const y = parseInt(match[2]);
            const pos = x + y * WIDTH;

            // Aynı piksele saniyede 100 kere istek atmasını engelle
            if (pos === lastPos) return;
            lastPos = pos;

            sendServerMessage("putPixel", { position: pos, colour: selectedColorIndex });
        }

        // Tıklamaya başlayınca...
        viewport.addEventListener("pointerdown", (e) => {
            if (!isFreeMode) return;
            
            // Oyunun orijinal "palet açma" olayını kökünden kes!
            e.stopImmediatePropagation();
            e.preventDefault();
            
            // Eğer yanlışlıkla palet açıkken ekrana dokunduysa paleti kapat
            if (isPaletteOpen) closePalette();

            isPainting = true;
            lastPos = -1; // Yeni tıklamada hafızayı sıfırla
            requestAnimationFrame(paintAt);
        }, { capture: true }); // Capture: true çok önemlidir, oyun motorundan önce çalışır!

        // Sürüklerken...
        viewport.addEventListener("pointermove", (e) => {
            if (!isFreeMode || !isPainting) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            requestAnimationFrame(paintAt);
        }, { capture: true });

        // Tıklamayı (Click) oyunun anlamaması için onu da kesiyoruz
        viewport.addEventListener("click", (e) => {
            if (!isFreeMode) return;
            e.stopImmediatePropagation();
            e.preventDefault();
        }, { capture: true });

        // Tıklama bittiğinde...
        window.addEventListener("pointerup", () => {
            isPainting = false;
            lastPos = -1;
        });
        window.addEventListener("pointercancel", () => {
            isPainting = false;
            lastPos = -1;
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
