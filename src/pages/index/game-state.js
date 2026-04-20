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

// --- YENİ SİSTEM DEĞİŞKENLERİ ---
export let currentUserToken = null;
export let currentUserProfile = null;
export let isVisitor = true;
export let freeDrawMode = false;
let activeColor = 0; // Serbest Mod için seçili renk hafızası

// --- BİLDİRİM (TOAST) FONKSİYONU ---
export function showToast(msg, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- ARAYÜZ VE AUTH AYARLARI ---
function setupUI() {
    const authOverlay = document.getElementById('authOverlay');
    const authBtn = document.getElementById('authBtn');
    const tokenInput = document.getElementById('authTokenInput');
    const visitorBtn = document.getElementById('visitorBtn');

    const profileBtn = document.getElementById('profileBtn');
    const profileOverlay = document.getElementById('profileOverlay');
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const openAdminBtn = document.getElementById('openAdminBtn');
    const adminOverlay = document.getElementById('adminOverlay');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const createUserBtn = document.getElementById('createUserBtn');

    const freeDrawToggle = document.getElementById('freeDrawToggle');
    const placeBtn = document.getElementById('place');

    // 1. ZİYARETÇİ GİRİŞİ
    visitorBtn.onclick = () => {
        authOverlay.style.display = 'none';
        isVisitor = true;
        placeBtn.style.display = 'none';
        freeDrawToggle.style.display = 'none';
        showToast("Ziyaretçi olarak giriş yapıldı. Sadece izleyebilirsiniz.", "success");
        initGame();
    };

    // 2. TOKEN İLE GİRİŞ
    authBtn.onclick = async () => {
        const token = tokenInput.value.trim();
        if (!token) return showToast("Lütfen geçerli bir kod girin!", "error");

        authBtn.innerText = "Doğrulanıyor...";
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('access_token', token).single();

        if (error || !profile) {
            showToast("Geçersiz veya hatalı erişim kodu!", "error");
            authBtn.innerText = "Giriş Yap";
        } else {
            localStorage.setItem('arplace_token', token);
            authOverlay.style.display = 'none';
            showToast(`Hoş geldin, ${profile.username}!`, "success");
            initGameWithProfile(profile, token);
        }
    };

    // OTOMATİK GİRİŞ KONTROLÜ
    const savedToken = localStorage.getItem('arplace_token');
    if (savedToken) {
        supabase.from('profiles').select('*').eq('access_token', savedToken).single().then(({ data }) => {
            if (data) {
                authOverlay.style.display = 'none';
                showToast("Tekrar hoş geldin!", "success");
                initGameWithProfile(data, savedToken);
            } else {
                localStorage.removeItem('arplace_token');
            }
        });
    }

    // 3. PROFİL MENÜSÜ İŞLEMLERİ
    profileBtn.onclick = async () => {
        if (isVisitor) return showToast("Ziyaretçilerin profili yoktur. Sadece izleyebilirler.", "error");
        
        document.getElementById('profUsername').innerText = currentUserProfile.username;
        document.getElementById('profRole').innerText = currentUserProfile.role.toUpperCase();
        document.getElementById('profDate').innerText = new Date(currentUserProfile.created_at).toLocaleDateString('tr-TR');
        
        const { count } = await supabase.from('pixels').select('*', { count: 'exact', head: true }).eq('user_id', currentUserProfile.id);
        document.getElementById('profPixels').innerText = count || 0;

        if (currentUserProfile.role === 'admin') openAdminBtn.style.display = 'block';
        profileOverlay.style.display = 'flex';
    };

    closeProfileBtn.onclick = () => profileOverlay.style.display = 'none';
    logoutBtn.onclick = () => { localStorage.removeItem('arplace_token'); location.reload(); };

    // 4. ADMİN PANELİ İŞLEMLERİ
    openAdminBtn.onclick = () => {
        profileOverlay.style.display = 'none';
        adminOverlay.style.display = 'flex';
        loadAdminUsers();
    };
    closeAdminBtn.onclick = () => adminOverlay.style.display = 'none';

    createUserBtn.onclick = async () => {
        const username = document.getElementById('newUsername').value.trim();
        const role = document.getElementById('newUserRole').value;
        if (!username) return showToast("Kullanıcı adı girilmek zorundadır!", "error");
        
        const token = 'place_' + Math.random().toString(36).substr(2, 9);
        const cooldown = (role === 'admin' || role === 'vip') ? 0 : 1000; // Normal üyeye 1sn, VIP'e 0sn

        const { error } = await supabase.from('profiles').insert([{ username, access_token: token, role, cooldown_ms: cooldown }]);

        if (error) {
            showToast("Hata: " + error.message, "error");
        } else {
            showToast(`Üye eklendi! Token kopyalandı: ${token}`, "success");
            navigator.clipboard.writeText(token); // Kodu anında kopyalar
            document.getElementById('newUsername').value = "";
            loadAdminUsers();
        }
    };

    // 5. SERBEST MOD (HIZLI ÇİZİM) AÇ/KAPAT
    freeDrawToggle.onclick = () => {
        if (currentUserProfile?.role !== 'admin' && currentUserProfile?.role !== 'vip') {
            return showToast("Bu özellik sadece VIP ve Adminler içindir!", "error");
        }
        freeDrawMode = !freeDrawMode;
        if (freeDrawMode) {
            freeDrawToggle.classList.add('active');
            showToast("Serbest Mod AÇIK. Renk seçip ekrana tıklayın!", "success");
        } else {
            freeDrawToggle.classList.remove('active');
            showToast("Serbest Mod KAPALI.", "error");
        }
    };

    // Palette renk seçildiğinde hafızaya al (Serbest mod tak tak tak koyabilsin diye)
    document.getElementById("colours").addEventListener("click", (e) => {
        const children = Array.from(document.getElementById("colours").children);
        let target = e.target;
        while(target && target.id !== "colours") {
            const index = children.indexOf(target);
            if (index !== -1) { 
                activeColor = index; 
                break; 
            }
            target = target.parentNode;
        }
    });

    // Serbest Mod Açıksa ve Ekrana Tıklanırsa (Sihirli Kısım)
    document.getElementById("viewport").addEventListener("pointerup", (e) => {
        if (freeDrawMode && !isVisitor && !onCooldown) {
            // Oyun motorunun koordinat bulmasını 50ms bekleyip tepeden okuyoruz
            setTimeout(() => {
                const text = document.getElementById("positionIndicator").innerText;
                const match = text.match(/\((\d+),\s*(\d+)\)/);
                if (match) {
                    const x = parseInt(match[1]);
                    const y = parseInt(match[2]);
                    const pos = x + (y * WIDTH);
                    sendServerMessage("putPixel", { position: pos, colour: activeColor });
                }
            }, 50);
        }
    });
}

// --- ADMİN PANELİ LİSTELEME VE SİLME ---
async function loadAdminUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const list = document.getElementById('adminUserList');
    list.innerHTML = '';
    if (data) {
        data.forEach(u => {
            const div = document.createElement('div');
            div.style.cssText = "background: #1e1e24; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #444;";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <b style="color: #ff4500;">${u.username} (${u.role.toUpperCase()})</b>
                    <span style="color:#aaa; font-size:12px;">${new Date(u.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <div style="color:#00ff00; font-family:monospace; margin-bottom:10px; font-size:14px; background:#111; padding:4px; border-radius:4px;">${u.access_token}</div>
                <div style="display:flex; gap:5px;">
                    <button style="background:#dc3545; color:white; border:none; padding:6px 12px; border-radius:50px; cursor:pointer; font-weight:bold;" onclick="deleteUserPixels('${u.id}')">Tüm Piksellerini Sil</button>
                </div>
            `;
            list.appendChild(div);
        });
    }
}

window.deleteUserPixels = async (userId) => {
    if (!confirm("DİKKAT: Bu kullanıcının tuvaldeki TÜM PİKSELLERİ sonsuza dek silinecek. Emin misin?")) return;
    const { error } = await supabase.from('pixels').delete().eq('user_id', userId);
    if (error) showToast("Silme hatası: " + error.message, "error");
    else showToast("Kullanıcının tüm pikselleri haritadan kazındı!", "success");
};

// --- OYUN BAŞLATMA MANTIĞI ---
function initGameWithProfile(profile, token) {
    currentUserProfile = profile;
    currentUserToken = token;
    isVisitor = false;
    COOLDOWN = profile.cooldown_ms || 1000;
    chatName = profile.username;
    
    const freeDrawToggle = document.getElementById('freeDrawToggle');
    if (profile.role === 'admin' || profile.role === 'vip') {
        freeDrawToggle.style.display = 'flex';
    } else {
        freeDrawToggle.style.display = 'none';
    }

    // Doğru token'ı Supabase'e tanıt (Hacker Koruması)
    supabase.rpc('set_config', { name: 'app.current_token', value: token }).then();

    initGame();
}

function initGame() {
    setSize(WIDTH, HEIGHT);
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
    // Tüm tuvali çek
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

    // Canlı Güncellemeler (ve Canlı Silme/Wipe animasyonu)
    supabase.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'pixels' }, payload => {
        if (payload.eventType === 'DELETE') {
            const old = payload.old;
            const idx = (parseInt(old.x) % WIDTH) + (parseInt(old.y) % HEIGHT) * WIDTH;
            if(BOARD) BOARD[idx] = 255; // Silinen pikseli anında bembeyaz yap
            if(SOCKET_PIXELS) SOCKET_PIXELS[idx] = 255;
        } else {
            const p = payload.new;
            if (p) {
                const idx = (parseInt(p.x) % WIDTH) + (parseInt(p.y) % HEIGHT) * WIDTH;
                if(BOARD) BOARD[idx] = parseInt(p.color);
                if(SOCKET_PIXELS) SOCKET_PIXELS[idx] = parseInt(p.color);
            }
        }
        window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));
    }).subscribe();
}

export function connect(device, server = "", vip = undefined) {
    if (connectStatus === "connected") return;
    connectStatus = "connected";
    setupUI(); // Sitenin kalbini ve giriş ekranını başlat
}

export function sendServerMessage(name, args) {
    if (name === "putPixel" && !isVisitor) {
        let pos = args?.position ?? (Array.isArray(args) ? args[0] : null);
        let col = args?.colour ?? (Array.isArray(args) ? args[1] : null);
        
        if (pos !== null && col !== null) {
            if (onCooldown && !freeDrawMode) {
                return showToast("Bekleme süreniz henüz bitmedi!", "error");
            }

            const x = pos % WIDTH;
            const y = Math.floor(pos / WIDTH);
            
            // Ekrana Çiz (Anında Tepki)
            setPixelI(pos, col);
            window.dispatchEvent(new CustomEvent("pixels", { bubbles: true, composed: true }));

            // Supabase'e Gönder (Hacker Korumalı RPC)
            supabase.rpc('place_pixel_with_token', { 
                p_x: x, 
                p_y: y, 
                p_color: col, 
                p_token: currentUserToken 
            }).then(({ data, error }) => {
                if (error || !data) {
                    showToast("Hata: Piksel veritabanına yazılamadı!", "error");
                }
            });
            
            // Serbest Mod KAPALIYSA bekleme süresini başlat
            if (!freeDrawMode) {
                setCooldown(Date.now() + COOLDOWN);
            }
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
