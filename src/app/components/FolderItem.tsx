type Props = {
  readonly folder:   string
  readonly index:    number
  readonly onRemove: (index: number) => void
}

export const FolderItem = ({ folder, index, onRemove }: Props) =>

  <div className='folder-item'>
    <span className='folder-icon'>📁</span>
    <span className='folder-path' title={folder}>{folder}</span>

    <button
      className='folder-remove-btn'
      aria-label='Remove folder'
      data-idx={index}
      onClick={() =>
        onRemove(index)}
    >
      ×
    </button>
  </div>
