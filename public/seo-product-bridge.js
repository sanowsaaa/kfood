// Only HTML pilot responses load this bridge. The original app owns all
// interactive state and re-reads public data before taking over the view.
(() => {
  const preview = document.getElementById('kfood-product-html');
  const root = document.getElementById('root');
  if (!preview || !root) return;
  root.hidden = true;
  preview.querySelectorAll('button').forEach(button => { button.disabled = true; });
  let ended = false;
  const observer = new MutationObserver(check);
  function check() {
    if (ended) return;
    const state = root.querySelector('[data-public-product-state]');
    if (!state || !['ready', 'missing', 'error', 'age'].includes(state.getAttribute('data-public-product-state'))) return;
    ended = true;
    observer.disconnect();
    preview.remove();
    root.hidden = false;
  }
  observer.observe(root, { childList: true, subtree: true });
  check();
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
