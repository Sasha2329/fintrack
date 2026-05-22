export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function canShowIosInstallHint() {
  return isIosDevice() && !isStandaloneMode();
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const isSecureLocalPwa =
    typeof window !== 'undefined' &&
    (window.isSecureContext || window.location.protocol === 'https:');

  if (!import.meta.env.PROD && !isSecureLocalPwa) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
