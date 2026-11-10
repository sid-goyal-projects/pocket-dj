function analyzeCore(x, sr, hint){
  const n=x.length, dur=n/sr, hop=Math.max(1,Math.round(sr/100)), fps=sr/hop, nf=Math.floor(n/hop);
  // two cascaded RBJ low-pass filters at 140 Hz (kick and bass band)
  const w0=2*Math.PI*140/sr, cs=Math.cos(w0), al=Math.sin(w0)/(2*0.7071), a0=1+al;
  const b0=(1-cs)/2/a0, b1=(1-cs)/a0, b2=b0, a1=-2*cs/a0, a2=(1-al)/a0;
  let x1=0,x2=0,y1=0,y2=0,u1=0,u2=0,z1=0,z2=0;
  const coef=(type,f0)=>{ const w=2*Math.PI*f0/sr, c=Math.cos(w), a=Math.sin(w)/(2*0.7071), n0=1+a;
    return type==='hp'?[(1+c)/2/n0,-(1+c)/n0,(1+c)/2/n0,-2*c/n0,(1-a)/n0]:[(1-c)/2/n0,(1-c)/n0,(1-c)/2/n0,-2*c/n0,(1-a)/n0]; };
  const H=coef('hp',400), Lp=coef('lp',3000);
  let h1=0,h2=0,hy1=0,hy2=0,m1=0,m2=0,my1=0,my2=0;
  const aF=new Float32Array(nf), aL=new Float32Array(nf), aM=new Float32Array(nf);
  for(let f=0;f<nf;f++){
    let sF=0,sL=0,sM=0; const o=f*hop;
    for(let i=0;i<hop;i++){
      const v=x[o+i]; sF+=v*v;
      const y=b0*v+b1*x1+b2*x2-a1*y1-a2*y2; x2=x1;x1=v;y2=y1;y1=y;
      const z=b0*y+b1*u1+b2*u2-a1*z1-a2*z2; u2=u1;u1=y;z2=z1;z1=z;
      sL+=z*z;
      const hy=H[0]*v+H[1]*h1+H[2]*h2-H[3]*hy1-H[4]*hy2; h2=h1;h1=v;hy2=hy1;hy1=hy;
      const my=Lp[0]*hy+Lp[1]*m1+Lp[2]*m2-Lp[3]*my1-Lp[4]*my2; m2=m1;m1=hy;my2=my1;my1=my;
      sM+=my*my;
    }
    aF[f]=Math.sqrt(sF/hop); aL[f]=Math.sqrt(sL/hop); aM[f]=Math.sqrt(sM/hop);
  }
  let mF=1e-9,mL=1e-9; for(let f=0;f<nf;f++){ if(aF[f]>mF)mF=aF[f]; if(aL[f]>mL)mL=aL[f]; }
  // onset strength
  const on=new Float32Array(nf);
  for(let f=1;f<nf;f++) on[f]=0.65*Math.max(0,aL[f]-aL[f-1])/mL+0.35*Math.max(0,aF[f]-aF[f-1])/mF;
  const ps=new Float64Array(nf+1); for(let f=0;f<nf;f++) ps[f+1]=ps[f]+on[f];
  const W=10, on2=new Float32Array(nf);
  for(let f=0;f<nf;f++){ const a=Math.max(0,f-W), b=Math.min(nf,f+W+1); on2[f]=Math.max(0,on[f]-(ps[b]-ps[a])/(b-a)); }
  const om=new Float32Array(nf);
  for(let f=0;f<nf;f++) om[f]=Math.max(on2[f], f>0?on2[f-1]:0, f<nf-1?on2[f+1]:0);

  let bpm=0, beat0=0, beatSec=0.5, conf=0, reliable=false, barT=[];
  if(dur>=20){
    const minL=Math.floor(fps*60/180), maxL=Math.ceil(fps*60/70);
    let bestL=minL, bestS=-1;
    for(let L=minL;L<=maxL;L++){
      let s=0; for(let i=0;i<nf-L;i++) s+=on2[i]*on2[i+L]; s/=(nf-L);
      const b=60*fps/L; let w=Math.exp(-0.5*Math.pow(Math.log2(b/122)/0.6,2));
      if(hint>40){ let d=9; for(const f of [1,2,0.5]) d=Math.min(d,Math.abs(Math.log2(b/(hint*f)))); w*=0.15+Math.exp(-0.5*Math.pow(d/0.04,2)); } // trust Audius's tempo estimate
      if(s*w>bestS){bestS=s*w;bestL=L;}
    }
    let bP=bestL,bPh=0,bSc=-1,bMean=1;
    for(let P=bestL-1.5;P<=bestL+1.5;P+=0.02){
      let mx=-1,mph=0,sum=0,cnt=0;
      for(let ph=0;ph<P;ph+=1){
        let s=0; for(let t=ph;t<nf-1;t+=P) s+=om[Math.round(t)];
        sum+=s;cnt++; if(s>mx){mx=s;mph=ph;}
      }
      if(mx>bSc){bSc=mx;bP=P;bPh=mph;bMean=sum/cnt;}
    }
    let fPh=bPh, fS=-1;
    for(let ph=bPh-1;ph<=bPh+1.001;ph+=0.1){
      if(ph<0) continue; let s=0;
      for(let t=ph;t<nf-1;t+=bP){ const i=Math.floor(t), fr=t-i; s+=on2[i]*(1-fr)+on2[i+1]*fr; }
      if(s>fS){fS=s;fPh=ph;}
    }
    conf=bSc/(bMean||1e-9); reliable=conf>2.3;
    if(!reliable&&hint>40&&conf>1.5){ const b=60*fps/bP; let d=9; for(const f of [1,2,0.5]) d=Math.min(d,Math.abs(Math.log(b/(hint*f)))); if(d<0.02) reliable=true; } // two independent estimates agree
    beatSec=bP/fps; beat0=fPh/fps; bpm=60/beatSec;
    if(reliable){
      const nb=Math.floor((nf-2-fPh)/bP), sc=[0,0,0,0];
      for(let k=1;k<nb-1;k++){
        const f0=Math.round(fPh+(k-1)*bP), f1=Math.round(fPh+k*bP), f2=Math.round(fPh+(k+1)*bP);
        let be=0,af=0; for(let f=f0;f<f1;f++) be+=aF[f]; for(let f=f1;f<f2;f++) af+=aF[f];
        be/=Math.max(1,f1-f0); af/=Math.max(1,f2-f1);
        sc[k%4]+=Math.max(0,af-be)/mF+0.3*om[f1];
      }
      let db=0; for(let i=1;i<4;i++) if(sc[i]>sc[db]) db=i;
      for(let k=db;k<=nb;k+=4) barT.push(beat0+k*beatSec);
    }
  }
  if(!reliable){ barT=[]; for(let t=0;t<dur;t+=2) barT.push(t); }
  if(barT.length<2) barT=[0,dur/2];
  const nbars=barT.length, barE=new Float32Array(nbars), barM=new Float32Array(nbars);
  for(let j=0;j<nbars;j++){
    const a=Math.floor(barT[j]*fps), b=Math.min(nf,Math.floor((j+1<nbars?barT[j+1]:dur)*fps));
    let s=0,sm=0; for(let f=a;f<b;f++){ s+=aF[f]; sm+=aM[f]; } barE[j]=b>a?s/(b-a):0; barM[j]=b>a?sm/(b-a):0;
  }
  const pct=(arr,q)=>{ const so=Array.from(arr).sort((p,r)=>p-r); return so[Math.floor(so.length*q)]||1e-9; };
  const p80=pct(barE,0.8), m80=pct(barM,0.8);
  const avgM=(a,b)=>{a=Math.max(0,a);b=Math.min(nbars,b);if(b<=a)return 0;let s=0;for(let j=a;j<b;j++)s+=barM[j];return s/(b-a);};
  const avg=(a,b)=>{a=Math.max(0,a);b=Math.min(nbars,b);if(b<=a)return 0;let s=0;for(let j=a;j<b;j++)s+=barE[j];return s/(b-a);};
  const barIdx=sec=>{for(let j=0;j<nbars;j++) if(barT[j]>=sec) return j; return nbars-1;};
  let startBar=0; while(startBar<nbars-1 && barE[startBar]<0.03*p80) startBar++;
  let introBar=startBar;
  // the intro ends when the track is both loud and full in the vocal/melody range
  for(let j=startBar;j<nbars*0.45;j++){ if(avg(j,j+4)>=0.72*p80&&avgM(j,j+4)>=0.6*m80){introBar=j;break;} }
  if(reliable){ const L=introBar-startBar, r8=Math.round(L/8)*8; if(r8>0&&Math.abs(L-r8)<=2&&startBar+r8<nbars) introBar=startBar+r8; }
  let dropBar=introBar, dS=-1;
  const jMin=Math.max(4,introBar+4,barIdx(15)), jMax=Math.floor(nbars*0.7);
  for(let j=jMin;j<=jMax;j++){
    const rise=(avg(j,j+4)-avg(j-4,j))/p80;
    if(rise<0.2) continue;
    const s=rise+0.4*avg(j,j+8)/p80;
    if(s>dS){dS=s;dropBar=j;}
  }
  if(dS<0) dropBar=introBar;
  let outroBar=nbars-1; while(outroBar>introBar && barE[outroBar]<0.55*p80) outroBar--;
  const cols=1200, wF=new Float32Array(cols), wL=new Float32Array(cols);
  for(let c=0;c<cols;c++){
    const a=Math.floor(c*nf/cols), b=Math.max(a+1,Math.floor((c+1)*nf/cols));
    let mf=0,ml=0; for(let f=a;f<b&&f<nf;f++){ if(aF[f]>mf)mf=aF[f]; if(aL[f]>ml)ml=aL[f]; }
    wF[c]=mf/mF; wL[c]=ml/mL;
  }
  return {dur,fps,bpm,beat0,beatSec,conf,reliable,barT,barE,p80,startBar,introBar,dropBar,outroBar,onset:on2,wF,wL};
}

