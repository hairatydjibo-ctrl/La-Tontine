// Service worker de La Tontine — permet un fonctionnement hors-ligne
// après une première visite en ligne.

const CACHE_NAME = "la-tontine-v1";

// Fichiers de l'app à mettre en cache dès l'installation.
const FICHIERS_APP = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FICHIERS_APP))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(
        noms.filter((nom) => nom !== CACHE_NAME).map((nom) => caches.delete(nom))
      )
    )
  );
  self.clients.claim();
});

// Stratégie : cache d'abord pour l'app shell (rapide + hors-ligne),
// réseau d'abord pour les polices Google externes (avec repli sur le cache).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const estRessourceApp = url.origin === self.location.origin;

  if (estRessourceApp) {
    event.respondWith(
      caches.match(event.request).then((reponseCache) => {
        if (reponseCache) return reponseCache;
        return fetch(event.request)
          .then((reponseReseau) => {
            const copie = reponseReseau.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copie));
            return reponseReseau;
          })
          .catch(() => caches.match("./index.html"));
      })
    );
  } else {
    // Polices et scripts externes (React, Babel, Google Fonts) :
    // on essaie le réseau, on retombe sur le cache si hors-ligne.
    event.respondWith(
      fetch(event.request)
        .then((reponseReseau) => {
          const copie = reponseReseau.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copie));
          return reponseReseau;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
