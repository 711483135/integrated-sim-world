# Integrated Sim World (GPS Tracker + Sim World Lite)

即時 GPS 追蹤 + UAV 3D 模擬控制 + 照片上傳 + Sionna 無線通道模擬。
本專案已將原有 `gps-tracker` 與 `sim-world-lite` 進行整合，提供完整的 3D 視覺化與無人機模擬介面。

## 功能

| 功能 | 說明 |
|------|------|
| GPS 同步 | 手機透過 WebSocket 即時傳送 GPS 至電腦端 3D 地圖 |
| UAV 模擬控制 | 整合 3D 場景內建控制面版，手動操作無人機飛行路徑 |
| 軌跡顯示 | 移動路徑與 UAV 軌跡以線條顯示在 3D 場景（包含 NTPU / NYCU 雙場景） |
| 拍照上傳 | 手機拍照後立即廣播至電腦端即時檢視 |
| 無線模擬 (Sionna) | 支援 SINR Map、CFR、Doppler、Channel Response 等通道模擬指標 |
| 裝置狀態監控 | 整合側邊與底部面板，即時監控線上裝置連線與坐標資訊 |
| Cloudflared | 手機與電腦透過公網安全通道連線，無須在相同內網 |

---

## 環境需求

- OS: **Windows** / Linux / macOS
- Python **3.12+**
- Node.js **18+**（建議 v22）
- `cloudflared`（選用，只有要用公網才需要）

---

## 快速安裝

### 1. Clone 專案

```bash
git clone https://github.com/711483135/integrated-sim-world.git
cd integrated-sim-world
```

### 2. 後端：建立虛擬環境並安裝套件 (Windows)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
cd ..
```

> ⚠️ Sionna 需要 TensorFlow，第一次安裝時間較長（約 5–10 分鐘）。
> 如果不需要 Sionna 無線模擬功能，可以先只裝核心套件：
> ```powershell
> .\.venv\Scripts\python -m pip install fastapi uvicorn[standard] python-multipart aiofiles
> ```

### 3. 前端：安裝 npm 套件

```powershell
cd frontend
npm install
cd ..
```

### 4. 設定環境變數

```powershell
cd frontend
cp .env.example .env
cd ..
```

本地開發預設值可直接使用，不需要修改。  
若要用 Cloudflare Tunnel 公網連線，請編輯 `frontend/.env` 填入您的對外網址。

### 5. 啟動 (Windows PowerShell)

```powershell
.\start.ps1
```

服務預設啟動位址：
- **前端介面**：http://localhost:5173
- **後端 API**：http://localhost:8000

加上 `-NoTunnel` 可略過 Cloudflare Tunnel 啟動：

```powershell
.\start.ps1 -NoTunnel
```

---

## Cloudflare Tunnel 設定（選用）

只有需要手機從外網連線時才需要設定。

### 1. 安裝 cloudflared (Windows)
請前往 [Cloudflare 官網](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) 下載 Windows 版 `cloudflared.exe` 並加入環境變數或放至專案根目錄。

### 2. 設定 Token
在根目錄或環境中設定您的 Token 以啟動內網穿透。

### 3. 設定前端指向公網後端

編輯 `frontend/.env`：

```env
VITE_WS_URL=wss://backend.yourdomain.com/ws/gps
VITE_API_URL=https://backend.yourdomain.com
```
