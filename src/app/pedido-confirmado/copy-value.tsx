'use client';
import {useState} from 'react';
export default function CopyValue({value,label}:{value:string;label:string}){
 const [copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(value);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}}
 return <button type="button" className="button secondary" onClick={copy}>{copied?'Copiado ✓':label}</button>;
}
