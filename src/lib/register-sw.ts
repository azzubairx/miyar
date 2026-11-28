export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        /* A failed registration must not affect the app. */
      });
  });
}
