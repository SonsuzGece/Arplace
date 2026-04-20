"use strict";
import {
    DEFAULT_COOLDOWN,
    DEFAULT_HEIGHT,
    DEFAULT_PALETTE,
    DEFAULT_PALETTE_USABLE_REGION,
    DEFAULT_WIDTH,
    PLACEMENT_MODE,
    supabase
} from "../../defaults.js";

export let BOARD = null;
export let CHANGES = null;
export let RAW_BOARD = null;
export let SOCKET_PIXELS = null;
export let PALETTE_USABLE_REGION = DEFAULT_PALETTE_USABLE_REGION;
export let PALETTE = DEFAULT_PALETTE;
export let WIDTH  = DEFAULT_WIDTH;
export let HEIGHT = DEFAULT_HEIGHT;
export let COOLDOWN = 0;

export const intIdNames     = new Map();
export let   intIdPositions = new Map();
export let   account        = null;
export let   intId          = 12345;
export let   chatName       = "Oyuncu";
export let   connectStatus  = "initial";
export let   canvasLocked   = false;
export let   placementMode  = PLACEMENT_MODE.selectPixel;
export const spectators     = new Set();
export let   spectatingIntId = null;
export let   cooldownEndDate = null;
export let   onCooldown      = false;

export let preloadedBoard = Promise.resolve(new ArrayBuffer(WIDTH * HEIGHT));
export async function fetchBoard() { return null; }

// ─── Supabase istemcisini al (index.html'deki veya defaults.js'deki) ──────────
function getDb() {
    return window.arplaceSession?.db || supabase;
}

// ─── Bağlantı ─────────────────────────────────────────────────────────────────
export function connect(device, server = "", vip = undefined) {
    if (connectStatus === "connected") return;
    connectStatus = "connected";

    setSize(WIDTH, HEIGHT);

    // Yükleme ekranını geç
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent("intid",      { detail: { intId }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("palette",    { detail: { palette: PALETTE, start: PALETTE_USABLE_REGION.start, end: PALETTE_USABLE_REGION.end }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("boardloaded",{ detail: {}, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("online",     { detail: { count: 1 }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("cooldown",   { detail: { endDate: new Date(), cooldown: 0 }, bubbles: true, composed: true }));
    }, 500);

    // Tüm pikselleri Supabase'den yükle
    getDb()
        .from('pixels')
        .select('x, y, color')
        .then(({ data, error }) => {
            if (error) { console.error('[Arplace] Piksel yükleme hatası:', error); return; }
            if (data) {
                data.forEach(p => {
                    const x = parseInt(p.x);
                    const y = parseInt(p.y);
                    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
                    const idx = x + y * WIDTH;
                    if (BOARD)        BOARD[idx]        = parseInt(p.color);
                    if (SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
                });
                window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
            }
        })
        .catch(e => console.error('[Arplace] Piksel yükleme exception:', e));

    // Canlı güncellemeler (Realtime)
    getDb()
        .channel('arplace-pixels')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'pixels' },
            payload => {
                const p = payload.new;
                if (!p) return;
                const x = parseInt(p.x);
                const y = parseInt(p.y);
                if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
                const idx = x + y * WIDTH;
                if (BOARD)        BOARD[idx]        = parseInt(p.color);
                if (SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
                window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
            }
        )
        .subscribe();

    // Serbest mod kurulumu (palette renk tıklamalarını dinle)
    _setupFreeMode();

    // Token yoksa "Piksel Yerleştir" butonunu kilitle
    _setupPlaceButtonGuard();
}

// ─── Piksel Gönderme ───────────────────────────────────────────────────────────
export function sendServerMessage(name, args) {
    if (name !== "putPixel") return;

    // Token kontrolü
    const session = window.arplaceSession;
    if (!session?.token) {
        // Profil panelini aç
        document.getElementById('profilePanel')?.classList.add('visible');
        document.getElementById('profileOverlay')?.classList.add('visible');
        _showToast('🔒 Piksel koymak için giriş yapmalısınız!', 'error');
        return;
    }

    let pos = args?.position ?? (Array.isArray(args) ? args[0] : null);
    let col = args?.colour   ?? (Array.isArray(args) ? args[1] : null);
    if (pos === null || col === null) return;

    const x = pos % WIDTH;
    const y = Math.floor(pos / WIDTH);

    // Ekrana anında çiz (optimistic UI)
    setPixelI(pos, col);
    window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));

    // Cooldown hesapla (user: 1000ms, vip/admin: 0ms)
    const cdMs = _getCooldownMs();
    const endDate = new Date(Date.now() + cdMs);
    setCooldown(endDate);

    // Veritabanına güvenli RPC ile yaz (token doğrulamalı)
    getDb()
        .rpc('place_pixel_with_token', {
            p_x:     x,
            p_y:     y,
            p_color: col,
            p_token: session.token
        })
        .then(({ data, error }) => {
            if (error) {
                console.error('[Arplace] place_pixel_with_token hatası:', error);
                _showToast('❌ Piksel gönderilemedi.', 'error');
                return;
            }
            if (data === false) {
                _showToast('⛔ Geçersiz token. Lütfen tekrar giriş yapın.', 'error');
                // Oturumu temizle
                localStorage.removeItem('arplace_session');
                if (window.arplaceSession) {
                    window.arplaceSession.token    = null;
                    window.arplaceSession.username = null;
                    window.arplaceSession.role     = null;
                }
                document.getElementById('profilebtn')?.classList.remove('logged-in');
            }
        })
        .catch(e => console.error('[Arplace] RPC exception:', e));
}

export async function makeServerRequest() { return null; }

// ─── Boyut Ayarla ─────────────────────────────────────────────────────────────
export function setSize(width, height) {
    WIDTH  = width;
    HEIGHT = height;
    BOARD         = new Uint8Array(width * height).fill(255);
    SOCKET_PIXELS = new Uint8Array(width * height).fill(255);
    RAW_BOARD     = new Uint8Array(width * height).fill(255);
    CHANGES       = new Uint8Array(width * height).fill(255);
    window.dispatchEvent(new CustomEvent("size", { detail: { width, height }, bubbles: true, composed: true }));
}

// ─── Cooldown ─────────────────────────────────────────────────────────────────
export function setCooldown(endDate) {
    cooldownEndDate = endDate;
    const cdMs = _getCooldownMs();
    onCooldown = (cdMs > 0);
    window.dispatchEvent(new CustomEvent("cooldownstart", {
        detail: { endDate, onCooldown },
        bubbles: true,
        composed: true
    }));
    if (cdMs > 0) {
        setTimeout(() => {
            onCooldown = false;
            window.dispatchEvent(new CustomEvent("cooldownend", { bubbles: true, composed: true }));
        }, cdMs);
    }
}

// ─── Piksel Çizme ─────────────────────────────────────────────────────────────
export function setPixel(x, y, colour) {
    const clampedX = ((x % WIDTH)  + WIDTH)  % WIDTH;
    const clampedY = ((y % HEIGHT) + HEIGHT) % HEIGHT;
    setPixelI(clampedX + clampedY * WIDTH, colour);
}

export function setPixelI(index, colour) {
    if (BOARD)        BOARD[index]        = colour;
    if (SOCKET_PIXELS) SOCKET_PIXELS[index] = colour;
}

// ─── Yardımcı: Cooldown süresi ────────────────────────────────────────────────
function _getCooldownMs() {
    const session = window.arplaceSession;
    if (!session) return 1000;
    const role = session.role;
    if (role === 'admin' || role === 'vip') return 0;
    return session.cooldownMs ?? 1000;
}

// ─── Yardımcı: Place butonunu token olmadan kilitle ───────────────────────────
function _setupPlaceButtonGuard() {
    // Her pok (onay) butonuna basıldığında token kontrolü
    document.addEventListener('click', function(e) {
        if (e.target.id !== 'pok' && !e.target.closest('#pok')) return;
        const session = window.arplaceSession;
        if (!session?.token) {
            e.stopImmediatePropagation();
            e.preventDefault();
            document.getElementById('profilePanel')?.classList.add('visible');
            document.getElementById('profileOverlay')?.classList.add('visible');
            _showToast('🔒 Piksel koymak için giriş yapmalısınız!', 'error');
        }
    }, true);
}

// ─── Yardımcı: Serbest mod (VIP/Admin için onay olmadan direkt koy) ───────────
function _setupFreeMode() {
    // Renk seçimi event'i gelince serbest modda otomatik onayla
    function onColourClick(e) {
        const session = window.arplaceSession;
        if (!session?.freeMode) return;
        if (!session?.token)    return;

        // Biraz bekle, seçim state'e işlensin
        setTimeout(() => {
            const pokBtn = document.getElementById('pok');
            // Palet açıksa ve onay butonu erişilebilirse tıkla
            const palette = document.getElementById('palette');
            const isOpen  = palette && !palette.style.transform?.includes('100%');
            if (pokBtn && !pokBtn.disabled && isOpen) {
                pokBtn.click();
            }
        }, 60);
    }

    // Palet renk kutularına listener ekle
    function attachColourListeners() {
        const coloursEl = document.getElementById('colours');
        if (!coloursEl) {
            setTimeout(attachColourListeners, 400);
            return;
        }
        coloursEl.addEventListener('click', onColourClick);
    }
    attachColourListeners();
}

// ─── Yardımcı: Toast bildirimi ────────────────────────────────────────────────
function _showToast(message, type, duration = 3000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'arplace-toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity    = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 320);
    }, duration);
}
