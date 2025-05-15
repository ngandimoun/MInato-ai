// FILE: public/sw.js
// (Content from finalcodebase.txt - verified for correctness)

console.log('[Service Worker] Loaded');

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = self.atob(base64); // Use self.atob in service worker context
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  let notificationData = {
    title: 'Minato Reminder',
    body: 'You have a new reminder!',
    icon: '/icon-192x192.png', // Default icon path
    data: { url: '/' } // Default data
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData.title = data.title || notificationData.title;
      notificationData.body = data.body || notificationData.body;
      notificationData.icon = data.icon || notificationData.icon;
      notificationData.data = data.data || notificationData.data; // Store URL or other data
      console.log('[Service Worker] Push data parsed:', notificationData);
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Use default body if parsing fails
      try {
        notificationData.body = event.data.text();
      } catch (textErr) {
         console.error('[Service Worker] Could not even read push data as text:', textErr);
         // Keep default body
      }
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: '/icon-96x96.png', // Optional badge icon
    vibrate: [100, 50, 100], // Optional vibration pattern
    data: notificationData.data, // Pass data to notificationclick
    actions: [ // Optional: Add actions
      // { action: 'view', title: 'View Reminder' },
      // { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  // Ensure the notification shows even if the page/tab isn't focused
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .catch(err => console.error('[Service Worker] Error showing notification:', err))
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.', event.notification.data);

  event.notification.close(); // Close the notification

  const urlToOpen = event.notification.data?.url || '/chat'; // Default to /chat for better UX

  // Focus existing window or open a new one
  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true // Important to find clients not controlled by this SW version
    }).then((clientList) => {
      // Check if there's already a window open at the target URL
      for (const client of clientList) {
        // Use URL constructor for robust comparison
        try {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(urlToOpen, self.location.origin); // Resolve relative URLs
            if (clientUrl.href === targetUrl.href && 'focus' in client) {
                console.log('[Service Worker] Focusing existing client window.');
                return client.focus();
            }
        } catch (e) {
             console.error("[Service Worker] Error comparing URLs", e);
        }
      }
      // If no existing window found, open a new one
      if (clients.openWindow) {
        console.log('[Service Worker] Opening new window for:', urlToOpen);
        return clients.openWindow(urlToOpen);
      } else {
        console.warn('[Service Worker] clients.openWindow is not supported in this browser.');
      }
    }).catch(err => console.error('[Service Worker] Error handling notification click:', err))
  );

  // Handle actions if defined
  // if (event.action === 'view') { console.log('View action clicked'); /* Open specific view */ }
  // else if (event.action === 'dismiss') { console.log('Dismiss action clicked'); }
});

// Optional: Handle activation to ensure the latest SW takes control
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activated');
  event.waitUntil(clients.claim().catch(err => console.error('[Service Worker] clients.claim() failed:', err))); // Take control immediately
});

// Optional: Handle installation
self.addEventListener('install', event => {
  console.log('[Service Worker] Installed');
  // Optional: Skip waiting to activate immediately after install
  // event.waitUntil(self.skipWaiting().catch(err => console.error('[Service Worker] self.skipWaiting() failed:', err)));
});