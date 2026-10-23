import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const repositoryRoot=dirname(fileURLToPath(import.meta.url));
const connectorEntry=require.resolve('@wagmi/connectors',{
  paths:[dirname(require.resolve('wagmi/package.json'))],
});

/** @type {import('next').NextConfig} */
const config={
  outputFileTracingRoot:repositoryRoot,
  experimental:{cpus:2},
  webpack(config,{dev}){
    // Bundle only the connector we use, excluding unrelated optional wallet SDKs.
    config.resolve.alias={
      ...config.resolve.alias,
      'wagmi/connectors$':resolve(dirname(connectorEntry),'../walletConnect.js'),
    };
    if(dev){
      config.watchOptions={
        poll:1500,aggregateTimeout:300,
        ignored:['**/node_modules/**','**/.git/**','**/.next*/**'],
      };
    }
    config.resolve.fallback={
      ...config.resolve.fallback,fs:false,net:false,tls:false,'pino-pretty':false,
    };
    return config;
  },
};
export default config;
