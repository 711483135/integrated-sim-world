/**
 * SimulationPanel — Sionna 無線模擬結果面板 (Glassmorphism)
 *
 * 提供四個頁籤：SINR Map | CFR | Doppler | Channel Response
 * 點擊「計算」按鈕觸發後端 API，並顯示回傳的 PNG 圖片。
 */
import { useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

// ── 型別 ────────────────────────────────────────────────────────────
type TabKey = 'sinr' | 'cfr' | 'doppler' | 'channel';

interface SINRParams {
  sinr_vmin: number;
  sinr_vmax: number;
  cell_size: number;
  samples_per_tx: number;
}

interface SimStatus {
  loading: boolean;
  imageUrl: string | null;
  error: string | null;
}

const EMPTY: SimStatus = { loading: false, imageUrl: null, error: null };

// ── Helpers ─────────────────────────────────────────────────────────
function buildSinrUrl(params: SINRParams): string {
  const q = new URLSearchParams({
    sinr_vmin: String(params.sinr_vmin),
    sinr_vmax: String(params.sinr_vmax),
    cell_size:  String(params.cell_size),
    samples_per_tx: String(params.samples_per_tx),
  });
  return `${API}/api/sionna/sinr-map?${q.toString()}`;
}

// ── Component ────────────────────────────────────────────────────────
export function SimulationPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('sinr');
  const [status, setStatus] = useState<Record<TabKey, SimStatus>>({
    sinr:    { ...EMPTY },
    cfr:     { ...EMPTY },
    doppler: { ...EMPTY },
    channel: { ...EMPTY },
  });

  // SINR 參數
  const [sinrParams, setSinrParams] = useState<SINRParams>({
    sinr_vmin: -20,
    sinr_vmax: 40,
    cell_size: 5.0,     // 較大格子 → 少計算點
    samples_per_tx: 100000,  // 預設 100K，夠快又能看出結果
  });

  // ── 通用計算觸發 ─────────────────────────────────────────────────
  const compute = useCallback(async (key: TabKey) => {
    setStatus(prev => ({ ...prev, [key]: { loading: true, imageUrl: null, error: null } }));

    const urlMap: Record<TabKey, string> = {
      sinr:    buildSinrUrl(sinrParams),
      cfr:     `${API}/api/sionna/cfr-plot`,
      doppler: `${API}/api/sionna/doppler`,
      channel: `${API}/api/sionna/channel-response`,
    };

    try {
      const res = await fetch(urlMap[key]);
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setStatus(prev => ({ ...prev, [key]: { loading: false, imageUrl: url, error: null } }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(prev => ({ ...prev, [key]: { loading: false, imageUrl: null, error: msg } }));
    }
  }, [sinrParams]);

  const cur = status[tab];

  // ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* 觸發按鈕（左下角） */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position:    'fixed',
          bottom:       14,
          left:         14,
          zIndex:       1000,
          background:   open
            ? 'linear-gradient(135deg, #0ff 0%, #09f 100%)'
            : 'linear-gradient(135deg, rgba(0,255,255,.15) 0%, rgba(0,153,255,.2) 100%)',
          border:       '1px solid rgba(0,255,255,.4)',
          borderRadius: 12,
          padding:      '8px 14px',
          color:        open ? '#000' : '#0ff',
          fontWeight:   700,
          fontSize:     13,
          cursor:       'pointer',
          backdropFilter: 'blur(12px)',
          boxShadow:    '0 4px 20px rgba(0,255,255,.2)',
          transition:   'all .2s',
          letterSpacing: '.5px',
        }}
      >
        📡 無線模擬
      </button>

      {/* 面板 */}
      {open && (
        <div style={{
          position:       'fixed',
          bottom:          60,
          left:            14,
          zIndex:          999,
          width:           380,
          maxHeight:       '80vh',
          display:         'flex',
          flexDirection:   'column',
          background:      'rgba(10,15,30,.82)',
          backdropFilter:  'blur(20px) saturate(180%)',
          border:          '1px solid rgba(0,255,255,.18)',
          borderRadius:    16,
          boxShadow:       '0 8px 40px rgba(0,255,255,.12), 0 2px 8px rgba(0,0,0,.5)',
          overflow:        'hidden',
          animation:       'slide-in-left .25s ease',
        }}>

          {/* 標題列 */}
          <div style={{
            padding:      '12px 16px 0',
            display:      'flex',
            alignItems:   'center',
            gap:          8,
          }}>
            <span style={{ color: '#0ff', fontSize: 13, fontWeight: 700, letterSpacing: 1, flex: 1 }}>
              SIONNA 無線通道模擬
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,.45)',
                cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2,
              }}
            >×</button>
          </div>

          {/* 頁籤 */}
          <div style={{
            display:    'flex',
            gap:         4,
            padding:    '10px 12px 0',
            flexShrink:  0,
          }}>
            {([
              { key: 'sinr',    label: 'SINR Map' },
              { key: 'cfr',     label: 'CFR' },
              { key: 'doppler', label: 'Doppler' },
              { key: 'channel', label: 'Channel IR' },
            ] as { key: TabKey; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex:         1,
                  padding:      '5px 4px',
                  background:   tab === key
                    ? 'linear-gradient(135deg,rgba(0,255,255,.25),rgba(0,153,255,.25))'
                    : 'rgba(255,255,255,.04)',
                  border:       tab === key
                    ? '1px solid rgba(0,255,255,.5)'
                    : '1px solid rgba(255,255,255,.08)',
                  borderRadius: 8,
                  color:        tab === key ? '#0ff' : 'rgba(255,255,255,.5)',
                  fontSize:     11,
                  fontWeight:   tab === key ? 700 : 400,
                  cursor:       'pointer',
                  transition:   'all .15s',
                  whiteSpace:   'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 捲動內容區 */}
          <div style={{
            flex:       1,
            overflowY:  'auto',
            padding:    '12px 16px 16px',
          }}>
            {/* SINR 專屬參數 */}
            {tab === 'sinr' && (
              <div style={{ marginBottom: 12 }}>
                <ParamGrid>
                  <Label>SINR Min (dB)</Label>
                  <NumberInput
                    value={sinrParams.sinr_vmin}
                    step={5} min={-60} max={0}
                    onChange={v => setSinrParams(p => ({ ...p, sinr_vmin: v }))}
                  />
                  <Label>SINR Max (dB)</Label>
                  <NumberInput
                    value={sinrParams.sinr_vmax}
                    step={5} min={0} max={80}
                    onChange={v => setSinrParams(p => ({ ...p, sinr_vmax: v }))}
                  />
                  <Label>Cell Size (m)</Label>
                  <NumberInput
                    value={sinrParams.cell_size}
                    step={0.5} min={0.5} max={10}
                    onChange={v => setSinrParams(p => ({ ...p, cell_size: v }))}
                  />
                  <Label>Samples / TX</Label>
                  <select
                    value={sinrParams.samples_per_tx}
                    onChange={e => setSinrParams(p => ({ ...p, samples_per_tx: Number(e.target.value) }))}
                    style={selectStyle}
                  >
                    {[
                      [10000,   '10K  (~30s)'],
                      [100000,  '100K (~2min)'],
                      [500000,  '500K (~10min)'],
                      [1000000, '1M   (~20min)'],
                    ].map(([v, label]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                </ParamGrid>
              </div>
            )}

            {/* 計算按鈕 */}
            <button
              onClick={() => compute(tab)}
              disabled={cur.loading}
              style={{
                width:          '100%',
                padding:        '9px 0',
                background:     cur.loading
                  ? 'rgba(0,255,255,.08)'
                  : 'linear-gradient(135deg,rgba(0,255,255,.22),rgba(0,153,255,.25))',
                border:         '1px solid rgba(0,255,255,.35)',
                borderRadius:   10,
                color:          cur.loading ? 'rgba(0,255,255,.4)' : '#0ff',
                fontWeight:     700,
                fontSize:       13,
                cursor:         cur.loading ? 'not-allowed' : 'pointer',
                transition:     'all .2s',
                letterSpacing:  '.5px',
                marginBottom:   12,
              }}
            >
              {cur.loading ? '⏳ 計算中…' : '▶ 開始計算'}
            </button>

            {/* 錯誤訊息 */}
            {cur.error && (
              <div style={{
                background:   'rgba(255,50,80,.12)',
                border:       '1px solid rgba(255,50,80,.3)',
                borderRadius:  8,
                padding:      '8px 12px',
                color:        '#ff6080',
                fontSize:      12,
                marginBottom:  10,
                wordBreak:     'break-all',
              }}>
                ⚠ {cur.error}
              </div>
            )}

            {/* 結果圖片 */}
            {cur.imageUrl && (
              <div style={{
                borderRadius:  10,
                overflow:      'hidden',
                border:        '1px solid rgba(0,255,255,.15)',
                boxShadow:     '0 4px 20px rgba(0,0,0,.4)',
              }}>
                <img
                  src={cur.imageUrl}
                  alt={tab}
                  style={{ width: '100%', display: 'block' }}
                  onClick={() => window.open(cur.imageUrl!, '_blank')}
                  title="點擊在新分頁開啟"
                />
              </div>
            )}

            {/* 空狀態 */}
            {!cur.loading && !cur.imageUrl && !cur.error && (
              <p style={{
                textAlign:  'center',
                color:      'rgba(255,255,255,.25)',
                fontSize:   12,
                marginTop:  16,
              }}>
                按下「開始計算」以產生模擬圖
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── 小型子元件 ────────────────────────────────────────────────────────

function ParamGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '1fr 1fr',
      gap:                 '6px 8px',
      alignItems:          'center',
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>{children}</span>
  );
}

function NumberInput({
  value, step, min, max, onChange,
}: {
  value: number; step: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
      style={inputStyle}
    />
  );
}

const inputStyle: React.CSSProperties = {
  width:           '100%',
  padding:         '4px 8px',
  background:      'rgba(255,255,255,.06)',
  border:          '1px solid rgba(0,255,255,.2)',
  borderRadius:     6,
  color:           '#e0f8ff',
  fontSize:        12,
  outline:         'none',
  boxSizing:       'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};
