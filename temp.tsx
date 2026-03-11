import { useState, useCallback } from 'react';
import { useDeviceStore } from '../../store/useDeviceStore';

const API = import.meta.env.VITE_API_URL || '';

type TabKey = 'sinr' | 'cfr' | 'doppler' | 'channel' | 'iss' | 'tss' | 'cfar';

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

function buildSinrUrl(params: SINRParams): string {
  const q = new URLSearchParams({
    sinr_vmin: String(params.sinr_vmin),
    sinr_vmax: String(params.sinr_vmax),
    cell_size:  String(params.cell_size),
    samples_per_tx: String(params.samples_per_tx),
  });
  return `${API}/api/sionna/sinr-map?${q.toString()}`;
}

export function SimulationPanel({ sceneId = 'NTPU' }: { sceneId?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('sinr');
  const [status, setStatus] = useState<Record<TabKey, SimStatus>>({
    sinr:    { ...EMPTY },
    cfr:     { ...EMPTY },
    doppler: { ...EMPTY },
    channel: { ...EMPTY },
    iss:     { ...EMPTY },
    tss:     { ...EMPTY },
    cfar:    { ...EMPTY },
  });

  const [sinrParams, setSinrParams] = useState<SINRParams>({
    sinr_vmin: -20,
    sinr_vmax: 40,
    cell_size: 5.0,
    samples_per_tx: 100000,
  });

  const devices = useDeviceStore(state => state.devices);

  const compute = useCallback(async (key: TabKey) => {
    setStatus(prev => ({ ...prev, [key]: { loading: true, imageUrl: null, error: null } }));

    try {
      let res;
      if (['iss', 'tss', 'cfar'].includes(key)) {
        res = await fetch(`${API}/api/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scene: sceneId,
            map_type: key,
            cell_size: sinrParams.cell_size,
            samples_per_tx: sinrParams.samples_per_tx,
            devices: devices.map(d => ({ name: d.name, role: d.role, x: d.x, y: d.y, z: d.z, power_dbm: d.powerDbm }))
          }),
        });
      } else {
        const urlMap: Record<string, string> = {
          sinr:    buildSinrUrl(sinrParams),
          cfr:     `${API}/api/sionna/cfr-plot`,
          doppler: `${API}/api/sionna/doppler`,
          channel: `${API}/api/sionna/channel-response`,
        };
        res = await fetch(urlMap[key]);
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'HTTP Error' }));
        throw new Error(json.detail || json.error || 'HTTP Error');
      }
      
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setStatus(prev => ({ ...prev, [key]: { loading: false, imageUrl: url, error: null } }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(prev => ({ ...prev, [key]: { loading: false, imageUrl: null, error: msg } }));
    }
  }, [sinrParams, sceneId, devices]);

  const cur = status[tab];

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position:    'fixed',
          bottom:       14,
          right:        14,
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
        ?? 無線模擬
      </button>

      {open && (
        <div style={{
          position:       'fixed',
          bottom:          60,
          right:           14,
          zIndex:          999,
          width:           440,
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

          <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '10px 12px 0', flexShrink: 0 }}>
            {([
              { key: 'sinr',    label: 'SINR Map' },
              { key: 'cfr',     label: 'CFR' },
              { key: 'doppler', label: 'Doppler' },
              { key: 'channel', label: 'Channel IR' },
              { key: 'iss',     label: 'ISS Map' },
              { key: 'tss',     label: 'TSS Map' },
              { key: 'cfar',    label: 'ISS+CFAR Map' },
            ] as { key: TabKey; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex:         '1 1 20%',
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

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
            {/* SINR 或 ISS/TSS/CFAR 專屬參數 */}
            {['sinr', 'iss', 'tss', 'cfar'].includes(tab) && (
              <div style={{ marginBottom: 12 }}>
                <ParamGrid>
                  {tab === 'sinr' && (
                    <>
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
                    </>
                  )}
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
                    <option value={10000}>10K (~30s)</option>
                    <option value={100000}>100K (~2min)</option>
                    <option value={500000}>500K (~10min)</option>
                    <option value={1000000}>1M (~20min)</option>
                  </select>
                </ParamGrid>
              </div>
            )}

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
              {cur.loading ? '? 計算中…' : '? 開始計算'}
            </button>

            {cur.error && (
              <div style={{
                background: 'rgba(255,50,80,.12)', border: '1px solid rgba(255,50,80,.3)',
                borderRadius: 8, padding: '8px 12px', color: '#ff6080', fontSize: 12, marginBottom: 10, wordBreak: 'break-all'
              }}>? {cur.error}</div>
            )}

            {cur.imageUrl && (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,255,255,.15)', boxShadow: '0 4px 20px rgba(0,0,0,.4)' }}>
                <img src={cur.imageUrl} alt={tab} style={{ width: '100%', display: 'block' }} onClick={() => window.open(cur.imageUrl!, '_blank')} title="點擊在新分頁開啟" />
              </div>
            )}

            {!cur.loading && !cur.imageUrl && !cur.error && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: 12, marginTop: 16 }}>
                按下「開始計算」以產生模擬圖
              </p>
            )}
          </div>
        </div>
      )}
