import type {NextConfig} from 'next';
import {createRequire} from 'node:module';import {dirname,resolve} from 'node:path';
const require=createRequire(import.meta.url);
const connectorEntry=require.resolve('@wagmi/connectors',{paths:[dirname(require.resolve('wagmi/package.json'))]});
// Only WalletConnect is imported from this barrel. Resolve its own implementation
// to keep unrelated Coinbase/MetaMask SDK optional dependencies out of the bundle.
const config:NextConfig={experimental:{cpus:2},webpack:(config)=>{config.resolve.alias={...config.resolve.alias,'wagmi/connectors$':resolve(dirname(connectorEntry),'../walletConnect.js')};config.watchOptions={poll:1500,aggregateTimeout:300,ignored:['**/node_modules/**','**/.git/**','**/.next/**']};config.resolve.fallback={...config.resolve.fallback,fs:false,net:false,tls:false,'pino-pretty':false};return config;}};
export default config;
