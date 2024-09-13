

class NesAudio extends AudioWorkletProcessor {

    constructor(options) {
      super(options);
      this.sectionsize = options.processorOptions.sectionsize;
      this.empty = new Float32Array(this.sectionsize);
      this.startpoint = 0;
      this.queue = { [0]:this.empty };
      this.furtheststored = 0;
      this.stopwatch = 0;

      this.port.onmessage = (e) => {
        const missedsections = this.furtheststored;
        if(e.data.sections.length>0){
          if(this.furtheststored<0){
            this.startpoint = 0;
            this.furtheststored = -1;
          }
          e.data.sections.forEach ( section=> {
            this.furtheststored++;
            this.queue[this.furtheststored] = section;
          });
        }
        const samplesofcurrentleft = this.sectionsize-this.startpoint;
        this.port.postMessage( { frame:e.data.frame, samplesdelta:this.stopwatch, ahead:this.furtheststored, missedsections, samplesofcurrentleft} );
        this.stopwatch = 0;

        if(this.furtheststored > 100){
          this.furtheststored = 0;//todo - reduce once working. just dump it, but let's hear it...
        }
      };
    }

    process(inputs, outputs, parameters) {
      const channel = outputs[0][0];//1 output, mono.
      for (let i = 0; i < channel.length; i++) {//what if not exact fraction of sectionsize? todo.
        channel[i] = this.queue[0][i+this.startpoint];
      }
      this.stopwatch+=channel.length;
      this.startpoint+=channel.length;
      if(this.startpoint==this.sectionsize){
        this.startpoint = 0;
        for(let i = 0;i<this.furtheststored;i++){
          this.queue[i] = this.queue[i+1];
        }
        this.furtheststored--;
      }
      return true;
    }
}
  
registerProcessor("nesaudio", NesAudio);
  