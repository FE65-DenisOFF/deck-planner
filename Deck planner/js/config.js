// DECK GEOMETRY
var DECK_COORDS = { minX: -5.75, maxX: 44.3, minY: -7.5, maxY: 7.5 };
var DECK_W = DECK_COORDS.maxX - DECK_COORDS.minX; // 50.05
var DECK_H = DECK_COORDS.maxY - DECK_COORDS.minY; // 15

// What to draw on each container by default (per-container overridable via "Details")
var DEFAULT_DISPLAY = { seq: true, id: true, weight: false, imdg: true, temp: true };

// Prefixes that can be toggled on the deck (global checkboxes)
var PREFIX_LIST = ['SARF', 'SEIC', 'ERAU', 'OHS', 'CSL', 'SAW', 'MOOU'];
// Defaults mirror current look; MOOU is hidden by default (number only)
var DEFAULT_PREFIX_DISPLAY = { SARF: false, SEIC: false, ERAU: true, OHS: false, CSL: true, SAW: true, MOOU: false };
var prefixDisplay = null; // filled by display.js from localStorage
function prefixOn(pfx) { var pd = prefixDisplay || DEFAULT_PREFIX_DISPLAY; return !!pd[pfx]; }

var DEST_PALETTE = [
    { label: 'LUN-A',       keys: ['LUN-A','LUN','LUNA'],         color: '#7FA8D8' },
    { label: 'MPQ',         keys: ['MPQ'],                        color: '#92D050' },
    { label: 'Molikpaq',    keys: ['MOLIKPAQ','MOLIK'],           color: '#92D050' },
    { label: 'PA-B',        keys: ['PA-B','PAB','PA B'],          color: '#FFE900' },
    { label: 'Kholmsk',     keys: ['KHOLMSK','KOLMSK'],           color: '#00B050' },
    { label: 'S.Makarov',   keys: ['S.MAKAROV','MAKAROV'],        color: '#A6A6A6' },
    { label: 'F.Ushakov',   keys: ['F.USHAKOV','USHAKOV'],        color: '#C0504D' },
    { label: 'G.Nevelskoy', keys: ['G.NEVELSKOY','NEVELSKOY'],    color: '#000000' },
    { label: 'Y.Primakov',  keys: ['Y.PRIMAKOV','PRIMAKOV'],      color: '#F79646' }
];

var PLANNED_COLOR = 'rgba(255,255,255,0.16)';
var DEST_FALLBACK_COLOR = '#555555';