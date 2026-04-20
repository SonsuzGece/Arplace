import { createTopLevelFrame, removeTopLevelFrame } from "../shared.js";
import { addIpcMessageHandler } from "shared-ipc";

// Eski giriş (login) ekranını tamamen iptal ediyoruz
export async function openAccountFrame(page = null, unauthed = null) {
	console.log("Giriş ekranı devre dışı bırakıldı, doğrudan tuvale geçiliyor.");
}

// İframe kapatma (Bozulmaması için orijinal haliyle bırakıyoruz)
export function closeAccountFrame() {
	try {
		return removeTopLevelFrame("accountFrame");
	} catch (e) {
		console.log(e);
	}
}

// İŞTE SİTEYİ DONDURAN O FONKSİYON! 
// Eski sunucuya bağlanmayı sildik. Anında "misafir" olarak siteye al diyoruz.
export async function getAccount() {
	// Hiçbir yere bağlanmadan anında yanıt dön:
	return null; 
}

// Etkinlik yöneticisi (Bozulmaması için orijinal haliyle bırakıyoruz)
export function dispatchAccountEvent(eventName, detail = {}) {
	const event = new CustomEvent(eventName, {
		detail,
		bubbles: true,
		composed: true
	})
	window.dispatchEvent(event)
}

// Hook up cross frame / parent window IPC request handlers
addIpcMessageHandler("closeAccountFrame", closeAccountFrame);
addIpcMessageHandler("dispatchAccountEvent", dispatchAccountEvent);
