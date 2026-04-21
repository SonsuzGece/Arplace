import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gbtxljdoptlpqrkekyxj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidHhsamRvcHRscHFya2VreXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MzA2NDgsImV4cCI6MjA5MjIwNjY0OH0.WBTg_iHMEr9RpT0K-mUl13DRhzrjIiFP0Q1rpBb5wDM'

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * @constant {string} DEFAULT_SERVER
 */
export const DEFAULT_SERVER = "wss://server.rplace.live"
/**
 * @constant {string} DEFAULT_BOARD
 */
export const DEFAULT_BOARD = "https://raw.githubusercontent.com/rplacelive/canvas1/main/place"
/**
 * @constant {string} DEFAULT_BOARD_FALLBACK
 */
export const DEFAULT_BOARD_FALLBACK = "https://server.rplace.live/public/place"

/**
 * @constant {string} DEFAULT_AUTH
 */
export const DEFAULT_AUTH = "https://server.rplace.live/auth"


/**
 * @constant {string[]} CHAT_COLOURS
 * List of predefined colours for chat usernames.
 */
export const CHAT_COLOURS = ["lightblue", "navy", "green", "purple", "grey", "brown", "orangered", "gold"]

/**
 * @constant {string} VERIFIED_APP_HASH
 * SHA256 hash used to verify the integrity of the application.
 */
export const VERIFIED_APP_HASH = "90e58b1f2c5fb98f74962806b85c2d7d3f7b18be8abe7a04f21e939868625357"

/**
 * @constant {string} DEFAULT_PALETTE_KEYS
 * String containing the default palette keys used in the app.
 */
export const DEFAULT_PALETTE_KEYS = "123456789abcdefghijklmnopqrstuvwxyz"

/**
 * @typedef {Map<string, string>} EmojiMap
 */

/**
 * @constant {EmojiMap} EMOJIS
 */
export const EMOJIS = new Map([
	["rofl", "🤣"],
	["joy", "😂"],
	["cool", "😎"],
	["sunglasses", "😎"],
	["heart", "❤️"],
	["moyai", "🗿"],
	["bruh", "🗿"],
	["skull", "💀"],
	["sus", "ඞ"],
	["tr", "🇹🇷"],
	["turkey", "🇹🇷"],
	["ir", "🇮🇷"],
	["iran", "🇮🇷"],
	["gb", "🇬🇧"],
	["britain", "🇬🇧"],
	["us", "🇺🇸"],
	["america", "🇺🇸"],
	["ru", "🇷🇺"],
	["russia", "🇷🇺"],
	["es", "🇪🇸"],
	["spain", "🇪🇸"],
	["eyes", "👀"],
	["fire", "🔥"],
	["thumbsup", "👍"],
	["thumbsdown", "👎"],
	["clown", "🤡"],
	["facepalm", "🤦‍♂️"],
	["ok", "👌"],
	["poop", "💩"],
	["rocket", "🚀"],
	["tada", "🎉"],
	["celebration", "🎉"],
	["moneybag", "💰"],
	["crown", "👑"],
	["muscle", "💪"],
	["beer", "🍺"],
	["pizza", "🍕"],
	["cookie", "🍪"],
	["balloon", "🎈"],
	["gift", "🎁"],
	["star", "⭐️"],
	["love", "😍"],
	["crying", "😢"],
	["angry", "😠"],
	["sleepy", "😴"],
	["nerd", "🤓"],
	["laughing", "😆"],
	["vomiting", "🤮"],
	["unicorn", "🦄"],
	["alien", "👽"],
	["ghost", "👻"],
	["skullcrossbones", "☠️"],
	["explosion", "💥"],
	["shush", "🤫"],
	["deaf", "🧏"],
	["mew", "🤫🧏"],
	["pray", "🙏"],
	["thinking", "🤔"],
	["sweat", "😅"],
	["wave", "👋"]
])

/**
 * @typedef {Map<string, string>} CustomEmojiMap
 */

/**
 * @constant {CustomEmojiMap} CUSTOM_EMOJIS
 */
export const CUSTOM_EMOJIS = new Map([
	["amogus", '<img src="custom_emojis/amogus.png" height="24">'],
	["biaoqing", '<img src="custom_emojis/biaoqing.png" height="24">'],
	["deepfriedh", '<img src="custom_emojis/deepfriedh.png" height="24">'],
	["edp445", '<img src="custom_emojis/edp445.png" height="24">'],
	["fan", '<img src="custom_emojis/fan.png" height="24">'],
	["heavy", '<img src="custom_emojis/heavy.png" height="24">'],
	["herkul", '<img src="custom_emojis/herkul.png" height="24">'],
	["kaanozdil", '<img src="custom_emojis/kaanozdil.png" height="24">'],
	["lowtiergod", '<img src="custom_emojis/lowtiergod.png" height="24">'],
	["manly", '<img src="custom_emojis/manly.png" height="24">'],
	["plsaddred", '<img src="custom_emojis/plsaddred.png" height="24">'],
	["rplace", '<img src="custom_emojis/rplace.png" height="24">'],
	["rplacediscord", '<img src="custom_emojis/rplacediscord.png" height="24">'],
	["sonic", '<img src="custom_emojis/sonic.png" height="24">'],
	["transparent", '<img src="custom_emojis/transparent.png" height="24">'],
	["trollface", '<img src="custom_emojis/trollface.png" height="24">']
])

/**
 * @typedef {Map<string, string>} CommandMap
 */

/**
 * @constant {CommandMap} COMMANDS
 */
export const COMMANDS = new Map([
	["help", "<kbd>Help information for live chat</kbd>"],
	["name", "<kbd>Change your username</kbd>"],
	["vip", "<kbd>Apply a VIP code</kbd>"],
	["getid", "<kbd>View your own User Id, or provide a name to view a list of online player User Ids</kbd>"],
	["whoplaced", "<kbd>View details of who placed the current pixel being hovered</kbd>"]
])

/**
 * @typedef {Object} LangInfo
 * @property {string} name - Name of the language.
 * @property {string} flag - URL of the flag representing the language.
 * @property {boolean} [rtl] - Indicates if the language is read from right to left.
 */

/**
 * Flag emojis all sourced from openmoji.org, https://www.langoly.com/most-spoken-languages/
 * @constant {Map<string, LangInfo>} LANG_INFOS
 */
export const LANG_INFOS = new Map([
	["en", { name: "English", flag: "https://openmoji.org/data/color/svg/1F1EC-1F1E7.svg" }],
	["zh", { name: "中文", flag: "https://openmoji.org/data/color/svg/1F1E8-1F1F3.svg" }],
	["hi", { name: "हिन्दी", flag: "https://openmoji.org/data/color/svg/1F1EE-1F1F3.svg" }],
	["es", { name: "Español", flag: "https://openmoji.org/data/color/svg/1F1EA-1F1F8.svg" }],
	["fr", { name: "Français", flag: "https://openmoji.org/data/color/svg/1F1EB-1F1F7.svg" }],
	["ar", { name: "عربي", flag: "https://openmoji.org/data/color/svg/1F1F8-1F1E6.svg", rtl: true }],
	["bn", { name: "বাংলা", flag: "https://openmoji.org/data/color/svg/1F1EE-1F1F3.svg" }],
	["ru", { name: "pусский", flag: "https://openmoji.org/data/color/svg/1F1F7-1F1FA.svg" }],
	["pt", { name: "Português", flag: "https://openmoji.org/data/color/svg/1F1E7-1F1F7.svg" }],
	["ur", { name: "اردو", flag: "https://openmoji.org/data/color/svg/1F1F5-1F1F0.svg", rtl: true }],
	["de", { name: "Deutsch", flag: "https://openmoji.org/data/color/svg/1F1E9-1F1EA.svg" }],
	["jp", { name: "日本語", flag: "https://openmoji.org/data/color/svg/1F1EF-1F1F5.svg" }],
	["tr", { name: "Türkçe", flag: "https://openmoji.org/data/color/svg/1F1F9-1F1F7.svg" }],
	["vi", { name: "Tiếng Việt", flag: "https://openmoji.org/data/color/svg/1F1FB-1F1F3.svg" }],
	["ko", { name: "한국인", flag: "https://openmoji.org/data/color/svg/1F1F0-1F1F7.svg" }],
	["it", { name: "Italiana", flag: "https://openmoji.org/data/color/svg/1F1EE-1F1F9.svg" }],
	["fa", { name: "فارسی", flag: "https://openmoji.org/data/color/svg/1F1EE-1F1F7.svg", rtl: true }],
	["nl", { name: "Nederland", flag: "https://openmoji.org/data/color/svg/1F1F3-1F1F1.svg"}],
	["az", { name: "Azərbaycan", flag: "https://openmoji.org/data/color/svg/1F1E6-1F1FF.svg", rtl: true }],
])


/**
 * @typedef {Record<string, string>} ThemeInfo
 * @property {string} id - Theme ID.
 * @property {string} css - CSS file path for the theme.
 * @property {string} cssVersion - Version of the CSS file.
 * @property {string} pixelselect - Path to the pixel selection SVG.
 */

/**
 * @constant {Map<string, ThemeInfo>} DEFAULT_THEMES
 */
export const DEFAULT_THEMES = new Map([
	["r/place 2022", { id: "r/place 2022", css: "css/rplace-2022.css", cssVersion: "25", pixelselect: "svg/pixel-select-2022.svg" }],
	["r/place 2023", { id: "r/place 2023", css: "css/rplace-2023.css", cssVersion: "25", pixelselect: "svg/pixel-select-2023.svg" }]
])

/**
 * @typedef {Record<string, string>} EffectInfo
 * @property {string} id - Effect ID.
 * @property {string} module - Effect module sources.
 * @property {string} version - Version of effect sources.
 */

/**
 * @constant {Map<string, EffectInfo>} DEFAULT_THEMES
 */
export const DEFAULT_EFFECTS = new Map([
	[ "darkplace", { id: "darkplace", modulePath: "./effects/darkplace.js" } ],
	[ "winter", { id: "winter", modulePath: "./effects/snowplace.js" } ]
])

/**
 * @typedef {Object} AdInfo
 * @property {string} url - URL of the ad.
 * @property {Record<string, string>} banners - Map of banners for different languages.
 */

/**
 * @constant {AdInfo[]} ADS
 */
export const ADS = [
	{ url: "https://texel.pages.dev", banners: { en: "images/texel.png" } }
]

/**
 * @typedef {Object<string, number>} PunishmentState
 * @property {number} mute - Mute state.
 * @property {number} ban - Ban state.
 * @property {number} appealRejected - Appeal rejected state.
 */

/**
 * @enum {number} PUNISHMENT_STATE
 * @property {number} mute - User is muted.
 * @property {number} ban - User is banned.
 * @property {number} appealRejected - User's appeal was rejected.
 */
export const PUNISHMENT_STATE = Object.freeze({
	mute: 0,
	ban: 1,
	appealRejected: 2
});
/**
 * @enum {number}
 * @property {number} selectPixel - Allow selecting pixels with cursor and keyboard navigation.
 * @property {number} selectPixelMouseOnly - Only allow cursor navigation in order to select pixels.
 * @property {number} freeDraw - Freehand drawing mode.
 */
export const PLACEMENT_MODE = Object.freeze({
	selectPixel: 0,
	selectPixelMouseOnly: 1,
	freeDraw: 2
});
/**
 * @enum {number}
 * @property {number} placePixels - Standard place pixels viewport mode.
 * @property {number} selectPixels - Select pixel regions.
 */
export const VIEWPORT_MODE = Object.freeze({
	placePixels: 0,
	selectPixels: 1
});
/**
 * @enum {number}
 */
export const RENDERER_TYPE = Object.freeze({
	BoardRenderer: 0,
	BoardRenderer3D: 1,
	BoardRendererMesh: 2,
	BoardRendererSphere: 3
});

/**
 * @constant {number} MAX_CHANNEL_MESSAGES
 */
export const MAX_CHANNEL_MESSAGES = 100

// Canvas defaults
export const DEFAULT_PALETTE_USABLE_REGION = { start: 0, end: 32 };

// --- 4x8 IZGARAYA GÖRE HESAPLANMIŞ VE GÜNCELLENMİŞ 32'LİK RENK PALETİ ---
export const DEFAULT_PALETTE = [
	// 1. Satır: Siyah, Koyu Gri, Gri, Açık Gri, Daha Açık Gri, Beyaz, Açık Pembe, Kırmızı
	0xff000000, 0xff747474, 0xff5c5c5c, 0xff8c8c8c, 0xffdcdcdc, 0xffffffff, 0xff8ca0ff, 0xff3738cf,
	
	// 2. Satır: Pembe/Kırmızı, Bordo, Koyu Bordo, Turuncu, Açık Yeşil (Lime), Çimen Yeşili, Koyu Yeşil, Mavi/Lacivert
	0xff4318e4, 0xff00009c, 0xff000078, 0xff0062ff, 0xff8affc2, 0xff70d481, 0xff326f00, 0xffa4563a,
	
	// 3. Satır: Mavi, Açık Mavi, Turkuaz, Eflatun/Lila, Mor, Fuşya/Pembe, Turuncu/Sarımsı, Sarı
	0xffcf9b6b, 0xffebd382, 0xffffff00, 0xffff9df3, 0xffff4bf0, 0xff8931eb, 0xff0096ff, 0xff00d1ff,
	
	// 4. Satır: Kahverengi, Ten Rengi / Şeftali, Lacivert, Kum Rengi, Neon Yeşil, Teal / Deniz Mavisi, İndigo / Koyu Mor, Altın Sarısı
	0xff00395c, 0xffaaccff, 0xff800000, 0xff8cb4d2, 0xff00ff00, 0xff808000, 0xff82004b, 0xff00d7ff
];

export const DEFAULT_WIDTH = 2000;
export const DEFAULT_HEIGHT = 2000;
export const DEFAULT_COOLDOWN = 0;
