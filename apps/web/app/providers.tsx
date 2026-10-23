'use client';
import { WagmiProvider, createConfig, http, injected } from 'wagmi';
import {bsc} from 'wagmi/chains';
import {walletConnect} from 'wagmi/connectors';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {useState} from 'react';
const projectId=process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const config=createConfig({chains:[bsc],connectors:[injected(),...(projectId?[walletConnect({projectId,metadata:{name:'Verd',description:'BNB creator fee launchpad',url:process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000',icons:[]}})]:[])],transports:{[bsc.id]:http(process.env.NEXT_PUBLIC_BNB_RPC_URL||'https://bsc-dataseed.bnbchain.org')},ssr:true});
export function Providers({children}:{children:React.ReactNode}){const [client]=useState(()=>new QueryClient());return <WagmiProvider config={config}><QueryClientProvider client={client}>{children}</QueryClientProvider></WagmiProvider>}
