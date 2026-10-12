// No extension runtime on this page, so the engine's own msg() never finds chrome.i18n and falls back to the
// English written in each call. This stub only guards a call that forgets to optional-chain its way to it.
(() => {
  "use strict";
  window.chrome = window.chrome || {};
  window.chrome.i18n = window.chrome.i18n || { getMessage: () => "" };
})();
