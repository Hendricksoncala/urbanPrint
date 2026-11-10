type Entry={hits:number;reset:number};const root=globalThis as typeof globalThis&{__urbanPrintLimits?:Map<string,Entry>};const limits=root.__urbanPrintLimits??(root.__urbanPrintLimits=new Map());
/** In-process fixed window: five lookups per client IP every fifteen minutes. */
export function allowTrackingAttempt(ip:string,now=Date.now()){const key=ip.slice(0,100);const entry=limits.get(key);if(!entry||entry.reset<=now){limits.set(key,{hits:1,reset:now+15*60*1000});return true}if(entry.hits>=5)return false;entry.hits++;return true}
