

class NesAudio extends AudioWorkletProcessor {

    constructor(...args) {
        super(...args);
        this.sectionsize = 1024;//pass in? todo.
        this.playing = new Float32Array(this.sectionsize);
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
        for (let i = 0; i < channel.length; i++) {//what if not exact fraction of sectionsize? todo.
          channel[i] = this.playing[i+this.startpoint];
        }
        this.startpoint+=channel.length;
        if(this.startpoint==this.sectionsize){
          this.startpoint = 0;
          if(this.furtheststored>-1){
            this.playing = this.upnext[0];
            for(let i = 0;i<this.furtheststored;i++){
              this.upnext[i] = this.upnext[i+1];
            }
            this.furtheststored--;
            if(this.furtheststored > 3){
              //console.log("skippy!!")
              this.furtheststored = 0;//just dump it. what else will work??
              //this.port.postMessage(true);
            }
          }/* else {
            console.log("short!!");
            //this.port.postMessage(false);
          }*/
        }
      });
      return true;
    }
}
  
registerProcessor("nesaudio", NesAudio);
  