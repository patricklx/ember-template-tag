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
            fs: false,
            path: false,
            module: false,
            net: false
        }
    },
    experiments: {
        outputModule: true
    },
    optimization: {
        usedExports: true,
        innerGraph: true,
        minimize: true
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