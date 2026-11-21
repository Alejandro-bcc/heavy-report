import { useState } from 'react';
import { formatFractionalSets } from '@/services/analytics';
import type { DetailedMuscle } from '@/types/workout';

interface AnatomicalBodyMapProps {
  muscleSets: Record<DetailedMuscle, number>;
  selectedMuscle?: DetailedMuscle | null;
  onSelectMuscle?: (muscle: DetailedMuscle) => void;
  compact?: boolean;
}

/**
 * Interpolates between inactive slate and Heavy's bright blue intensity ramp.
 */
function getMuscleFill(sets: number, maxSets: number): string {
  if (sets <= 0 || maxSets <= 0) return '#252C38';
  const ratio = Math.min(1, Math.max(0.12, sets / maxSets));

  // 4-stop Heavy blue gradient: #1D3E78 -> #1F62CC -> #2F80ED -> #38BDF8
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [29, 62, 120]],
    [0.4, [31, 98, 204]],
    [0.75, [47, 128, 237]],
    [1.0, [56, 189, 248]],
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (ratio >= t0 && ratio <= t1) {
      const local = (ratio - t0) / (t1 - t0 || 1);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * local);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * local);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * local);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return '#38BDF8';
}

export function AnatomicalBodyMap({
  muscleSets,
  selectedMuscle = null,
  onSelectMuscle,
  compact = false,
}: AnatomicalBodyMapProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<DetailedMuscle | null>(null);

  const values = Object.values(muscleSets);
  const maxSets = Math.max(1, ...values);

  const getProps = (muscle: DetailedMuscle) => {
    const sets = muscleSets[muscle] ?? 0;
    const isSelected = selectedMuscle === muscle;
    const isHovered = hoveredMuscle === muscle;
    return {
      fill: getMuscleFill(sets, maxSets),
      stroke: isSelected ? '#FFFFFF' : isHovered ? '#93C5FD' : '#0B0D10',
      strokeWidth: isSelected ? 2 : isHovered ? 1.5 : 1.1,
      className: `transition-colors duration-200 ${onSelectMuscle ? 'cursor-pointer' : ''}`,
      onMouseEnter: () => setHoveredMuscle(muscle),
      onMouseLeave: () => setHoveredMuscle((prev) => (prev === muscle ? null : prev)),
      onClick: onSelectMuscle ? () => onSelectMuscle(muscle) : undefined,
      role: onSelectMuscle ? ('button' as const) : undefined,
      'aria-label': `${muscle}: ${formatFractionalSets(sets)} sets`,
    };
  };

  const activeInfoMuscle = hoveredMuscle ?? selectedMuscle;

  return (
    <div className="flex flex-col items-center w-full select-none">
      <div
        className={`w-full grid grid-cols-2 items-center justify-items-center ${
          compact ? 'gap-2 max-w-[290px]' : 'gap-4 max-w-[380px]'
        }`}
      >
        {/* ================= FRONT (ANTERIOR) ================= */}
        <div className="flex flex-col items-center w-full">
          <svg
            viewBox="0 0 200 420"
            className={`w-full h-auto ${compact ? 'max-h-[215px]' : 'max-h-[340px]'}`}
            aria-label="Front anatomical muscle map"
          >
            {/* Base Body Silhouette (Head, Neck, Hands, Feet, Outline) */}
            <g fill="#1A202A" stroke="#2D3646" strokeWidth="1.2">
              {/* Head */}
              <ellipse cx="100" cy="30" rx="17" ry="21" />
              {/* Neck */}
              <path d="M90 48 L110 48 L113 64 L87 64 Z" />
              {/* Hands */}
              <path d="M27 203 C23 211 22 222 27 228 C32 232 38 226 39 216 L38 202 Z" />
              <path d="M173 203 C177 211 178 222 173 228 C168 232 162 226 161 216 L162 202 Z" />
              {/* Knees */}
              <ellipse cx="77" cy="295" rx="11" ry="9" />
              <ellipse cx="123" cy="295" rx="11" ry="9" />
              {/* Feet */}
              <path d="M67 386 L84 386 L86 404 C86 409 79 412 72 411 C65 410 62 406 64 399 Z" />
              <path d="M133 386 L116 386 L114 404 C114 409 121 412 128 411 C135 410 138 406 136 399 Z" />
              {/* Pelvis center */}
              <path d="M84 195 L116 195 L108 224 L92 224 Z" />
            </g>

            {/* TRAPS (Upper collar) */}
            <g {...getProps('Traps')}>
              <path d="M87 58 C79 63 70 67 63 71 L86 76 L93 64 Z" />
              <path d="M113 58 C121 63 130 67 137 71 L114 76 L107 64 Z" />
            </g>

            {/* SHOULDERS (Anterior & Lateral Delts) */}
            <g {...getProps('Shoulders')}>
              <path d="M64 71 C51 73 43 84 44 102 C48 106 56 105 62 96 C64 88 66 78 64 71 Z" />
              <path d="M136 71 C149 73 157 84 156 102 C152 106 144 105 138 96 C136 88 134 78 136 71 Z" />
            </g>

            {/* CHEST (Pectoralis Major) */}
            <g {...getProps('Chest')}>
              <path d="M99 76 L66 74 C63 87 63 102 68 113 C77 119 91 118 99 112 Z" />
              <path d="M101 76 L134 74 C137 87 137 102 132 113 C123 119 109 118 101 112 Z" />
            </g>

            {/* LATS (Front lateral ribcage flare) */}
            <g {...getProps('Lats')}>
              <path d="M66 114 C64 128 66 142 71 153 L75 137 L74 117 Z" />
              <path d="M134 114 C136 128 134 142 129 153 L125 137 L126 117 Z" />
            </g>

            {/* BICEPS */}
            <g {...getProps('Biceps')}>
              <path d="M46 104 C41 118 39 135 42 149 C47 152 54 149 58 137 C61 124 61 111 58 102 Z" />
              <path d="M154 104 C159 118 161 135 158 149 C153 152 146 149 142 137 C139 124 139 111 142 102 Z" />
            </g>

            {/* FOREARMS */}
            <g {...getProps('Forearms')}>
              <path d="M41 151 C35 166 30 184 28 202 L38 203 C43 187 49 170 53 153 Z" />
              <path d="M159 151 C165 166 170 184 172 202 L162 203 C157 187 151 170 147 153 Z" />
            </g>

            {/* ABDOMINALS (Rectus abdominis + obliques) */}
            <g {...getProps('Abdominals')}>
              {/* Left & Right Obliques */}
              <path d="M71 120 L83 122 L83 185 L71 178 C68 159 68 139 71 120 Z" />
              <path d="M129 120 L117 122 L117 185 L129 178 C132 159 132 139 129 120 Z" />
              {/* 6-pack blocks */}
              <rect x="85" y="120" width="13.5" height="17" rx="4" />
              <rect x="101.5" y="120" width="13.5" height="17" rx="4" />
              <rect x="85" y="140" width="13.5" height="17" rx="4" />
              <rect x="101.5" y="140" width="13.5" height="17" rx="4" />
              <rect x="85" y="160" width="13.5" height="16" rx="4" />
              <rect x="101.5" y="160" width="13.5" height="16" rx="4" />
              <path d="M86 179 L114 179 L109 194 L91 194 Z" />
            </g>

            {/* ABDUCTORS (Outer hip / TFL) */}
            <g {...getProps('Abductors')}>
              <path d="M70 181 C61 194 58 210 60 227 L69 218 L74 194 Z" />
              <path d="M130 181 C139 194 142 210 140 227 L131 218 L126 194 Z" />
            </g>

            {/* ADDUCTORS (Inner thigh) */}
            <g {...getProps('Adductors')}>
              <path d="M91 215 L97 224 C95 247 93 266 89 282 L83 256 L84 224 Z" />
              <path d="M109 215 L103 224 C105 247 107 266 111 282 L117 256 L116 224 Z" />
            </g>

            {/* QUADRICEPS */}
            <g {...getProps('Quadriceps')}>
              <path d="M73 196 L85 206 L86 284 C77 289 67 287 64 276 C58 253 58 228 64 208 Z" />
              <path d="M127 196 L115 206 L114 284 C123 289 133 287 136 276 C142 253 142 228 136 208 Z" />
            </g>

            {/* CALVES (Anterior-medial lower leg contour) */}
            <g {...getProps('Calves')}>
              <path d="M67 306 C62 325 63 352 68 384 L83 384 C87 356 89 331 86 306 Z" />
              <path d="M133 306 C138 325 137 352 132 384 L117 384 C113 356 111 331 114 306 Z" />
            </g>
          </svg>
          <span className="text-[11px] font-medium text-heavy-muted mt-1 tracking-wide uppercase">
            Front
          </span>
        </div>

        {/* ================= BACK (POSTERIOR) ================= */}
        <div className="flex flex-col items-center w-full">
          <svg
            viewBox="0 0 200 420"
            className={`w-full h-auto ${compact ? 'max-h-[215px]' : 'max-h-[340px]'}`}
            aria-label="Back anatomical muscle map"
          >
            {/* Base Body Silhouette */}
            <g fill="#1A202A" stroke="#2D3646" strokeWidth="1.2">
              {/* Head */}
              <ellipse cx="100" cy="30" rx="17" ry="21" />
              {/* Neck */}
              <path d="M90 48 L110 48 L113 62 L87 62 Z" />
              {/* Hands */}
              <path d="M27 203 C23 211 22 222 27 228 C32 232 38 226 39 216 L38 202 Z" />
              <path d="M173 203 C177 211 178 222 173 228 C168 232 162 226 161 216 L162 202 Z" />
              {/* Back of knees */}
              <ellipse cx="77" cy="296" rx="10" ry="7" />
              <ellipse cx="123" cy="296" rx="10" ry="7" />
              {/* Feet */}
              <path d="M67 386 L84 386 L86 404 C86 409 79 412 72 411 C65 410 62 406 64 399 Z" />
              <path d="M133 386 L116 386 L114 404 C114 409 121 412 128 411 C135 410 138 406 136 399 Z" />
            </g>

            {/* TRAPS (Upper & Mid Trapezius Diamond) */}
            <g {...getProps('Traps')}>
              <path d="M88 57 L112 57 L133 72 L117 85 L100 112 L83 85 L67 72 Z" />
            </g>

            {/* SHOULDERS (Posterior Deltoids) */}
            <g {...getProps('Shoulders')}>
              <path d="M66 72 C52 74 44 85 45 103 C50 106 58 104 65 95 C67 87 68 78 66 72 Z" />
              <path d="M134 72 C148 74 156 85 155 103 C150 106 142 104 135 95 C133 87 132 78 134 72 Z" />
            </g>

            {/* UPPER BACK (Rhomboids / Rear Scapula / Teres) */}
            <g {...getProps('Upper Back')}>
              <path d="M67 84 L84 87 L99 114 L99 130 L72 117 C67 107 65 95 67 84 Z" />
              <path d="M133 84 L116 87 L101 114 L101 130 L128 117 C133 107 135 95 133 84 Z" />
            </g>

            {/* LATS (Latissimus Dorsi Wings) */}
            <g {...getProps('Lats')}>
              <path d="M67 108 L98 131 L87 166 L73 162 C65 144 63 126 67 108 Z" />
              <path d="M133 108 L102 131 L113 166 L127 162 C135 144 137 126 133 108 Z" />
            </g>

            {/* TRICEPS */}
            <g {...getProps('Triceps')}>
              <path d="M46 105 C41 119 40 136 43 150 C48 152 55 149 59 136 C62 124 62 111 58 103 Z" />
              <path d="M154 105 C159 119 160 136 157 150 C152 152 145 149 141 136 C138 124 138 111 142 103 Z" />
            </g>

            {/* FOREARMS */}
            <g {...getProps('Forearms')}>
              <path d="M41 151 C35 166 30 184 28 202 L38 203 C43 187 49 170 53 153 Z" />
              <path d="M159 151 C165 166 170 184 172 202 L162 203 C157 187 151 170 147 153 Z" />
            </g>

            {/* LOWER BACK (Erector Spinae) */}
            <g {...getProps('Lower Back')}>
              <path d="M87 140 L99 133 L99 180 L76 178 L79 164 Z" />
              <path d="M113 140 L101 133 L101 180 L124 178 L121 164 Z" />
            </g>

            {/* ABDUCTORS (Glute Medius Outer Hip) */}
            <g {...getProps('Abductors')}>
              <path d="M74 178 C64 185 60 198 61 213 L70 205 L76 187 Z" />
              <path d="M126 178 C136 185 140 198 139 213 L130 205 L124 187 Z" />
            </g>

            {/* GLUTES (Gluteus Maximus) */}
            <g {...getProps('Glutes')}>
              <path d="M75 180 L99 182 L99 224 C85 230 69 225 64 212 C62 199 67 187 75 180 Z" />
              <path d="M125 180 L101 182 L101 224 C115 230 131 225 136 212 C138 199 133 187 125 180 Z" />
            </g>

            {/* ADDUCTORS (Inner Posterior Thigh) */}
            <g {...getProps('Adductors')}>
              <path d="M92 227 L98 227 C96 250 94 268 90 284 L85 262 Z" />
              <path d="M108 227 L102 227 C104 250 106 268 110 284 L115 262 Z" />
            </g>

            {/* HAMSTRINGS */}
            <g {...getProps('Hamstrings')}>
              <path d="M65 219 C73 229 84 231 92 228 L87 288 C78 292 69 289 65 280 C59 260 59 237 65 219 Z" />
              <path d="M135 219 C127 229 116 231 108 228 L113 288 C122 292 131 289 135 280 C141 260 141 237 135 219 Z" />
            </g>

            {/* CALVES (Gastrocnemius & Soleus) */}
            <g {...getProps('Calves')}>
              <path d="M67 305 C60 322 61 344 68 384 L83 384 C88 354 91 326 86 305 C80 301 73 301 67 305 Z" />
              <path d="M133 305 C140 322 139 344 132 384 L117 384 C112 354 109 326 114 305 C120 301 127 301 133 305 Z" />
            </g>
          </svg>
          <span className="text-[11px] font-medium text-heavy-muted mt-1 tracking-wide uppercase">
            Back
          </span>
        </div>
      </div>

      {/* Interactive Status Pill & Intensity Legend */}
      {!compact && (
        <div className="mt-4 w-full flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="text-xs text-heavy-muted min-h-[20px]">
            {activeInfoMuscle ? (
              <span className="inline-flex items-center gap-1.5 text-white font-medium">
                <span className="w-2 h-2 rounded-full bg-heavy-blue-bright" />
                {activeInfoMuscle}:{' '}
                <span className="text-heavy-blue-bright font-mono">
                  {formatFractionalSets(muscleSets[activeInfoMuscle] ?? 0)} sets
                </span>
              </span>
            ) : (
              <span>Click any muscle to filter history</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-heavy-subtle">
            <span>0</span>
            <span className="w-3.5 h-2 rounded-sm bg-[#252C38]" />
            <span className="w-3.5 h-2 rounded-sm bg-[#1D3E78]" />
            <span className="w-3.5 h-2 rounded-sm bg-[#2F80ED]" />
            <span className="w-3.5 h-2 rounded-sm bg-[#38BDF8]" />
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  );
}
