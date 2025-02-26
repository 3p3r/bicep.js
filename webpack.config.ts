import path from "node:path";
import webpack from "webpack";
import CopyPlugin from "copy-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";

import "webpack-dev-server";

const config: webpack.Configuration = {
  extends: require.resolve("browserify-webpack-plugin"),
  devtool: false,
  mode: "production",
  entry: "./bicep.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bicep.js",
    clean: true,
  },
  optimization: {
    minimize: true,
    nodeEnv: false,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.[j|t]sx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
          compilerOptions: {
            sourceMap: false,
          },
        },
      },
      {
        test: /\.wasm$/,
        loader: "url-loader",
        options: {
          mimetype: "delete/me",
          limit: 15 * 1024 * 1024,
          // this removes the "data:<whatever>;base64," from the output bundle
          generator: (content: Buffer) => content.toString("base64"),
        },
      },
    ],
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "LICENSE", to: "." },
        { from: "README.md", to: "." },
        { from: "types.d.ts", to: "." },
        {
          from: "package.json",
          to: ".",
          transform: (content) => {
            const json = JSON.parse(content.toString());
            json.devDependencies = undefined;
            json.scripts = undefined;
            json.main = "./bicep.js";
            return JSON.stringify(json, null, 2);
          },
        },
      ],
    }),
  ],
};

export default config;
