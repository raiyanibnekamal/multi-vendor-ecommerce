import { escapeHtml } from '../core/utils.js';
import { categoryTree } from '../services/catalog.js';

/** <option>s for leaf categories, grouped by their top-level department. */
export function categoryOptions(selected = '') {
  const leaves = (node, trail) => (node.children.length ? node.children.flatMap((c) => leaves(c, [...trail, c.name])) : [{ id: node.id, label: trail.join(' › ') }]);
  return categoryTree().map((root) => `
    <optgroup label="${escapeHtml(root.name)}">
      ${root.children.flatMap((c) => leaves(c, [c.name])).map((l) => `<option value="${l.id}" ${l.id === selected ? 'selected' : ''}>${escapeHtml(l.label)}</option>`).join('')}
    </optgroup>`).join('');
}

/** Reads an image file and downsizes it to a JPEG data URL small enough for localStorage. */
export function imageToDataUrl(file, max = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
