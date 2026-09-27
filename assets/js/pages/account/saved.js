import { mountAccount } from './accountLayout.js';
import { reelThumb, emptyState, loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { getSavedReels } from '../../services/reels.js';

const el = mountAccount('saved', 'Saved reels');

if (el) {
  el.innerHTML = loading();
  getSavedReels().then((reels) => {
    el.innerHTML = `
      <div class="row-between mb-2"><h2>Saved reels</h2><span class="muted small">${reels.length} saved</span></div>
      ${reels.length ? `<div class="reel-grid">${reels.map(reelThumb).join('')}</div>` : emptyState('bookmark', 'No saved reels', 'Tap the bookmark on any reel to watch it later.', `<a class="btn btn-primary" href="${routes.reels()}">Watch reels</a>`)}`;
  });
}
