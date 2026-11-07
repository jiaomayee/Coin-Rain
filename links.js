/* Allowlisted external links for Coin-Rain.
 *
 * The renderer never sends a raw URL across the IPC boundary: it only sends a
 * key, and the main process resolves that key here before calling
 * shell.openExternal or writing to the clipboard. Every entry must be https
 * and hosted on one of the domains we own/use, so an injected renderer string
 * cannot make the app open an arbitrary protocol or site.
 */
'use strict';

// Null prototype: even keys like "__proto__" or "constructor" cannot resolve
// to an inherited value.
const LINKS = Object.freeze(Object.assign(Object.create(null), {
  repo: 'https://github.com/jiaomayee/Coin-Rain',
  license: 'https://github.com/jiaomayee/Coin-Rain/blob/main/LICENSE',
  issues: 'https://github.com/jiaomayee/Coin-Rain/issues',
  workbuddy: 'https://www.workbuddy.cn/'
}));

const ALLOWED_HOSTS = Object.freeze([
  'github.com', 'www.github.com', 'www.workbuddy.cn'
]);

function resolve(key) {
  const url = LINKS[key];
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && ALLOWED_HOSTS.indexOf(parsed.hostname) !== -1) {
      return url;
    }
  } catch (_) {
    return null;
  }
  return null;
}

module.exports = { LINKS, resolve };
