interface ProcessingModalProps {
  visible: boolean
  label: string
  index: number
  total: number
  progress: number
}

export default function ProcessingModal({
  visible,
  label,
  index,
  total,
  progress,
}: ProcessingModalProps) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      aria-hidden={!visible}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(560px, 92%)',
          background: '#fff',
          borderRadius: 8,
          padding: 18,
          boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#000' }}>{label}</div>
          <div style={{ fontSize: 12, color: '#000' }}>{index}/{total}</div>
        </div>

        <div style={{ height: 12, background: '#eee', borderRadius: 8, overflow: 'hidden', marginTop: 12, position: 'relative' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#2563eb',
              transition: 'width 220ms linear',
            }}
          />
        </div>

        <div style={{ marginTop: 10, fontSize: 13, color: '#000' }}>
          {progress < 100 ? 'Processando — aguarde...' : 'Concluído'}
        </div>
      </div>
    </div>
  )
}
