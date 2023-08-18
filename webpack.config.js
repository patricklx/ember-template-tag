const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const base = {
    target: 'web',
    mode: 'production',
    entry: ["./lib/index.ts"],
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            assert: require.resolve('assert'),
            buffer: require.resolve('buffer'),
            '@babel/types': require.resolve('@babel/types'),
            fs: false,
            path: false,
            module: false,
            net: false
        }
    },
    plugins: [
        // fix "process is not defined" error:
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
    ],
    experiments: {
        outputModule: true
    },
    optimization: {
        usedExports: true,
        innerGraph: true,
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    ecma: undefined,
                    parse: {},
                    compress: {
                        hoist_funs: true
                    },
                    mangle: true, // Note `mangle.properties` is `false` by default.
                    module: false,
                    // Deprecated
                    output: null,
                    format: null,
                    toplevel: false,
                    nameCache: null,
                    ie8: false,
                    keep_classnames: undefined,
                    keep_fnames: false,
                    safari10: false,
                },
            })
        ]
    },
};

module.exports = [{
    ...base,
    output: {
        filename: 'browser-esm.js',
        library: {
            type: 'module'
        }
    }
}, {
    ...base,
    output: {
        filename: 'browser.js',
        library: {
            name: 'EmberTemplateTag',
            type: 'window'
        },
    }
}, {
    ...base,
    output: {
        filename: 'browser-amd.js',
        library: {
            name: 'EmberTemplateTag',
            type: 'amd'
        },
    }
}];