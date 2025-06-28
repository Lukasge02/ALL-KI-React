/**
 * 📱 ALL-KI SERVICE WORKER
 * Progressive Web App support with caching and offline functionality
 * 
 * EINFÜGEN IN: public/sw.js
 */

const CACHE_NAME = 'all-ki-v2.0.0';
const STATIC_CACHE = 'all-ki-static-v2.0.0';
const DYNAMIC_CACHE = 'all-ki-dynamic-v2.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/dashboard',
    '/chat',
    '/widgets',
    '/css/dashboard.css',
    '/js/dashboard.js',
    '/js/chat.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
    '/api/profiles',
    '/api/health',
    '/api/users/preferences'
];

// ========================================
// INSTALL EVENT
// ========================================
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('📦 Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('✅ Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker: Cache failed', error);
            })
    );
});

// ========================================
// ACTIVATE EVENT
// ========================================
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== CACHE_NAME) {
                            console.log(`🗑️ Service Worker: Deleting old cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// ========================================
// FETCH EVENT - CACHING STRATEGIES
// ========================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // API Endpoints - Network First with Cache Fallback
    if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }
    
    // Static assets - Cache First
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }
    
    // Pages - Stale While Revalidate
    if (isPageRequest(url)) {
        event.respondWith(staleWhileRevalidateStrategy(request));
        return;
    }
    
    // Default - Network with Cache Fallback
    event.respondWith(networkWithCacheFallback(request));
});

// ========================================
// CACHING STRATEGIES
// ========================================

// Network First - Fresh data preferred, cache as fallback
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('🌐 Service Worker: Network failed, trying cache');
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for API requests
        return createOfflineResponse(request);
    }
}

// Cache First - Fast loading from cache, network as fallback
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('❌ Service Worker: Failed to fetch:', request.url);
        throw error;
    }
}

// Stale While Revalidate - Serve cache immediately, update in background
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Fetch and update cache in background
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => null);
    
    // Return cached version immediately if available
    return cachedResponse || fetchPromise;
}

// Network with Cache Fallback
async function networkWithCacheFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || createOfflineResponse(request);
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function isStaticAsset(url) {
    return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/);
}

function isPageRequest(url) {
    return url.pathname.match(/^\/($|dashboard|chat|widgets|profile)/);
}

function createOfflineResponse(request) {
    const url = new URL(request.url);
    
    // For API requests, return JSON error
    if (url.pathname.startsWith('/api/')) {
        return new Response(
            JSON.stringify({
                error: 'Offline - Keine Internetverbindung',
                offline: true,
                timestamp: new Date().toISOString()
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
    
    // For pages, return offline HTML
    return new Response(
        createOfflineHTML(),
        {
            status: 200,
            statusText: 'OK',
            headers: {
                'Content-Type': 'text/html'
            }
        }
    );
}

function createOfflineHTML() {
    return `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>All-KI - Offline</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #0a0a0a 0%, #151515 50%, #1f1f1f 100%);
                    color: white;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                }
                .offline-container {
                    text-align: center;
                    max-width: 400px;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                .offline-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .offline-message {
                    margin-bottom: 2rem;
                    opacity: 0.8;
                    line-height: 1.6;
                }
                .retry-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                }
                .retry-btn:hover {
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📡</div>
                <h1 class="offline-title">Offline-Modus</h1>
                <p class="offline-message">
                    Du bist derzeit nicht mit dem Internet verbunden. 
                    Einige Funktionen sind möglicherweise nicht verfügbar.
                </p>
                <button class="retry-btn" onclick="window.location.reload()">
                    Erneut versuchen
                </button>
            </div>
        </body>
        </html>
    `;
}

// ========================================
// BACKGROUND SYNC
// ========================================
self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: Background sync triggered');
    
    if (event.tag === 'background-sync') {
        event.waitUntil(handleBackgroundSync());
    }
});

async function handleBackgroundSync() {
    try {
        // Sync pending data when connection is restored
        const pendingRequests = await getPendingRequests();
        
        for (const request of pendingRequests) {
            try {
                await fetch(request);
                await removePendingRequest(request);
            } catch (error) {
                console.log('🔄 Service Worker: Sync request failed:', error);
            }
        }
    } catch (error) {
        console.error('❌ Service Worker: Background sync failed:', error);
    }
}

// ========================================
// PUSH NOTIFICATIONS
// ========================================
self.addEventListener('push', (event) => {
    console.log('📩 Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'Neue Nachricht von All-KI',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'all-ki-notification',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Öffnen',
                icon: '/icon-explore.png'
            },
            {
                action: 'close',
                title: 'Schließen',
                icon: '/icon-close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('All-KI', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/dashboard')
        );
    }
});

// ========================================
// CACHE MANAGEMENT
// ========================================

// Clean up old cache entries
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_CLEANUP') {
        event.waitUntil(cleanupOldCaches());
    }
});

async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
        name !== STATIC_CACHE && 
        name !== DYNAMIC_CACHE && 
        name !== CACHE_NAME
    );
    
    return Promise.all(
        oldCaches.map(name => caches.delete(name))
    );
}

// ========================================
// UTILITY FUNCTIONS FOR PENDING REQUESTS
// ========================================

async function getPendingRequests() {
    // Implementation depends on your IndexedDB or storage solution
    return [];
}

async function removePendingRequest(request) {
    // Implementation depends on your IndexedDB or storage solution
    console.log('🗑️ Service Worker: Removed pending request');
}

// ========================================
// ERROR HANDLING
// ========================================
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Service Worker Unhandled Rejection:', event.reason);
});

console.log('✅ Service Worker: Script loaded successfully');