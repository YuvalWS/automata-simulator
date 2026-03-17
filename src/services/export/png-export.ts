import type { AutomatonState } from '@/models/automaton';

const STATE_RADIUS = 28;
const EXPORT_PADDING = 60;
const EXPORT_SCALE = 2;

/**
 * Compute tight bounding box around all states.
 */
function computeBBox(states: AutomatonState[]) {
  if (states.length === 0) return { x: 0, y: 0, width: 200, height: 200 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of states) {
    if (s.position.x < minX) minX = s.position.x;
    if (s.position.y < minY) minY = s.position.y;
    if (s.position.x > maxX) maxX = s.position.x;
    if (s.position.y > maxY) maxY = s.position.y;
  }

  const margin = STATE_RADIUS + EXPORT_PADDING;
  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + 2 * margin,
    height: maxY - minY + 2 * margin,
  };
}

/**
 * Resolve CSS custom properties on the current page and build a <style> block.
 */
function buildInlineStyleBlock(): string {
  const computed = getComputedStyle(document.documentElement);
  const props: string[] = [];

  // Extract all --color-* and --font-* custom properties
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
          for (let i = 0; i < rule.style.length; i++) {
            const name = rule.style[i]!;
            if (name.startsWith('--')) {
              const value = computed.getPropertyValue(name).trim();
              if (value) props.push(`${name}: ${value};`);
            }
          }
        }
      }
    } catch {
      // Cross-origin stylesheets may throw
    }
  }

  return `:root { ${props.join(' ')} }`;
}

/**
 * Export the automaton diagram as a PNG file.
 */
export async function exportAutomatonAsPng(
  svgElement: SVGSVGElement,
  states: AutomatonState[],
  filename = 'automaton.png',
): Promise<void> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Remove grid pattern and background rect
  const defs = clone.querySelector('defs');
  const gridPattern = clone.querySelector('#grid-pattern');
  if (gridPattern) gridPattern.remove();
  const gridRect = clone.querySelector('rect[fill="url(#grid)"]');
  if (gridRect) gridRect.remove();
  // Remove GridBackground component (pattern + rect)
  const gridBg = clone.querySelector('pattern');
  if (gridBg) gridBg.remove();
  // Remove any remaining grid fill rects
  clone.querySelectorAll('rect').forEach((rect) => {
    const fill = rect.getAttribute('fill');
    if (fill && fill.includes('url(#grid')) rect.remove();
  });

  // Remove snap guide lines (dashed alignment lines)
  clone.querySelectorAll('line[stroke-dasharray]').forEach((el) => el.remove());

  // Remove hover hint
  clone.querySelectorAll('.canvas-add-hint').forEach((el) => el.remove());

  // Remove ghost edge
  clone.querySelectorAll('.ghost-edge').forEach((el) => el.remove());

  // Remove transition handles (small blue circles for drag)
  clone.querySelectorAll('.state-transition-handle').forEach((el) => el.remove());

  // Compute bounding box and set viewBox
  const bbox = computeBBox(states);
  clone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
  clone.setAttribute('width', String(bbox.width * EXPORT_SCALE));
  clone.setAttribute('height', String(bbox.height * EXPORT_SCALE));

  // Remove the pan/zoom transform on the inner <g>
  const innerG = clone.querySelector('g[transform]');
  if (innerG) innerG.removeAttribute('transform');

  // Inject resolved CSS variables as inline <style>
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = buildInlineStyleBlock();
  if (defs) {
    defs.appendChild(styleEl);
  } else {
    clone.insertBefore(styleEl, clone.firstChild);
  }

  // Add white/dark background rect
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-canvas-bg').trim() || '#fafafa';
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', String(bbox.x));
  bgRect.setAttribute('y', String(bbox.y));
  bgRect.setAttribute('width', String(bbox.width));
  bgRect.setAttribute('height', String(bbox.height));
  bgRect.setAttribute('fill', bgColor);
  // Insert before all other content
  const firstG = clone.querySelector('g');
  if (firstG) {
    firstG.insertBefore(bgRect, firstG.firstChild);
  }

  // Serialize to SVG string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // Render to canvas
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = bbox.width * EXPORT_SCALE;
      canvas.height = bbox.height * EXPORT_SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create PNG blob'));
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}
