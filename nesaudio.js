

class NesAudio extends AudioWorkletProcessor {

    constructor(...args) {
        super(...args);
        this.playing = new Float32Array(1024);
        this.startpoint = 0;
        this.upnext = {};
        this.furtheststored = -1;

        this.port.onmessage = (e) => {
          this.furtheststored++;
          this.upnext[this.furtheststored] = e.data;
        };
      }


    process(inputs, outputs, parameters) {
      const output = outputs[0];
      output.forEach((channel) => {
        for (let i = 0; i < channel.length; i++) {
          channel[i] = this.playing[i+this.startpoint];
        }
        this.startpoint+=channel.length;
        if(this.startpoint==1024){
          this.startpoint = 0;
          if(this.furtheststored>-1){
            this.playing = this.upnext[0];
            for(let i = 0;i<this.furtheststored;i++){
              this.upnext[i] = this.upnext[i+1];
            }
            this.furtheststored--;
            if(this.furtheststored > 3){
              this.furtheststored = 0;//just dump it. what else will work??
              //this.port.postMessage(true);
            }
          }/* else {
            //this.port.postMessage(false);
          }*/
        }
      });
      return true;
    }
}
  
registerProcessor("nesaudio", NesAudio);
  