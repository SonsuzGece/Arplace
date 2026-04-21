// ==========================================
// GERÇEK SERBEST MOD (FIRÇA MANTIĞI)
// ==========================================
const freeBtn = document.getElementById("freeModeToggle");
const viewport = document.getElementById("viewport");
const coloursContainer = document.getElementById("colours");

let isPainting = false; // Sürekli boyama için

// 1. Serbest Modu Aç/Kapat
if (freeBtn) {
    freeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        isFreeMode = !isFreeMode;
        freeBtn.classList.toggle("active", isFreeMode);
        freeBtn.style.background = isFreeMode ? "#4CAF50" : "";
    });
}

// 2. Renk Seçimi - sadece rengi güncelle, başka bir şey yapma
if (coloursContainer) {
    coloursContainer.addEventListener("click", (e) => {
        if (!isFreeMode) return;
        const children = Array.from(coloursContainer.children);
        let target = e.target;
        while (target && target !== coloursContainer) {
            const index = children.indexOf(target);
            if (index !== -1) {
                selectedColorIndex = index;
                // Seçili rengi görsel olarak işaretle
                children.forEach(c => c.style.outline = "");
                children[index].style.outline = "3px solid white";
                e.stopImmediatePropagation();
                break;
            }
            target = target.parentNode;
        }
    }, { capture: true });
}

// 3. Canvas piksel koordinatını hesaplayan yardımcı fonksiyon
function getCanvasPixelFromEvent(e) {
    // Oyunun canvas elementini bul
    const canvas = document.querySelector("canvas") || document.getElementById("gameCanvas");
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY);
    if (clientX == null) return null;

    // Canvas üzerindeki piksel oranı (zoom hesabı)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const px = Math.floor((clientX - rect.left) * scaleX);
    const py = Math.floor((clientY - rect.top) * scaleY);

    if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) return null;
    return { x: px, y: py };
}

function paintAtEvent(e) {
    if (!isFreeMode) return;
    const coord = getCanvasPixelFromEvent(e);
    if (!coord) {
        // Fallback: positionIndicator'dan oku
        const text = document.getElementById("positionIndicator")?.innerText ?? "";
        const match = text.match(/\((\d+),\s*(\d+)\)/);
        if (!match) return;
        const x = parseInt(match[1]);
        const y = parseInt(match[2]);
        sendServerMessage("putPixel", { position: x + y * WIDTH, colour: selectedColorIndex });
        return;
    }
    sendServerMessage("putPixel", { position: coord.x + coord.y * WIDTH, colour: selectedColorIndex });
}

// 4. ANINDA BOYAMA
viewport.addEventListener("pointerdown", (e) => {
    if (!isFreeMode) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    isPainting = true;
    paintAtEvent(e);
}, { capture: true });

viewport.addEventListener("pointermove", (e) => {
    if (!isFreeMode || !isPainting) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    paintAtEvent(e);
}, { capture: true });

viewport.addEventListener("pointerup", () => { isPainting = false; });
viewport.addEventListener("pointercancel", () => { isPainting = false; });
