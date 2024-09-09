

class NesAudio extends AudioWorkletProcessor {

    constructor(options) {
        super(options);
        this.sectionsize = options.processorOptions.sectionsize;
        this.empty = new Float32Array(this.sectionsize);
        this.playing = this.empty;
        this.startpoint = 0;
        this.upnext = { [0]:this.playing };
        this.furtheststored = 0;//not -1?

        this.port.onmessage = (e) => {
          if(e.data===null){//reset.
            this.furtheststored = 0;//not -1?
            this.playing = this.empty;
            this.startpoint = 0;
          } else {
            this.furtheststored++;
            this.port.postMessage(this.furtheststored);
            if(this.furtheststored<0){
              this.furtheststored = 0
            } else {
              if(this.furtheststored > 10){
                this.furtheststored = 10;//just dump it???
              }
            }
            this.upnext[this.furtheststored] = e.data;
          }
        };
      }


    process(inputs, outputs, parameters) {
      const output = outputs[0];
      output.forEach((channel) => {
        for (let i = 0; i < channel.length; i++) {//what if not exact fraction of sectionsize? todo.
          channel[i] = this.playing[i+this.startpoint];
        }
        this.startpoint+=channel.length;
        if(this.startpoint==this.sectionsize){
          this.startpoint = 0;
          this.playing = this.upnext[0];
          if(this.furtheststored>-1){
            for(let i = 0;i<this.furtheststored;i++){
              this.upnext[i] = this.upnext[i+1];
            }
          }
          this.furtheststored--;
        }
      });
      return true;
    }
}
  
registerProcessor("nesaudio", NesAudio);
  