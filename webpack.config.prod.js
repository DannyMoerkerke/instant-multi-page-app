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
    // footer
    new HtmlWebpackPlugin({
      template: './src/templates/footer-build.html',
      filename: 'src/templates/footer.html',
      chunks: ['bundle']
    }),
    // index
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      chunks: ['bundle']
    }),
    // blog
    new HtmlWebpackPlugin({
      template: './blog/index-build.html',
      filename: 'blog/index.html',
      chunks: ['bundle']
    }),
    // images
    new HtmlWebpackPlugin({
      template: './images/index-build.html',
      filename: 'images/index.html',
      chunks: ['bundle']
    }),
    // readablestream
    new HtmlWebpackPlugin({
      template: './readablestream/index-build.html',
      filename: 'readablestream/index.html',
      chunks: ['bundle']
    }),
    // serviceworker
    new HtmlWebpackPlugin({
      template: './serviceworker/index-build.html',
      filename: 'serviceworker/index.html',
      chunks: ['bundle']
    }),
    new CopyPlugin({
        patterns: [

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
          },
          {
            from: 'node_modules/@dannymoerkerke/material-webcomponents/src/material-dropdown.js',
            to: '../dist/node_modules/@dannymoerkerke/material-webcomponents/src/material-dropdown.js'
          }
        ]
      }
    )
  ]
}
;
