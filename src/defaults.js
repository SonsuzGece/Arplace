import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gbtxljdoptlpqrkekyxj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidHhsamRvcHRscHFya2VreXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MzA2NDgsImV4cCI6MjA5MjIwNjY0OH0.WBTg_iHMEr9RpT0K-mUl13DRhzrjIiFP0Q1rpBb5wDM'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const DEFAULT_SERVER = ""
export const DEFAULT_BOARD = ""
export const DEFAULT_BOARD_FALLBACK = ""
export const DEFAULT_AUTH = "https://server.rplace.live/auth"

export const CHAT_COLOURS = ["lightblue", "navy", "green", "purple", "grey", "brown", "orangered", "gold"]
export const VERIFIED_APP_HASH = "90e58b1f2c5fb98f74962806b85c2d7d3f7b18be8abe7a04f21e939868625357"
export const DEFAULT_PALETTE_KEYS = "123456789abcdefghijklmnopqrstuvwxyz"

export const EMOJIS = new Map([ ["tr", "🇹🇷"], ["turkey", "🇹🇷"], ["heart", "❤️"], ["smile", "😊"] ])
export const CUSTOM_EMOJIS = new Map([ ["rplace", '<img src="custom_emojis/rplace.png" height="24">'] ])
export const COMMANDS = new Map([ ["help", "Yardım"], ["name", "İsim değiştir"] ])

export const LANG_INFOS = new Map([
	["tr", { name: "Türkçe", flag: "https://openmoji.org/data/color/svg/1F1F9-1F1F7.svg" }],
	["en", { name: "English", flag: "https://openmoji.org/data/color/svg/1F1EC-1F1E7.svg" }]
])

// İŞTE TEMA HATASINI ÇÖZEN KISIM (2022 Geri Döndü)
export const DEFAULT_THEMES = new Map([
	["r/place 2022", { id: "r/place 2022", css: "/css/rplace-2022.css", cssVersion: "25", pixelselect: "/svg/pixel-select-2022.svg" }],
	["r/place 2023", { id: "r/place 2023", css: "/css/rplace-2023.css", cssVersion: "25", pixelselect: "/svg/pixel-select-2023.svg" }]
])

export const DEFAULT_EFFECTS = new Map([ [ "darkplace", { id: "darkplace", modulePath: "./effects/darkplace.js" } ] ])
export const ADS = [ { url: "https://sonsuzgece.github.io/Arplace/", banners: { en: "/images/texel.png" } } ]

export const PUNISHMENT_STATE = Object.freeze({ mute: 0, ban: 1, appealRejected: 2 });
export const PLACEMENT_MODE = Object.freeze({ selectPixel: 0, selectPixelMouseOnly: 1, freeDraw: 2 });
export const VIEWPORT_MODE = Object.freeze({ placePixels: 0, selectPixels: 1 });
export const RENDERER_TYPE = Object.freeze({ BoardRenderer: 0, BoardRenderer3D: 1, BoardRendererMesh: 2, BoardRendererSphere: 3 });

export const MAX_CHANNEL_MESSAGES = 100
export const DEFAULT_PALETTE_USABLE_REGION = { start: 0, end: 32 };
export const DEFAULT_PALETTE = [0xff1a006d, 0xff3900be, 0xff0045ff, 0xff00a8ff, 0xff35d6ff, 0xffb8f8ff, 0xff68a300, 0xff78cc00, 0xff56ed7e, 0xff6f7500, 0xffaa9e00, 0xffc0cc00, 0xffa45024, 0xffea9036, 0xfff4e951, 0xffc13a49, 0xffff5c6a, 0xffffb394, 0xff9f1e81, 0xffc04ab4, 0xffffabe4, 0xff7f10de, 0xff8138ff, 0xffaa99ff, 0xff2f486d, 0xff26699c, 0xff70b4ff, 0xff000000, 0xff525251, 0xff908d89, 0xffd9d7d4, 0xffffffff];
export const DEFAULT_WIDTH = 2000;
export const DEFAULT_HEIGHT = 2000;
export const DEFAULT_COOLDOWN = 0; 
