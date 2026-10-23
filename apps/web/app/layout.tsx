import type { Metadata } from 'next';
import './globals.css';
import {Providers} from './providers';
export const metadata:Metadata={title:'Verdant — Put fees to work',description:'Programmable creator fees on BNB Chain. Launch tokens with transparent economic infrastructure.',icons:{icon:[{url:'/images/verdant-logo.png',type:'image/png'}],apple:'/images/verdant-logo.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
