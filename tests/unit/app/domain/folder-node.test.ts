import { describe, expect, test } from 'bun:test'
import { buildFolderTree, findFolder, subfolderRows, Track } from '../../../../src/app/domain'


function track (path: string) {
  return Track.fromJSON({
    id: path, path, title: '', artist: '', album: '', duration: 1, format: 'mp3', size: 1, coverColor: '#000', mtimeMs: 0,
  })
}

describe('buildFolderTree', () => {
  test('builds one tree per root from a flat list of paths', () => {
    const roots = [ '/music' ]
    const paths = [
      '/music/rock/song.mp3',
      '/music/rock/live/song2.mp3',
      '/music/jazz/song3.mp3',
      '/music/top.mp3',
    ]

    const [ root ] = buildFolderTree(roots, paths)
    expect(root!.path).toBe('/music')
    expect(root!.children.map(c =>
      c.name).sort()).toEqual([ 'jazz', 'rock' ])

    const rock = findFolder(root!.children, '/music/rock')
    expect(rock!.children.map(c =>
      c.name)).toEqual([ 'live' ])
  })

  test('tolerates mixed `/` and `\\` separators in the same tree', () => {
    const roots = [ '/music' ]
    const paths = [
      '/music\\rock\\song.mp3',
      '/music/rock/live/song2.mp3',
    ]

    const [ root ] = buildFolderTree(roots, paths)
    const rock     = root!.children.find(c =>
      c.name === 'rock')

    expect(rock).toBeDefined()
    expect(rock!.children.map(c =>
      c.name)).toEqual([ 'live' ])
  })

  test('one tree per root, for multiple roots', () => {
    const trees = buildFolderTree([ '/a', '/b' ], [ '/a/x.mp3', '/b/y.mp3' ])
    expect(trees.map(t =>
      t.path)).toEqual([ '/a', '/b' ])
  })
})

describe('subfolderRows', () => {
  const roots   = [ '/music' ]
  const paths   = [ '/music/rock/song.mp3', '/music/rock/live/song2.mp3', '/music/jazz/song3.mp3' ]
  const tracks  = [ track('/music/rock/song.mp3'), track('/music/rock/live/song2.mp3'), track('/music/jazz/song3.mp3') ]
  const folders = buildFolderTree(roots, paths)

  test('with no folder selected, lists the roots with counts under them (subfolders included)', () => {
    const rows = subfolderRows(folders, null, tracks)
    expect(rows).toEqual([{ path: '/music', name: 'music', trackCount: 3 }])
  })

  test('within a folder, lists its immediate children only, counting their own subtree', () => {
    const rows = subfolderRows(folders, '/music', tracks)
    expect([ ...rows ].sort((a, b) =>
      a.name.localeCompare(b.name))).toEqual([
      { path: '/music/jazz', name: 'jazz', trackCount: 1 },
      { path: '/music/rock', name: 'rock', trackCount: 2 },
    ])
  })

  test('a leaf folder with no children lists no rows', () => {
    expect(subfolderRows(folders, '/music/jazz', tracks)).toEqual([])
  })

  test('an unknown path lists no rows', () => {
    expect(subfolderRows(folders, '/nowhere', tracks)).toEqual([])
  })
})
