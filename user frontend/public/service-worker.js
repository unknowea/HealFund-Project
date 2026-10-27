self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || '' };
  }

  const title = payload.title || 'HealFund update';
  const options = {
    body: payload.body || 'There is a new update in your HealFund account.',
    icon: '/og-image.png',
    badge: '/og-image.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || 'healfund-update',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(event.notification.data?.url || '/', self.location.origin);
    if (target.origin !== self.location.origin) return;

    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target.href);
        return;
      }
    }

    if (self.clients.openWindow) await self.clients.openWindow(target.href);
  })());
});
