// Front/back anatomical body silhouette with highlighted muscle regions.
// Maps broad muscle categories (from exercises.js `muscle` field) to SVG region ids.
const REGION_MAP = {
  Chest:     { front: ['chest'] },
  Back:      { back: ['upperBack', 'lowerBack'] },
  Shoulders: { front: ['frontDelt'], back: ['rearDelt'] },
  Legs:      { front: ['quads'], back: ['hamstrings', 'glutes', 'calves'] },
  Biceps:    { front: ['biceps'] },
  Triceps:   { back: ['triceps'] },
  Core:      { front: ['core'] },
};

const BASE = '#3a4a5c';
const HILITE = '#e94560';

function fill(id, activeIds) {
  return activeIds.includes(id) ? HILITE : BASE;
}

function frontBody(activeIds) {
  return `<svg viewBox="0 0 140 320" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="24" rx="16" ry="18" fill="${BASE}"/>
    <rect x="60" y="40" width="20" height="10" fill="${BASE}"/>
    <path d="M40 50 Q70 42 100 50 L106 110 Q70 122 34 110 Z" fill="${fill('chest', activeIds)}"/>
    <circle cx="38" cy="56" r="13" fill="${fill('frontDelt', activeIds)}"/>
    <circle cx="102" cy="56" r="13" fill="${fill('frontDelt', activeIds)}"/>
    <rect x="24" y="66" width="16" height="50" rx="8" fill="${fill('biceps', activeIds)}"/>
    <rect x="100" y="66" width="16" height="50" rx="8" fill="${fill('biceps', activeIds)}"/>
    <rect x="22" y="116" width="18" height="46" rx="8" fill="${BASE}"/>
    <rect x="100" y="116" width="18" height="46" rx="8" fill="${BASE}"/>
    <path d="M40 112 Q70 124 100 112 L96 168 Q70 180 44 168 Z" fill="${fill('core', activeIds)}"/>
    <path d="M44 168 L96 168 L92 184 L48 184 Z" fill="${BASE}"/>
    <rect x="46" y="184" width="20" height="76" rx="10" fill="${fill('quads', activeIds)}"/>
    <rect x="74" y="184" width="20" height="76" rx="10" fill="${fill('quads', activeIds)}"/>
    <rect x="47" y="260" width="18" height="44" rx="8" fill="${BASE}"/>
    <rect x="75" y="260" width="18" height="44" rx="8" fill="${BASE}"/>
  </svg>`;
}

function backBody(activeIds) {
  return `<svg viewBox="0 0 140 320" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="24" rx="16" ry="18" fill="${BASE}"/>
    <rect x="60" y="40" width="20" height="10" fill="${BASE}"/>
    <path d="M40 50 Q70 42 100 50 L104 96 Q70 106 36 96 Z" fill="${fill('upperBack', activeIds)}"/>
    <path d="M36 96 Q70 106 104 96 L98 150 Q70 160 42 150 Z" fill="${fill('lowerBack', activeIds)}"/>
    <circle cx="38" cy="56" r="13" fill="${fill('rearDelt', activeIds)}"/>
    <circle cx="102" cy="56" r="13" fill="${fill('rearDelt', activeIds)}"/>
    <rect x="24" y="66" width="16" height="50" rx="8" fill="${fill('triceps', activeIds)}"/>
    <rect x="100" y="66" width="16" height="50" rx="8" fill="${fill('triceps', activeIds)}"/>
    <rect x="22" y="116" width="18" height="46" rx="8" fill="${BASE}"/>
    <rect x="100" y="116" width="18" height="46" rx="8" fill="${BASE}"/>
    <path d="M42 150 Q70 160 98 150 L94 184 Q70 194 46 184 Z" fill="${fill('glutes', activeIds)}"/>
    <rect x="46" y="184" width="20" height="50" rx="10" fill="${fill('hamstrings', activeIds)}"/>
    <rect x="74" y="184" width="20" height="50" rx="10" fill="${fill('hamstrings', activeIds)}"/>
    <rect x="47" y="234" width="18" height="70" rx="8" fill="${fill('calves', activeIds)}"/>
    <rect x="75" y="234" width="18" height="70" rx="8" fill="${fill('calves', activeIds)}"/>
  </svg>`;
}

export function bodyDiagram(muscleCategory) {
  const regions = REGION_MAP[muscleCategory] || {};
  const frontIds = regions.front || [];
  const backIds  = regions.back  || [];
  return `<div class="body-diagram">
    <div class="body-diagram-half">${frontBody(frontIds)}<span class="body-diagram-label">Front</span></div>
    <div class="body-diagram-half">${backBody(backIds)}<span class="body-diagram-label">Back</span></div>
  </div>`;
}
