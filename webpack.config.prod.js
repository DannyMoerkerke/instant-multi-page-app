const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  // devtool: 'source-map',
  entry: {
    bundle: './index.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].[hash].js'
  },
  module: {
    rules: []
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      chunks: ['bundle']
    }),
    new CopyPlugin({
        patterns: [
          {
            from: 'blog/**/*',
            to: '../dist/'
          },
          {
            from: 'contact/**/*',
            to: '../dist/'
          },
          {
            from: 'images/**/*',
            to: '../dist/'
          },
          {
            from: 'readablestream/**/*',
            to: '../dist/'
          },
          {
            from: 'serviceworker/**/*',
            to: '../dist/'
          },
          {
            from: 'src/**/*',
            to: '../dist/',
            globOptions: {
              ignore: ['aws-exports.js']
            }
          },
          {
            from: 'service-worker.js',
            to: '../dist/service-worker.js'
          }
        ]
      }
    )
  ]
}
;
