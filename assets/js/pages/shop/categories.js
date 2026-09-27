import { mountShell } from '../../components/shell.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon } from '../../core/utils.js';
import { categoryTree, productCount } from '../../services/catalog.js';

const main = mountShell({ active: 'categories' });
const tree = categoryTree();

main.innerHTML = `
<div class="container page">
  <nav class="breadcrumb"><a href="${routes.home()}">Home</a>${icon('chevron-right')}<span>All categories</span></nav>
  <div class="page-head"><h1>All categories</h1><p class="muted mt-1">${tree.length} departments · multi-level sub-categories</p></div>
  <div class="cat-blocks">
    ${tree.map((root) => `
      <div class="cat-block">
        <a class="cat-block-head" href="${routes.products({ category: root.id })}">
          <span class="ic">${icon(root.icon || 'folder')}</span>
          <div class="grow"><h3>${escapeHtml(root.name)}</h3><span class="small muted">${productCount(root.id)} products</span></div>
          ${icon('chevron-right', 'muted')}
        </a>
        <div class="cat-block-body">
          ${root.children.map((c) => `
            <div>
              <h4><a href="${routes.products({ category: c.id })}">${escapeHtml(c.name)}</a> <span class="xs muted">(${productCount(c.id)})</span></h4>
              ${c.children.length ? `<div class="chips">${c.children.map((g) => `<a class="chip" href="${routes.products({ category: g.id })}">${escapeHtml(g.name)}</a>`).join('')}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>`).join('')}
  </div>
</div>`;
