export default {
  packageManager: 'bun',
  scripts:        {
    install: [ 'hutch', 'install', '--frozen-lockfile' ],
    dev:     [ 'hutch', 'electrobun', 'dev', '--watch' ],
    build:   [ 'hutch', 'electrobun', 'build', '--env=stable' ],
  },
}
