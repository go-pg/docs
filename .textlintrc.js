module.exports = {
  rules: {
    '@textlint-rule/no-unmatched-pair': true,
    'common-misspellings': true,
    'en-capitalization': {
      allowHeading: false,
    },
    'stop-words': {
      severity: 'warning',
    },
    terminology: {
      terms: `${__dirname}/.textlint.terms.json`,
    },
    'write-good': {
      severity: 'warning',
    },
  },
  filters: {
    comments: true,
  },
}
