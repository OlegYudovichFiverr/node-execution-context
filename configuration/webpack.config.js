const path = require('path');
const { isProduction, PRODUCTION} = require('../src/lib');

const root = path.resolve(__dirname, '..');

module.exports = {
    mode: process.env.NODE_ENV || PRODUCTION,
    devtool: 'source-map',
    entry: path.join(root, 'index.js'),
    target: 'node',
    output: {
        filename: 'index.js',
        path: path.join(root, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                include: root,
                exclude: /node_modules/
            }
        ]
    },
    optimization: {
        minimize: false
    },
    performance: {
        hints: isProduction() ? 'warning' : false
    },
    resolve: {
        extensions: ['.js', '.json']
    }
};
