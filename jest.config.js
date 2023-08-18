/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        babelConfig: {
          plugins: ['babel-plugin-transform-import-meta'],
        },
      },
    ],
  },
};
