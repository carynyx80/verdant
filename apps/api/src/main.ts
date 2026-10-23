import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {Module,Controller,Get,Post,Body,Param,Req,UnauthorizedException,BadRequestException,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import {timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {createPublicClient,http} from 'viem';import {bsc} from 'viem/chains';
const db=process.env.DATABASE_URL?new PrismaClient():null;
const json=(value:unknown)=>JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v));
const address=z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const url=z.string().max(512).refine(v=>v===''||/^https:\/\//.test(v)||/^ipfs:\/\//.test(v),'HTTPS or IPFS URL required');
const metadata=z.object({name:z.string().trim().min(1).max(64),symbol:z.string().trim().regex(/^[A-Z0-9]{1,12}$/),description:z.string().max(2000),image:url,website:url,x:url,telegram:url});
@Controller()
class API {
 @Get('health') health(){return {status:'ok',chainId:56,mode:process.env.FACTORY_ADDRESS?'configured':'undeployed',database:!!db};}
 @Get('tokens') async tokens(){if(!db||!process.env.FACTORY_ADDRESS)return {items:[],verified:false};const checkpoint=await db.checkpoint.findUnique({where:{id:'bsc'}});if(!checkpoint)return {items:[],verified:false};if(!process.env.BNB_RPC_URL)throw new ServiceUnavailableException('Chain verification unavailable');try{const client=createPublicClient({chain:bsc,transport:http(process.env.BNB_RPC_URL,{timeout:10000})});const [canonical,head]=await Promise.all([client.getBlock({blockNumber:checkpoint.blockNumber}),client.getBlockNumber()]);if(canonical.hash!==checkpoint.blockHash||head-checkpoint.blockNumber>300n)throw Error('stale checkpoint');}catch{throw new ServiceUnavailableException('Indexer data requires reconciliation');}return {items:json(await db.token.findMany({orderBy:{blockNumber:'desc'},take:200})),verified:true};}
 @Get('tokens/:address/trades') async trades(@Param('address') a:string){if(!address.safeParse(a).success)throw new BadRequestException('Invalid address');return {items:db?json(await db.trade.findMany({where:{token:a.toLowerCase()},orderBy:{blockNumber:'desc'},take:100})):[]};}
 @Get('metadata/:id') async getMetadata(@Param('id') id:string){if(!db)throw new ServiceUnavailableException('Database not configured');const m=await db.tokenMetadata.findUnique({where:{id}});if(!m)throw new NotFoundException();return m.payload;}
 @Post('metadata') async saveMetadata(@Body() body:unknown){if(!db)throw new ServiceUnavailableException('Database not configured');const parsed=metadata.safeParse(body);if(!parsed.success)throw new BadRequestException(parsed.error.flatten());const m=await db.tokenMetadata.create({data:{payload:parsed.data}});return {uri:`${process.env.PUBLIC_API_URL||'http://localhost:3001'}/metadata/${m.id}`};}
 @Get('admin/health') async admin(@Req() req:{headers:{authorization?:string}}){const configured=process.env.ADMIN_API_TOKEN;const supplied=req.headers.authorization?.replace(/^Bearer /,'')||'';if(!configured||configured.length<32||Buffer.byteLength(configured)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(configured),Buffer.from(supplied)))throw new UnauthorizedException();return {database:db?await db.$queryRaw`SELECT 1`:null,checkpoint:db?json(await db.checkpoint.findUnique({where:{id:'bsc'}})):null};}
}
@Module({controllers:[API]})class AppModule{}
async function main(){const app=await NestFactory.create(AppModule,{logger:['error','warn','log']});app.enableCors({origin:(process.env.WEB_ORIGIN||'http://localhost:3000').split(','),methods:['GET','POST']});app.enableShutdownHooks();await app.listen(Number(process.env.PORT||3001),'127.0.0.1');}
main().catch(e=>{console.error(e.message);process.exitCode=1});
