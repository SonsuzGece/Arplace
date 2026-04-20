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
export let COOLDOWN = 10000; // Varsayılan 10 saniye bekleme süresi

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

// --- AUTH VE KULLANICI MANTIĞI ---
let currentUser = null;
let currentProfile = null;

async function setupAuth() {
    const authOverlay = document.getElementById('authOverlay');
    const authUsername = document.getElementById('authUsername');
    const authEmail = document.getElementById('authEmail');
    const authPass = document.getElementById('authPassword');
    const authBtn = document.getElementById('authBtn');
    const authSwitch = document.getElementById('authSwitch');
    const authTitle = document.getElementById('authTitle');

    let mode = 'login';
    authUsername.style.display = 'none';

    authSwitch.onclick = () => {
        mode = mode === 'login' ? 'register' : 'login';
        authTitle.innerText = mode === 'login' ? 'Yeni Kayıt' : 'Hoş Geldin';
        authBtn.innerText = mode === 'login' ? 'Kayıt Ol' : 'Giriş Yap';
        authSwitch.innerText = mode === 'login' ? 'Hesabın var mı? Giriş Yap' : 'Hesabın yok mu? Kayıt Ol';
        authUsername.style.display = mode === 'login' ? 'block' : 'none';
    };

    authBtn.onclick = async () => {
        const email = authEmail.value;
        const pass = authPass.value;
        const username = authUsername.value;

        if (!email || !pass) {
            alert("Lütfen e-posta ve şifre alanlarını doldur.");
            return;
        }

        authBtn.innerText = "Bekleniyor...";

        if (mode === 'register') {
            const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { username: username || 'Oyuncu' } } });
            if (error) alert("Hata: " + error.message);
            else {
                alert("Kayıt başarılı! Şimdi giriş yapabilirsin.");
                mode = 'login';
                authTitle.innerText = 'Hoş Geldin';
                authBtn.innerText = 'Giriş Yap';
                authSwitch.innerText = 'Hesabın yok mu? Kayıt Ol';
                authUsername.style.display = 'none';
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (error) alert("Hata: " + error.message);
            else {
                authOverlay.style.display = 'none';
                initGameAfterAuth(data.user);
            }
        }
        authBtn.innerText = mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
    };

    // Zaten giriş yapmış mı kontrol et
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        authOverlay.style.display = 'none';
        initGameAfterAuth(user);
    }
}

async function initGameAfterAuth(user) {
    currentUser = user;
    connectStatus = "connected";
    
    // Supabase'den Kullanıcı Profilini Çek (Rolü ve Bekleme Süresini Öğren)
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    currentProfile = profile;
    
    // Eğer admin kişiyi banlamışsa anında sayfadan at
    if (profile?.role === 'banned') {
        alert("HESABINIZ BANLANMIŞTIR!");
        await supabase.auth.signOut();
        location.reload();
        return;
    }

    COOLDOWN = profile?.cooldown_ms ?? 10000; // Adminin belirlediği süre, yoksa 10 saniye
    chatName = profile?.username ?? "Oyuncu";

    setSize(WIDTH, HEIGHT);

    // Yükleme ekranını anında geçiren sinyaller
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent("intid", { detail: { intId }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("palette", { detail: { palette: PALETTE, start: PALETTE_USABLE_REGION.start, end: PALETTE_USABLE_REGION.end }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("boardloaded", { detail: {}, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("online", { detail: { count: 1 }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent("cooldown", { detail: { endDate: new Date(), cooldown: 0 }, bubbles: true, composed: true }));
    }, 500);

    loadPixels();
}

function loadPixels() {
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
}

export function connect(device, server = "", vip = undefined) {
    if (connectStatus === "connected") return;
    // Kullanıcı siteye girdiğinde ilk iş Auth ekranını tetikle
    setupAuth();
}

export function sendServerMessage(name, args) {
    if (name === "putPixel" && currentUser) {
        let pos = args?.position ?? (Array.isArray(args) ? args[0] : null);
        let col = args?.colour ?? (Array.isArray(args) ? args[1] : null);
        
        if (pos !== null && col !== null && !onCooldown) {
            const x = pos % WIDTH;
            const y = Math.floor(pos / WIDTH);
            
            // Ekrana çiz
            setPixelI(pos, col);
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));

            // Veritabanına kaydet (KİMİN KOYDUĞUNU BELİRTEREK: user_id)
            supabase.from('pixels').upsert({ x: x, y: y, color: col.toString(), user_id: currentUser.id }).then();
            
            // Profiline göre bekleme süresini (Cooldown) başlat
            setCooldown(Date.now() + COOLDOWN);
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
    onCooldown = endDate > Date.now(); 
    window.dispatchEvent(new CustomEvent("cooldownstart", { detail: { endDate, onCooldown }, bubbles: true, composed: true }));
    
    if (onCooldown) {
        setTimeout(() => {
            onCooldown = false;
            window.dispatchEvent(new CustomEvent("cooldownend", { detail: { endDate, onCooldown: false }, bubbles: true, composed: true }));
        }, endDate - Date.now());
    }
}

export function setPixel(x, y, colour) {
    setPixelI(x % WIDTH + (y % HEIGHT) * WIDTH, colour);
}

export function setPixelI(index, colour) {
    if (BOARD) BOARD[index] = colour;
    if (SOCKET_PIXELS) SOCKET_PIXELS[index] = colour;
}
