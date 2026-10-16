import { Config } from '@remotion/cli/config';

Config.setEntryPoint( './src/index.ts' );
Config.setCodec( 'h264' );
Config.setPixelFormat( 'yuv420p' );
Config.setVideoImageFormat( 'jpeg' );
Config.setJpegQuality( 92 );
Config.setConcurrency( 4 );
Config.setDelayRenderTimeoutInMilliseconds( 120_000 );

// Keep the repository's ESM convention of `.js` suffixes on relative TypeScript imports.
Config.overrideWebpackConfig( config => ( {
  ...config,
  resolve: { ...config.resolve, extensionAlias: { '.js': [ '.ts', '.tsx', '.js' ] } }
} ) );
