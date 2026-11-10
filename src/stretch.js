function stretchCore(chs, ratio, sr){
  // WSOLA time-stretch: changes tempo by `ratio` (>1 = faster) while keeping pitch.
  // 46 ms Hann frames, 50% overlap; each new frame is taken from near its nominal input
  // position at the offset that best lines up with the natural continuation of the last frame.
  const n=chs[0].length, N=2*Math.round(0.023*sr), Hs=N>>1, Ha=Hs*ratio;
  const delta=Math.round(0.012*sr), D=8, outLen=Math.floor(n/ratio);
  const win=new Float32Array(N); for(let i=0;i<N;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/N);
  const mono=new Float32Array(n);
  if(chs.length>1){ const a=chs[0], b=chs[1]; for(let i=0;i<n;i++) mono[i]=(a[i]+b[i])*0.5; } else mono.set(chs[0]);
  const nd=Math.floor(n/D), md=new Float32Array(nd);
  for(let i=0;i<nd;i++){ let s=0; for(let j=0;j<D;j++) s+=mono[i*D+j]; md[i]=s/D; }
  const out=chs.map(()=>new Float32Array(outLen+N));
  const L=Hs; // compare the overlap region
  const corr=(arr,p,q,len,step)=>{ let s=0,e=1e-9; for(let j=0;j<len;j+=step){ const b=arr[q+j]; s+=arr[p+j]*b; e+=b*b; } return s/Math.sqrt(e); };
  let prev=0;
  for(let k=0,op=0; op<outLen; k++,op+=Hs){
    const nominal=Math.round(k*Ha); let pos=nominal;
    if(k>0){
      const tgt=prev+Hs, lo=Math.max(0,nominal-delta), hi=Math.min(n-N-1,nominal+delta);
      if(tgt+L<n&&hi>lo){
        let best=lo,bs=-1e30;
        const tD=Math.floor(tgt/D), LD=Math.floor(L/D);
        for(let p=lo;p<=hi;p+=D){ const pD=Math.floor(p/D); if(pD+LD>=nd||tD+LD>=nd) break; const c=corr(md,tD,pD,LD,1); if(c>bs){bs=c;best=p;} }
        let fb=best, fs=-1e30;
        for(let p=Math.max(lo,best-D);p<=Math.min(hi,best+D);p++){ const c=corr(mono,tgt,p,L,2); if(c>fs){fs=c;fb=p;} }
        pos=fb;
      }
    }
    if(pos+N>n) pos=Math.max(0,n-N);
    for(let c=0;c<chs.length;c++){ const x=chs[c], o=out[c]; for(let i=0;i<N;i++) o[op+i]+=x[pos+i]*win[i]; }
    prev=pos;
  }
  return out.map(o=>o.subarray(0,outLen).slice());
}
