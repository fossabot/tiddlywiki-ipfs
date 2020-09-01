module.exports = function (api) {
  api.cache(false)
  return {
    presets: [
      [
        '@babel/preset-env',
        {
          useBuiltIns: 'usage',
          corejs: { version: '3.6', proposals: true },
          debug: false
        }
      ]
    ],
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        {
          version: '^7.11.5' // @babel/runtime-corejs3
        }
      ]
    ]
  }
}
