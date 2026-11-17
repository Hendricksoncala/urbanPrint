import {NextResponse} from 'next/server';
import {saveUpload} from '@/lib/uploads';
export const runtime='nodejs';
export async function POST(request:Request){
 const length=Number(request.headers.get('content-length')||0);
 if(length>10*1024*1024+256*1024)return NextResponse.json({error:'El archivo debe pesar máximo 10 MB.'},{status:413});
 try{
  const form=await request.formData();
  const file=form.get('file');
  if(!(file instanceof File))return NextResponse.json({error:'Falta el archivo.'},{status:400});
  const uploaded=await saveUpload(file);
  return NextResponse.json(uploaded,{status:201});
 }catch(error){
  const message=error instanceof Error?error.message:'No se pudo guardar el archivo.';
  return NextResponse.json({error:message},{status:400});
 }
}
