import { memo } from 'react'
import { useSelector } from '../../hooks/useSelector'
import { useSettingsActions } from '../../hooks/useSettingsActions'
import { selectActiveView, selectSettings, selectVolume, selectTheme } from '../../selectors/index'
import { FolderItem } from '../atomic/FolderItem'


type Props = {
  readonly onTriggerScan: () => Promise<void>
}

export const SettingsView = memo(({ onTriggerScan }: Props) => {
  const isActive = useSelector(selectActiveView) === 'settings'
  const settings = useSelector(selectSettings)
  const volume   = useSelector(selectVolume)
  const theme    = useSelector(selectTheme)

  const { addFolder, removeFolder, handleVolumeChange, handleThemeChange } = useSettingsActions(onTriggerScan)

  return (
    <section id='settings-view' data-view='settings' className={isActive ? 'active' : ''}>
      <div id='settings-content'>

        <div className='settings-section'>
          <h2 className='settings-section-title'>Music Library Folders</h2>

          <div id='folder-list' data-stack='sm'>
            {settings.folders.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No folders added yet
              </p>
              : settings.folders.map((folder, idx) =>

                <FolderItem
                  key={folder}
                  folder={folder}
                  index={idx}
                  onRemove={(i: number) =>
                    removeFolder(i).catch(console.error)}
                />
              )
            }
          </div>

          <button
            id='add-folder-btn'
            data-variant='primary'
            data-size='sm'
            onClick={() =>
              addFolder().catch(console.error)}
          >
            + Add Folder
          </button>
        </div>

        <div className='settings-section'>
          <h2 className='settings-section-title'>Playback</h2>

          <div className='settings-row'>
            <label htmlFor='settings-volume'>Default Volume</label>

            <input
              id='settings-volume'
              type='range'
              min={0}
              max={1}
              step={0.05}
              value={volume}
              aria-label='Default volume'
              onChange={handleVolumeChange}
            />
          </div>
        </div>

        <div className='settings-section'>
          <h2 className='settings-section-title'>Appearance</h2>

          <div className='settings-row'>
            <label htmlFor='settings-theme'>Theme</label>

            <select
              id='settings-theme'
              aria-label='Select theme'
              value={theme}
              onChange={handleThemeChange}
            >
              <option value='dark'>Dark</option>
              <option value='light'>Light</option>
              <option value='solarized'>Solarized</option>
              <option value='nord'>Nord</option>
            </select>
          </div>
        </div>

      </div>
    </section>
  )
})
