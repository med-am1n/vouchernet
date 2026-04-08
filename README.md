# VoucherNet

A small control panel for **MikroTik HotSpot voucher codes**: the kind of timed WiFi tickets hotels, cafés, guesthouses, co-working spaces, and similar venues hand out or sell so guests get online without sharing one shared password.

It talks to RouterOS over the API. Use **mock mode** with no hardware, or point it at CHR, a VPS, or any reachable router.

## Quick start

```bash
npm install
cp .env.example .env
```

**Mock (no router):** set `USE_MOCK=true` in `.env`, then `npm run mock`.

**Live:** set `USE_MOCK=false`, fill in `MIKROTIK_*` in `.env`, then `npm start`.

Open http://localhost:3000. The sidebar shows **Mock** or **Live** so you know which backend is active.

## Modes

| Mode | `.env` | Use when |
|------|--------|----------|
| Mock | `USE_MOCK=true` | Local dev, demo, no device |
| Live | `USE_MOCK=false` and router reachable | Real hardware or CHR |
| Auto-fallback | `AUTO_FALLBACK_TO_MOCK=true` (default) | Router sometimes offline |

---

## Run CHR in a local VM (any hypervisor)

Use **UTM**, **VirtualBox**, **VMware Fusion**, **QEMU**, or similar. Steps are the same idea everywhere.

1. **Download CHR** (example: RouterOS 7.14.3 raw image):

   ```bash
   curl -L "https://download.mikrotik.com/routeros/7.14.3/chr-7.14.3.img.zip" -o chr.img.zip
   unzip chr.img.zip
   ```

   You get a file like `chr-7.14.3.img`.

2. **Create a VM:** guest OS **Other** or generic Linux, architecture **x86_64**, about **256 MB RAM**, no extra disks unless your tool requires one.

3. **Attach the disk:** use the `.img` as the VM’s main (or only) disk. If the UI asks for a type, **IDE** often works for CHR images.

4. **Networking:** use **bridged** mode so CHR gets an address on your LAN (not NAT-only), unless you know you need something else.

5. **Boot** and wait ~10 seconds. Default management IP is often **192.168.88.1** (confirm on your network).

6. **Check and log in:**

   ```bash
   ping 192.168.88.1
   ssh admin@192.168.88.1
   ```

   Default user is `admin` with no password until you set one.

---

## RouterOS setup (once)

Run on the router (SSH or Winbox). Adjust passwords and firewall rules for production.

```routeros
/ip service set api disabled=no port=8728

/user add name=vouchernet password=secret123 group=full

/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept place-before=0

/ip address print
```

Use the IP you see (or keep `192.168.88.1` if that matches) as `MIKROTIK_HOST`.

For voucher and session features you still need HotSpot configured on that router (pool, server, profiles). See MikroTik’s HotSpot documentation when you are ready.

### CHR on a VPS (Hetzner, AWS, …)

Set `MIKROTIK_HOST` to the server’s public IP. Restrict API access to your app’s IP:

```routeros
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=YOUR.APP.SERVER.IP action=accept place-before=0
```

---

## Point VoucherNet at the router

In `.env`:

```env
USE_MOCK=false
MIKROTIK_HOST=192.168.88.1
MIKROTIK_USER=vouchernet
MIKROTIK_PASSWORD=secret123
```

Then `npm start`. The sidebar should show **Live** when the API connects.

---

## Layout

```
vouchernet/
├── server.js
├── .env.example
├── lib/adapter.js, mikrotik.js, mock.js
├── routes/          # vouchers, sessions, plans, system, reports
└── public/index.html
```

## API (short)

| HTTP | Path | RouterOS (typical) |
|------|------|---------------------|
| GET/POST/DELETE | `/api/vouchers`, `/api/vouchers/generate`, `/:id` | hotspot users |
| GET/DELETE | `/api/sessions`, `/:id` | active sessions |
| GET/POST/DELETE | `/api/plans`, `/:id` | user profiles |
| GET | `/api/system/info`, `/status`, `/neighbors` | resource, identity, neighbors |
| POST | `/api/system/connect` | reconnect |
| GET | `/api/reports/sales?days=7` | derived |

## Environment

| Variable | Default | Role |
|----------|---------|------|
| `USE_MOCK` | `false` | Force mock data |
| `AUTO_FALLBACK_TO_MOCK` | `true` | Use mock if router unreachable |
| `MIKROTIK_HOST` | `192.168.88.1` | Router IP or hostname |
| `MIKROTIK_PORT` | `8728` | API port |
| `MIKROTIK_USER` | `vouchernet` in `.env.example` | API user |
| `MIKROTIK_PASSWORD` | — | API password |
| `MIKROTIK_TIMEOUT` | `10000` | ms |
| `PORT` | `3000` | Web server |
