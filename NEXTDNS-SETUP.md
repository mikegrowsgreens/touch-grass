# Phone blocking with NextDNS (Android / Samsung Galaxy)

Brave (and Chrome) on Android can't run extensions, so the phone uses DNS blocking instead. NextDNS blocks the domains **system-wide** — every browser, every app, private tabs included. Free tier (300k queries/month) is plenty for one person.

Trade-off: blocked sites show a "site can't be reached" error, not the fun page. The fun page lives on desktop.

## Setup (~5 minutes)

### 1. Create the config

1. Go to [my.nextdns.io](https://my.nextdns.io) and sign up (free)
2. A configuration is created automatically — note its **ID** (6 characters, shown at the top, e.g. `ab12cd`)

### 2. Add the blocklist

In the NextDNS dashboard → **Denylist** tab, add:

```
facebook.com
instagram.com
threads.net
linkedin.com
strava.com
```

Subdomains are blocked automatically.

### 3. Point the phone at it

1. Samsung **Settings** → **Connections** → **More connection settings** → **Private DNS**
2. Select **Private DNS provider hostname**
3. Enter: `<your-config-id>.dns.nextdns.io` (e.g. `ab12cd.dns.nextdns.io`)
4. Save

Done. Test by opening instagram.com in Brave — including a private tab.

## Notes

- This blocks the **apps** too (Instagram app, LinkedIn app), not just browsers — delete the apps anyway; this is the backstop layer.
- Works on Wi-Fi and mobile data.
- To pause legitimately: Settings → Private DNS → Off. It's deliberately more friction than tapping an app icon.
- The desktop extension and NextDNS are independent — keep the blocklists in sync manually if you edit one.
