import {NextResponse} from 'next/server';

// The hosted UI can start without a persistent API. These responses contain no
// market fixtures. Set NEXT_PUBLIC_API_URL to the HTTPS Nest API when ready.
export async function GET(request:Request) {
  const path=new URL(request.url).pathname;
  if(path==='/api/health') return NextResponse.json({status:'ok',chainId:56,mode:'undeployed',database:false});
  if(path==='/api/tokens') return NextResponse.json({items:[],verified:false});
  if(/^\/api\/tokens\/0x[a-fA-F0-9]{40}\/trades$/.test(path)) return NextResponse.json({items:[],verified:false});
  return NextResponse.json({error:'Not found'},{status:404});
}
export async function POST() {
  return NextResponse.json({error:'Persistent API is not configured. Set NEXT_PUBLIC_API_URL before enabling token launches.'},{status:503});
}
