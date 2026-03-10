import { escapeHtml } from '../utils/dom'


export const buildFolderItem = (
  folder: string,
  idx: number,
  onRemove: (idx: number) => void
): HTMLElement => {
  const item = document.createElement('div')
  item.className = 'folder-item'
  item.innerHTML = `
    <span class='folder-icon'>\u{1F4C1}</span>
    <span class='folder-path' title='${escapeHtml(folder)}'>${escapeHtml(folder)}</span>
    <button class='folder-remove-btn' aria-label='Remove folder' data-idx='${idx}'>\xD7</button>
  `

  item.querySelector('.folder-remove-btn')?.addEventListener('click', () => {
    onRemove(idx)
  })

  return item
}
