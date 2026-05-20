import useSolarStore from '../../store/useSolarStore'
import { computeEnergyReport, computeFinancialReport } from '../../utils/solarCalculations'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function ReportPage({ onClose }) {
  const { segments, panelModel, address, lat, lng, reportParams } = useSolarStore()
  const energy = computeEnergyReport(segments, panelModel)
  const finance = computeFinancialReport(energy.kWp, energy.annualKWh, reportParams)

  const maxKwh = Math.max(...energy.monthlyKWh)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, maxWidth: 800, width: '100%',
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb', borderRadius: '12px 12px 0 0',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111827', flex: 1 }}>
            Rapport d'installation photovoltaïque
          </span>
          <button onClick={() => window.print()} style={{
            padding: '6px 14px', borderRadius: 6, background: '#1d4ed8',
            color: 'white', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>Imprimer / PDF</button>
          <button onClick={onClose} style={{
            padding: '6px 10px', borderRadius: 6, background: '#f3f4f6',
            color: '#374151', border: 'none', fontSize: 13, cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Report content */}
        <div id="report-content" style={{ padding: '32px 40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                Installation Photovoltaïque
              </div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                {address || `${lat?.toFixed(5)}, ${lng?.toFixed(5)}`}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                Généré le {new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{energy.kWp.toFixed(2)} kWc</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Puissance crête</div>
            </div>
          </div>

          {/* Key stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Panneaux', value: energy.totalPanels, unit: '' },
              { label: 'Production annuelle', value: energy.annualKWh.toLocaleString('fr-FR'), unit: ' kWh' },
              { label: 'CO₂ évité', value: energy.co2Avoided.toLocaleString('fr-FR'), unit: ' kg/an' },
              { label: 'Économies annuelles', value: finance.annualSavings.toLocaleString('fr-FR'), unit: ' €' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: '#f8faff', border: '1px solid #e0e7ff',
                borderRadius: 10, padding: '14px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8' }}>
                  {stat.value}{stat.unit}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Monthly production chart */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              Production mensuelle estimée (kWh)
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
              {energy.monthlyKWh.map((kwh, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: '#6b7280' }}>{kwh}</span>
                  <div style={{
                    width: '100%', background: `hsl(${210 + i*5}, 80%, ${45 + (kwh/maxKwh)*20}%)`,
                    borderRadius: '3px 3px 0 0',
                    height: `${(kwh / maxKwh) * 100}px`,
                  }} />
                  <span style={{ fontSize: 9, color: '#9ca3af' }}>{MONTHS_FR[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Segment table */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              Pans de toit
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Pan', 'Azimut', 'Inclinaison', 'Panneaux', 'Puissance'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((seg) => (
                  <tr key={seg.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color }} />
                        {seg.name}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{seg.displayAzimuth}°</td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{seg.tilt}°</td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{seg.panels?.length || 0}</td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{((seg.panels?.length || 0) * panelModel.power / 1000).toFixed(2)} kWc</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial summary */}
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 20, marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#15803d', marginBottom: 12 }}>
              Synthèse financière
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Coût installation estimé', value: `${finance.totalCost.toLocaleString('fr-FR')} €`, note: `(${reportParams.costPerKWp} €/kWc)` },
                { label: 'Économies annuelles', value: `${finance.annualSavings.toLocaleString('fr-FR')} €/an`, note: `(${reportParams.electricityPrice} €/kWh)` },
                { label: 'Retour sur investissement', value: `${finance.paybackYears.toFixed(1)} ans`, note: '' },
                { label: 'Gain sur 25 ans', value: `${finance.revenue25y.toLocaleString('fr-FR')} €`, note: 'hors inflation' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#15803d' }}>{item.value}</div>
                  {item.note && <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.note}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Technical specs */}
          <div style={{ background: '#f8faff', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Caractéristiques techniques</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#6b7280' }}>
              <div>Panneau: <strong style={{color:'#111827'}}>{panelModel.brand} {panelModel.model}</strong></div>
              <div>Puissance unitaire: <strong style={{color:'#111827'}}>{panelModel.power} Wc</strong></div>
              <div>Dimensions: <strong style={{color:'#111827'}}>{panelModel.widthM}m × {panelModel.heightM}m</strong></div>
              <div>Surface totale: <strong style={{color:'#111827'}}>{(energy.totalPanels * panelModel.widthM * panelModel.heightM).toFixed(1)} m²</strong></div>
            </div>
          </div>

          <style>{`@media print { body > *:not(#report-content) { display: none; } }`}</style>
        </div>
      </div>
    </div>
  )
}
