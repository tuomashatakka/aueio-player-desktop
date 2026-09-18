import { BrowserWindow } from 'electrobun/main'


new BrowserWindow({
  title:         'Aüeio Player',
  url:           'views://app/index.html',
  titleBarStyle: 'hiddenInset',
  frame:         { x: 100, y: 80, width: 1100, height: 720 },
})
