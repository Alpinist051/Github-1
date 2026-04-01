const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
    entry: {
        'virtual-background': {
            import: './src/index.ts',
            library: {
                name: 'VirtualBackground',
                type: 'umd',
            },
        },
        'demo-ui': './src/demo/main.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
        globalObject: 'self',
    },
    mode: 'production',
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        pure_funcs: ['console.log', 'console.warn'],
                    },
                },
            }),
        ],
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true,
                        appendTsSuffixTo: [/\.vue$/],
                        compilerOptions: {
                            module: 'esnext',
                            target: 'es5',
                            jsx: 'preserve',
                        },
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(woff2?|eot|ttf|otf|svg)$/i,
                type: 'asset/resource',
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js', '.vue'],
        alias: {
            vue$: 'vue/dist/vue.esm-bundler.js',
        },
    },
    plugins: [
        new webpack.DefinePlugin({
            __VUE_OPTIONS_API__: JSON.stringify(true),
            __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
        }),
        new VueLoaderPlugin(),
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
            chunks: ['virtual-background', 'demo-ui'],
            chunksSortMode: 'manual',
            inject: 'body',
            scriptLoading: 'defer',
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'models/selfie_segmenter.tflite'),
                    to: 'mediapipe/models',
                },
            ],
        }),
    ],
    devServer: {
        static: './dist',
        allowedHosts: ['.ngrok-free.dev'],
    },
};
