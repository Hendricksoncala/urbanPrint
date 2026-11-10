import {cookies} from 'next/headers';import {SignJWT,jwtVerify} from 'jose';
const secret=new TextEncoder().encode(process.env.AUTH_SECRET||'dev-only-change-this-secret-before-deploying');
export async function setSession(user:{id:string;email:string;role:string}){const token=await new SignJWT(user).setProtectedHeader({alg:'HS256'}).setExpirationTime('7d').sign(secret);(await cookies()).set('up_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:604800});}
export async function session(){try{const t=(await cookies()).get('up_session')?.value;if(!t)return null;return (await jwtVerify(t,secret)).payload as {id:string;email:string;role:string};}catch{return null}}
