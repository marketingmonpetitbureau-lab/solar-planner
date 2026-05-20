import useSolarStore from '../../store/useSolarStore'
import { computeEnergyReport, computeFinancialReport } from '../../utils/solarCalculations'

export default function RightPanel() {
  const { segments, panelModel, panelOrientation, setPanelOrientation,
    selectedSegmentId, updateSegment, microInverters, activeStep, getTotals,
    solarApiPanels, reportParams, setReportParams } = useSolarStore()

  const { totalPanels, totalKw, annualKwh } = getTotals()
  const selectedSeg = segments.find(s => s.id === selectedSegmentId)

  if (activeStep === 3) return <ChainesPanel totalPanels={totalPanels} totalKw={totalKw} annualKwh={annualKwh} microInverters={microInverters} />
  if (activeStep === 4) return <ReportParamsPanel segments={segments} panelModel={panelModel} reportParams={reportParams} setReportParams={setReportParams} />

  return (
    <div style={{
      width: 280,
      background: 'white',
      borderLeft: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Panel model header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 1 }}>
            {panelModel.brand}
          </span>
          <button style={{ marginLeft: 'auto', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>↺</button>
          <button style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>⊞</button>
        </div>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 12 }}>
          {panelModel.model} {panelModel.power}W
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <StatBox label="Nombre de panneaux" value={totalPanels} />
          <StatBox label="Puissance" value={`${totalKw.toFixed(2)} kW`} />
        </div>
        {annualKwh !== null && (
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatBox
              label="Production annuelle"
              value={`${Math.round(annualKwh).toLocaleString('fr-FR')} kWh`}
            />
            <StatBox
              label="Puissance crête"
              value={`${totalKw.toFixed(2)} kWc`}
            />
          </div>
        )}
      </div>

      {/* Orientation */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
          Sens des panneaux
        </label>
        <select
          value={panelOrientation}
          onChange={e => setPanelOrientation(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 6,
            border: '1px solid #d1d5db', fontSize: 13, color: '#111827',
            background: 'white', cursor: 'pointer',
          }}
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Paysage</option>
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <NumField label="Écart horizontal" value="2" unit="cm" />
          <NumField label="Écart vertical" value="2" unit="cm" />
        </div>
      </div>

      {/* Segments */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Pans de toit
        </p>
        {segments.map(seg => (
          <SegmentCard key={seg.id} segment={seg} />
        ))}

        <button style={{
          width: '100%', marginTop: 8, padding: '8px', borderRadius: 8,
          border: '1px dashed #d1d5db', background: 'transparent',
          color: '#6b7280', fontSize: 13, cursor: 'pointer',
        }}>
          + Ajouter un pan
        </button>
      </div>

      {/* Selected segment editor */}
      {selectedSeg && <SegmentEditor segment={selectedSeg} />}
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function NumField({ label, value, unit }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
        <input
          defaultValue={value}
          style={{ flex: 1, padding: '6px 8px', border: 'none', fontSize: 13, color: '#111827', background: 'white' }}
        />
        <span style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280', background: '#f9fafb', borderLeft: '1px solid #d1d5db' }}>{unit}</span>
      </div>
    </div>
  )
}

function SegmentCard({ segment }) {
  const { selectedSegmentId, setSelectedSegment } = useSolarStore()
  const isSelected = segment.id === selectedSegmentId
  const kw = (segment.panels.length * 500) / 1000

  return (
    <button
      onClick={() => setSelectedSegment(isSelected ? null : segment.id)}
      style={{
        width: '100%', textAlign: 'left', marginBottom: 8,
        padding: '10px 12px', borderRadius: 8,
        border: `1px solid ${isSelected ? '#1d4ed8' : '#e5e7eb'}`,
        background: isSelected ? '#eff6ff' : 'white',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: segment.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{segment.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>{kw.toFixed(1)} kW</span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{segment.panels.length} panneaux</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>Az: {segment.displayAzimuth}°</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>Inc: {segment.tilt}°</span>
      </div>
    </button>
  )
}

function SegmentEditor({ segment }) {
  const { updateSegment } = useSolarStore()

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Modifier — {segment.name}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SliderRow
          label="Azimut" value={segment.displayAzimuth}
          min={0} max={359} unit="°"
          onChange={v => updateSegment(segment.id, { displayAzimuth: v })}
        />
        <SliderRow
          label="Inclinaison" value={segment.tilt}
          min={0} max={60} unit="°"
          onChange={v => updateSegment(segment.id, { tilt: v })}
        />
        <SliderRow
          label="Largeur" value={segment.width}
          min={1} max={15} step={0.1} unit=" m"
          onChange={v => updateSegment(segment.id, { width: parseFloat(v.toFixed(1)) })}
        />
        <SliderRow
          label="Hauteur (pente)" value={segment.height}
          min={1} max={10} step={0.1} unit=" m"
          onChange={v => updateSegment(segment.id, { height: parseFloat(v.toFixed(1)) })}
        />
      </div>
    </div>
  )
}

function SliderRow({ label, value, min, max, step = 1, unit, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
          {typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#1d4ed8' }}
      />
    </div>
  )
}

function ChainesPanel({ totalPanels, totalKw, annualKwh, microInverters }) {
  return (
    <div style={{
      width: 280, background: 'white', borderLeft: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', padding: 16, gap: 16,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatBox label="Nombre de panneaux" value={totalPanels} />
        <StatBox label="Puissance" value={`${totalKw.toFixed(2)} kW`} />
      </div>
      {annualKwh !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          <StatBox
            label="Production annuelle estimée"
            value={`${Math.round(annualKwh).toLocaleString('fr-FR')} kWh/an`}
          />
        </div>
      )}

      <Section title="Chaînes">
        <EmptyCard icon="□" text="Pas de chaînes ajoutées" sub="Cliquer pour dessiner la chaîne" />
        <GrayBtn>Configurer une chaîne</GrayBtn>
      </Section>

      <Section title="Onduleurs" action="Ajouter">
        <EmptyCard icon="✕" text="Pas d'onduleurs configurés" sub="Cliquer pour ajouter" />
      </Section>

      <Section title="Micro-onduleurs" action="Ajouter">
        {microInverters.map(inv => (
          <div key={inv.id} style={{
            display: 'flex', alignItems: 'center',
            padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{inv.model}</p>
              <p style={{ fontSize: 11, color: '#6b7280' }}>{inv.brand}</p>
            </div>
            <span style={{ fontSize: 13, color: '#374151' }}>× {inv.count}</span>
            <button style={{ marginLeft: 8, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑</button>
          </div>
        ))}
        <GrayBtn>+ Ajouter</GrayBtn>
      </Section>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <GrayBtn icon="⛓">Chaîne</GrayBtn>
        <div style={{ marginTop: 6 }}>
          <GrayBtn icon="⚡">Schéma électrique</GrayBtn>
        </div>
      </div>
    </div>
  )
}

function Section({ title, action, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{title}</span>
        {action && (
          <button style={{ marginLeft: 'auto', fontSize: 12, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer' }}>
            {action}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

function EmptyCard({ icon, text, sub }) {
  return (
    <div style={{
      padding: '12px', borderRadius: 8, border: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 18, color: '#9ca3af' }}>{icon}</span>
      <div>
        <p style={{ fontSize: 13, color: '#374151' }}>{text}</p>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</p>
      </div>
    </div>
  )
}

function GrayBtn({ children, icon }) {
  return (
    <button style={{
      width: '100%', padding: '8px 12px', borderRadius: 8,
      border: '1px solid #e5e7eb', background: 'white',
      color: '#374151', fontSize: 13, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  )
}

function ReportParamsPanel({ segments, panelModel, reportParams, setReportParams }) {
  const energy = computeEnergyReport(segments, panelModel)
  const finance = computeFinancialReport(energy.kWp, energy.annualKWh, reportParams)

  return (
    <div style={{
      width: 280, background: 'white', borderLeft: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Paramètres du rapport
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <StatBox label="Puissance crête" value={`${energy.kWp.toFixed(2)} kWc`} />
          <StatBox label="Production annuelle" value={`${energy.annualKWh.toLocaleString('fr-FR')} kWh`} />
        </div>
      </div>

      {/* Financial params */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2 }}>Paramètres financiers</div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Coût / kWc</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{reportParams.costPerKWp} €</span>
          </div>
          <input
            type="range" min={800} max={2500} step={50}
            value={reportParams.costPerKWp}
            onChange={e => setReportParams({ ...reportParams, costPerKWp: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#1d4ed8' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
            <span>800 €</span><span>2 500 €</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Prix électricité</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{reportParams.electricityPrice.toFixed(2)} €/kWh</span>
          </div>
          <input
            type="range" min={0.10} max={0.60} step={0.01}
            value={reportParams.electricityPrice}
            onChange={e => setReportParams({ ...reportParams, electricityPrice: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#1d4ed8' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
            <span>0,10 €</span><span>0,60 €</span>
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div style={{ padding: '12px 16px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Synthèse</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Coût installation', value: `${finance.totalCost.toLocaleString('fr-FR')} €`, color: '#ef4444' },
            { label: 'Économies annuelles', value: `${finance.annualSavings.toLocaleString('fr-FR')} €/an`, color: '#10b981' },
            { label: 'Retour investissement', value: `${finance.paybackYears.toFixed(1)} ans`, color: '#f59e0b' },
            { label: 'Gain sur 25 ans', value: `${finance.revenue25y.toLocaleString('fr-FR')} €`, color: '#1d4ed8' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', background: '#f9fafb', borderRadius: 6, border: '1px solid #f3f4f6',
            }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>CO₂ évité par an</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#15803d' }}>{energy.co2Avoided.toLocaleString('fr-FR')} kg</div>
        </div>
      </div>
    </div>
  )
}
