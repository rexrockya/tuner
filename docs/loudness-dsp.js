/* ITU-R BS.1770-5 / EBU Tech 3341, 3342. Mono/stereo digital input.
 * K-weighting biquads, 400 ms / 3 s windows; 10 ms maxima, 100 ms gating hop.
 * Exact energy order statistics avoid rescanning hours of blocks in the worklet.
 * TP interpolation: BS.1770 Annex 2, 4-phase / 48 coefficient FIR.
 */
(() => {
  const loudness = p => p > 0 ? -.691 + 10*Math.log10(p) : -Infinity;
  const ABS = 10**((-70+.691)/10);
  class EnergyTree {
    constructor(){this.root=null;this.seed=0x125984;}
    update(n){if(n){n.count=n.n+(n.left?.count||0)+(n.right?.count||0);n.sum=n.value*n.n+(n.left?.sum||0)+(n.right?.sum||0);}return n;}
    rotate(n,side){const child=n[side],other=side==='left'?'right':'left';n[side]=child[other];child[other]=this.update(n);return this.update(child);}
    insert(value){
      this.seed^=this.seed<<13;this.seed^=this.seed>>>17;this.seed^=this.seed<<5;
      const priority=this.seed>>>0;
      const add=n=>{if(!n)return{value,n:1,count:1,sum:value,priority,left:null,right:null};
        if(value===n.value)n.n++;else{const side=value<n.value?'left':'right';n[side]=add(n[side]);if(n[side].priority<n.priority)n=this.rotate(n,side);}return this.update(n);};
      this.root=add(this.root);
    }
    above(threshold,n=this.root){if(!n)return{count:0,sum:0};if(n.value<threshold)return this.above(threshold,n.right);
      const left=this.above(threshold,n.left);return{count:left.count+n.n+(n.right?.count||0),sum:left.sum+n.n*n.value+(n.right?.sum||0)};}
    at(rank){let n=this.root;while(n){const left=n.left?.count||0;if(rank<left)n=n.left;else if(rank<left+n.n)return n.value;else{rank-=left+n.n;n=n.right;}}return 0;}
    quantileAbove(threshold,p){const count=this.above(threshold).count;if(!count)return-Infinity;
      const skip=this.root.count-count,index=(count-1)*p,a=Math.floor(index),fraction=index-a;
      return loudness(this.at(skip+a))*(1-fraction)+loudness(this.at(skip+Math.ceil(index)))*fraction;}
  }
  function coefficients(rate){
    let k=Math.tan(Math.PI*1681.974450955533/rate),q=.7071752369554196,d=1+k/q+k*k;
    const vh=10**(3.999843853973347/20),vb=vh**.4996667741545416;
    const shelf=[(vh+vb*k/q+k*k)/d,2*(k*k-vh)/d,(vh-vb*k/q+k*k)/d,2*(k*k-1)/d,(1-k/q+k*k)/d];
    k=Math.tan(Math.PI*38.13547087602444/rate);q=.5003270373238773;d=1+k/q+k*k;
    return[shelf,[1,-2,1,2*(k*k-1)/d,(1-k/q+k*k)/d]];
  }
  class Filter {
    constructor(c){this.c=c;this.x1=this.x2=this.y1=this.y2=0;}
    run(x){const c=this.c,y=c[0]*x+c[1]*this.x1+c[2]*this.x2-c[3]*this.y1-c[4]*this.y2;this.x2=this.x1;this.x1=x;this.y2=this.y1;this.y1=y;return y;}
  }
  const FIR=[
    [.001708984375,.010986328125,-.0196533203125,.033203125,-.0594482421875,.1373291015625,.97216796875,-.102294921875,.047607421875,-.026611328125,.014892578125,-.00830078125],
    [-.0291748046875,.029296875,-.0517578125,.089111328125,-.16650390625,.465087890625,.77978515625,-.2003173828125,.1015625,-.0582275390625,.0330810546875,-.0189208984375],
    [-.0189208984375,.0330810546875,-.0582275390625,.1015625,-.2003173828125,.77978515625,.465087890625,-.16650390625,.089111328125,-.0517578125,.029296875,-.0291748046875],
    [-.00830078125,.014892578125,-.026611328125,.047607421875,-.102294921875,.97216796875,.1373291015625,-.0594482421875,.033203125,-.0196533203125,.010986328125,.001708984375]
  ];
  class ProgrammeMeter {
    constructor(rate,channels=1){
      if(![1,2].includes(channels)||rate<32000)throw Error('LUFS 支持 32 kHz 及以上的单声道或立体声输入');
      this.rate=rate;this.channels=channels;this.hop=Math.round(rate/10);this.quantum=Math.round(rate/100);this.reset();
    }
    reset(){
      this.filters=Array.from({length:this.channels},()=>coefficients(this.rate).map(c=>new Filter(c)));
      this.delay=Array.from({length:this.channels},()=>new Float64Array(12));this.delayAt=0;
      this.ring=new Float64Array(300);this.chunks=0;this.partial=0;this.energy=0;this.totalFrames=0;this.integratedFrames=0;this.activeFrames=0;
      this.blocks=new EnergyTree();this.shortBlocks=new EnergyTree();this.paused=false;this.tp=0;this.samplePeak=0;this.maxM=-Infinity;this.maxS=-Infinity;
      this.latest={momentary:-Infinity,shortTerm:-Infinity,integrated:-Infinity,lra:null,truePeak:-Infinity,maxM:-Infinity,maxS:-Infinity,seconds:0,integratedSeconds:0,paused:false};
    }
    pause(value){this.paused=Boolean(value);this.activeFrames=0;this.delay.forEach(d=>d.fill(0));this.delayAt=0;}
    frame(channels,i){
      let power=0;
      for(let c=0;c<this.channels;c++){
        const x=channels[c]?.[i]||0,f=this.filters[c],y=f[1].run(f[0].run(x));
        power+=y*y; // BS.1770: SUM independent channel energies, no stereo averaging.
        const delay=this.delay[c];delay[this.delayAt]=x;
        if(!this.paused){this.samplePeak=Math.max(this.samplePeak,Math.abs(x));
          for(let phase=0;phase<4;phase++){let out=0,at=this.delayAt;for(let t=0;t<12;t++){out+=delay[at]*FIR[phase][t];if(--at<0)at=11;}this.tp=Math.max(this.tp,Math.abs(out));}}
      }
      this.delayAt=(this.delayAt+1)%12;this.totalFrames++;
      if(!this.paused){this.integratedFrames++;this.activeFrames++;}
      this.energy+=power;
      if(++this.partial<this.quantum)return false;
      this.ring[this.chunks%300]=this.energy/this.quantum;this.chunks++;this.partial=0;this.energy=0;
      let m=0,s=0;for(let j=0;j<Math.min(this.chunks,300);j++){const v=this.ring[(this.chunks-1-j+300)%300];s+=v;if(j<40)m+=v;}
      m=this.chunks>=40?m/40:0;s=this.chunks>=300?s/300:0;
      const ml=loudness(m),sl=loudness(s);
      if(!this.paused){
        if(this.activeFrames>=4*this.hop){this.maxM=Math.max(this.maxM,ml);if(this.chunks%10===0&&m>=ABS)this.blocks.insert(m);}
        if(this.activeFrames>=30*this.hop){this.maxS=Math.max(this.maxS,sl);if(this.chunks%10===0&&s>=ABS)this.shortBlocks.insert(s);}
      }
      if(this.chunks%10!==0)return false;
      const all=this.blocks.root,gate=all?Math.max(ABS,all.sum/all.count*.1):ABS,gated=this.blocks.above(gate);
      const st=this.shortBlocks.root,lraGate=st?Math.max(ABS,st.sum/st.count*.01):ABS,lraCount=this.shortBlocks.above(lraGate).count;
      this.latest={momentary:ml,shortTerm:sl,integrated:loudness(gated.count?gated.sum/gated.count:0),
        lra:lraCount>1?this.shortBlocks.quantileAbove(lraGate,.95)-this.shortBlocks.quantileAbove(lraGate,.1):null,
        truePeak:this.tp>0?20*Math.log10(Math.max(this.tp,this.samplePeak)):-Infinity,
        maxM:this.maxM,maxS:this.maxS,seconds:this.totalFrames/this.rate,integratedSeconds:this.integratedFrames/this.rate,paused:this.paused,
        gate:loudness(gate),blocks:all?.count||0,channels:this.channels};
      return true;
    }
    process(channels,onUpdate){for(let i=0;i<(channels[0]?.length||0);i++)if(this.frame(channels,i))onUpdate?.(this.latest);return this.read();}
    read(){return{...this.latest,truePeak:this.tp>0?20*Math.log10(Math.max(this.tp,this.samplePeak)):-Infinity,maxM:this.maxM,maxS:this.maxS,seconds:this.totalFrames/this.rate,integratedSeconds:this.integratedFrames/this.rate,paused:this.paused,channels:this.channels};}
  }
  globalThis.ProgrammeLoudness={ProgrammeMeter,EnergyTree,loudness,coefficients};
})();
