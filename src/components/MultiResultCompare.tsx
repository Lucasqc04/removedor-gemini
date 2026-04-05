interface MultiResultProps {
  results: Array<{
    src: string
    label: string
  }>
  onSelect: (index: number) => void
  selectedIndex: number | null
}

export function MultiResultCompare({ results, onSelect, selectedIndex }: MultiResultProps) {
  return (
    <div className="multi-result-compare">
      {results.map((result, idx) => (
        <div
          key={result.label}
          className={`multi-thumb ${selectedIndex === idx ? 'multi-thumb-selected' : ''}`}
          onClick={() => onSelect(idx)}
        >
          <img src={result.src} alt={result.label} className="multi-thumb-img" />
          <div className="multi-thumb-label">{result.label}</div>
        </div>
      ))}
    </div>
  )
}
