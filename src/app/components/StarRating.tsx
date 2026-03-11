type Props = {
  value: number
  readOnly?: boolean
  onChange?: (rating: number) => void
}

export const StarRating = ({ value, readOnly, onChange }: Props) => (
  <span
    role={readOnly ? 'img' : 'group'}
    aria-label={`Rating: ${value} of 5`}
  >
    {[1, 2, 3, 4, 5].map(i => (
      <button
        key={i}
        type="button"
        className={`star${i <= value ? ' filled' : ''}`}
        aria-label={`Rate ${i}`}
        disabled={readOnly}
        onClick={(e) => {
          e.stopPropagation()
          onChange?.(i === value ? 0 : i)
        }}
      >
        {i <= value ? '★' : '☆'}
      </button>
    ))}
  </span>
)
