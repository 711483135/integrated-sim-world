# GPS Tracker — Cloudflared 設定說明

## 1. 建立 Cloudflare Tunnel

```bash
# 安裝 cloudflared CLI
# https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# 登入
cloudflared tunnel login

# 建立 tunnel（名稱可自訂）
cloudflared tunnel create gps-tracker

# 複製產生的 credentials JSON 到 ./cloudflared/
# 並把 tunnel ID 和 hostname 填入 ./cloudflared/config.yml
```

## 2. DNS 設定

```bash
cloudflared tunnel route dns gps-tracker yourdomain.com
cloudflared tunnel route dns gps-tracker backend.yourdomain.com
```

## 3. 更新前端 .env

```bash
# frontend/.env
VITE_WS_URL=wss://backend.yourdomain.com/ws/gps
VITE_API_URL=https://backend.yourdomain.com
VITE_ORIGIN_LAT=24.942349
VITE_ORIGIN_LON=121.367164
VITE_ORIGIN_ALT=0
VITE_SCENE_SCALE=1
```

## 4. 啟動

```bash
docker compose up -d
```

## 功能說明

| 功能 | 說明 |
|------|------|
| GPS 同步 | 手機透過 WebSocket 即時傳送 GPS 至電腦端 3D 地圖 |
| UAV 軌跡 | 手機移動路徑以綠色線條即時顯示在 3D 場景 |
| 拍照上傳 | 手機拍照後立即廣播至電腦端，並儲存於後端 |
| Cloudflared | 手機 ↔ 電腦透過公網安全通道連線，無需同一 WiFi |
