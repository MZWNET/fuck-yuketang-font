import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  formatters: true,
  solid: true,
  rules: {
    'ts/no-explicit-any': 'error',
  },
})
