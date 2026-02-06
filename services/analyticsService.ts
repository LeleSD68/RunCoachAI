
// services/analyticsService.ts

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

let isInitialized = false;

export const initGA = (measurementId: string) => {
  if (!measurementId) {
    return;
  }

  // Se già presente (es. ricaricamento pagina o cambio ID), configuriamo solo
  if (isInitialized || document.getElementById('ga-script')) {
    if (typeof window.gtag === 'function') {
        window.gtag('config', measurementId);
    }
    return;
  }

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]){window.dataLayer.push(arguments);}
  (window as any).gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId);
  
  isInitialized = true;
  console.log(`GA initialized with ID: ${measurementId}`);
};

export const logEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};

export const logPageView = (pageName: string) => {
    logEvent('page_view', { page_title: pageName, page_path: `/${pageName.toLowerCase().replace(/\s/g, '-')}` });
};
