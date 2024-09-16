import nescolours from './nescolours.js'

let underruns = 0;

const nesvars = {
                    sizeofscreenarray:(256*240*4),
                    sizeofpalettearray:(64*8*4),
                    sizeofframesamplebuffer:29781,//-0.5
                    nes_refresh:60,
                    inputs:[0,0],
                    audio:{
                        muted:false,
                        usergain:1
                    }
                };





function getNESpalettebuffer(){
    if(nesvars.wasm_paletteptr===undefined){
        nesvars.wasm_paletteptr = Module._malloc(nesvars.sizeofpalettearray);
    }
    const palbuf = Module.HEAPU8.subarray(nesvars.wasm_paletteptr, nesvars.wasm_paletteptr+nesvars.sizeofpalettearray);
    return palbuf;
}

async function createNES(romdataarraybuffer) {
    if(nesvars.wasm_screenptr===undefined){
        nesvars.video_ctx = nesvars.video_canvas.getContext("2d");
        nesvars.video_imagedata = nesvars.video_ctx.createImageData(256,240);

        nesvars.wasm_screenptr = Module._malloc(nesvars.sizeofscreenarray);
        //Module.HEAPU8.subarray(nesvars.wasm_screenptr, nesvars.wasm_screenptr+nesvars.sizeofscreenarray).fill(255);
        
        getNESpalettebuffer().set(nescolours);//don't do here.. todo.

        nesvars.wasm_audiobufferptr = Module._malloc(nesvars.sizeofframesamplebuffer);
        nesvars.wasm_sramptr = Module._malloc(1024*8);

        nesvars.wasm_keyboardmatrix = Module._malloc(9);
        nesvars.input_kb = Module.HEAPU8.subarray(nesvars.wasm_keyboardmatrix, nesvars.wasm_keyboardmatrix+9);

        Module.ccall("clearMemory", null, ["number"], [nesvars.wasm_keyboardmatrix] );//it's big enough, use this...
        const pointers = Module.HEAPU32.subarray(nesvars.wasm_keyboardmatrix>>2, (nesvars.wasm_keyboardmatrix>>2)+2);
        nesvars.cpumem = Module.HEAPU8.subarray(pointers[0], pointers[0]+0x800);
        nesvars.ppumem = Module.HEAPU8.subarray(pointers[1], pointers[1]+0x800);
        nesvars.input_kb.fill(0);//but clear it..
    }

    if(nesvars.wasm_romfileptr!==undefined){
        destroynes();
    }

    if(nesvars.wasm_romfileptr===undefined){
        if(romdataarraybuffer===null){
            return;
        }
        nesvars.nes_framenumber = -1;
        nesvars.wasm_rombytecount = romdataarraybuffer.byteLength;
        nesvars.wasm_romfileptr = Module._malloc(nesvars.wasm_rombytecount);
        const romview = Module.HEAPU8.subarray(nesvars.wasm_romfileptr, nesvars.wasm_romfileptr+nesvars.wasm_rombytecount);
        romview.set(new Uint8Array(romdataarraybuffer));
    
        const nesstate = Module.ccall("createNES", "number", ["number", "number", "number", "number", "number", "number", "number"],
        [nesvars.wasm_screenptr, nesvars.wasm_paletteptr, nesvars.wasm_romfileptr, nesvars.wasm_rombytecount, nesvars.wasm_sramptr, nesvars.wasm_audiobufferptr, nesvars.wasm_keyboardmatrix ] );

        if( (nesstate&0x80000000)===0 ){
            console.log("file error");
            destroynes();
        } else {
            nesvars.nes_savesize = nesstate&~0x80000000;
            if(nesvars.nes_running===undefined){
                runnes();
            }
        }
    }
}




function destroynes(){
    Module.ccall("destroyNES", null, [], [] );
    Module._free(nesvars.wasm_romfileptr);
    nesvars.wasm_romfileptr = undefined;
}




function frameadvance(){
    nesvars.inputs = nesvars.getinputs();

    if(nesvars.wasm_romfileptr===undefined){
        console.log("no rom file");
        if(nesvars.nes_running!==undefined){
            runnes();
        }
        return;
    }
    
    const audioframes = Module.ccall("processNESFrame", "number", ["number", "number"], [nesvars.inputs[0], nesvars.inputs[1]] );
    const rawaudio = Module.HEAPU8.subarray(nesvars.wasm_audiobufferptr, nesvars.wasm_audiobufferptr+nesvars.sizeofframesamplebuffer);


    const oddeven = (nesvars.nes_framenumber)&0x01;
    if(nesvars.audio.nesnodemessage[oddeven].frame===nesvars.nes_framenumber){
        //const otherframe = 1-oddeven;
        nesvars.audio.advancer = (nesvars.sizeofframesamplebuffer-0.5)*nesvars.audio.deltabuffersize / nesvars.audio.deltasum;
        

        const offby = nesvars.audio.nesnodemessage[oddeven].missedsections-6;
        if(offby<0){
            nesvars.audio.advancer *= 1+(( offby )*0.001);//arbitrary bullshit. needs to relate to framerate??. todo.
        }
        if(offby>4){
            nesvars.audio.advancer *= 1+(( offby )*0.01);//arbitrary bullshit. needs to relate to framerate??. todo.
        }


        if(nesvars.audio.advancer<0.1){
            debugger;//debug - if it gets low, a frame will take a long time to get through, so hang..
        }
    }


    let startsection = nesvars.audio.writehead&nesvars.audio.ausectionmask;
    for(;nesvars.audio.readhead<audioframes;nesvars.audio.readhead+=nesvars.audio.advancer){
        nesvars.audio.aubuffer[nesvars.audio.writehead] = (rawaudio[Math.floor(nesvars.audio.readhead)] * 0.01) - 1;
        nesvars.audio.writehead=(nesvars.audio.writehead+1)&nesvars.audio.aubufmask;
    }
    nesvars.audio.readhead-=audioframes;

    const sectionstosend = [];
    for(    ;
            startsection!==(nesvars.audio.writehead&nesvars.audio.ausectionmask);
            startsection = (startsection+nesvars.audio.aubufsectionlength)&nesvars.audio.ausectionmask
        ){
        sectionstosend.push( nesvars.audio.aubuffer.subarray(startsection,startsection+nesvars.audio.aubufsectionlength) );
    }
    nesvars.nes_framenumber++;
    nesvars.audio.node_nes.port.postMessage( {frame:nesvars.nes_framenumber, sections:sectionstosend} );


    nesvars.video_imagedata.data.set(Module.HEAPU8.subarray(nesvars.wasm_screenptr, nesvars.wasm_screenptr+nesvars.sizeofscreenarray));
    nesvars.video_ctx.putImageData(nesvars.video_imagedata,0,0);


    nesvars.drawnes(nesvars.video_canvas);
}








async function setupaudio(create) {

    if(nesvars.audio.ctx===undefined){
        if(!window.AudioContext){
            if(!window.webkitAudioContext){//old convention
                return;//unsupported..
            }
            window.AudioContext = window.webkitAudioContext;
        }
        nesvars.audio.ctx = new AudioContext();
    }


    nesvars.audio.nessamplerate = (nesvars.sizeofframesamplebuffer-0.5)*nesvars.nes_refresh;
    const samplesperframe = nesvars.audio.ctx.sampleRate/nesvars.nes_refresh;
    const minbuffersizefromaudionode = 128;
    nesvars.audio.aubufsectionlength = minbuffersizefromaudionode;
    while(samplesperframe>nesvars.audio.aubufsectionlength){
        nesvars.audio.aubufsectionlength*=2;
    }

    nesvars.audio.fullaubuflength = nesvars.audio.aubufsectionlength*16;//todo.. multiplier affects how slow it can can go (for low cpu) before audio will settle running fraction of speed.

    nesvars.audio.aubufmask = nesvars.audio.fullaubuflength-1;
    nesvars.audio.ausectionmask = nesvars.audio.aubufmask^(nesvars.audio.aubufsectionlength-1);

    nesvars.audio.aubuffer = new Float32Array(nesvars.audio.fullaubuflength);
    nesvars.audio.readhead = 0;
    nesvars.audio.advancer = (nesvars.audio.nessamplerate/nesvars.audio.ctx.sampleRate);// * 1.0315;//why? who knows.


    nesvars.audio.nesnodemessage = { 0:{}, 1:{} };


    const addstub = ()=>{
        nesvars.audio.node_nes = { port:{postMessage:function(buf){
            //do something else??
        }}};
    }

    if(nesvars.audio.ctx.audioWorklet===undefined){
        const message = "audioWorklet unsupported. https issues??"
        addstub();
        debugger;
        return;
    }



    if(nesvars.audio.node_gain===undefined){
        //create, if we can.
        await nesvars.audio.ctx.audioWorklet.addModule("nesaudio.js")
        .then( resolved=>{}, rejected=>{
            console.log(rejected);
            addstub();
            return;
        });
        //no way to check if already done? what happens if it has???
    
        
        nesvars.audio.node_hipass = new BiquadFilterNode(nesvars.audio.ctx);
        nesvars.audio.node_hipass.type = "highpass";
        nesvars.audio.node_hipass.frequency.value = 25;
        nesvars.audio.node_hipass.Q.value = 1;
        //nesvars.audio.node_hipass.gain
    
        /*nesvars.audio.lowpassnode = new BiquadFilterNode(nesvars.audio.ctx);
        nesvars.audio.lowpassnode.type = "lowpass";
        nesvars.audio.lowpassnode.frequency.value = 10000;
        nesvars.audio.lowpassnode.Q.value = 1;*/
    
        nesvars.audio.node_gain = new GainNode(nesvars.audio.ctx);
        nesvars.audio.node_gain.gain.value = 1;
    
        //nesvars.audio.node_analyser = new AnalyserNode(nesvars.audio.ctx);
        
        nesvars.audio.node_hipass
        //.connect(nesvars.audio.lowpassnode)
            //.connect(nesvars.audio.node_analyser)
            .connect(nesvars.audio.node_gain)
            .connect(nesvars.audio.ctx.destination);
            

    }


    if(create===true){
        if(nesvars.audio.node_nes===undefined){

            nesvars.audio.node_nes = new AudioWorkletNode(
                nesvars.audio.ctx,
                "nesaudio", {
                    processorOptions:{
                        sectionsize: nesvars.audio.aubufsectionlength
                    }
                }
            );
            
            nesvars.audio.deltabitstoshiftby = 6;//0 minimum, 2 to the 6 = 64
            nesvars.audio.deltabuffersize = (1<<nesvars.audio.deltabitstoshiftby);
            nesvars.audio.deltamask = nesvars.audio.deltabuffersize-1;
            nesvars.audio.deltaindex = 0;
            nesvars.audio.deltas = [];
            for(let i =0;i<(nesvars.audio.deltabuffersize);i++){
                nesvars.audio.deltas.push( Math.floor(samplesperframe) );
            }
            nesvars.audio.deltasum = Math.floor(samplesperframe)*(nesvars.audio.deltabuffersize);
            
            //nesvars.audio.deltaaverage = Math.floor(samplesperframe);
                

            nesvars.audio.node_nes.port.onmessage = (e) => {
                //console.log(e.data.missedsections);
        
                if(e.data.missedsections<0){
                    underruns++;
                }
        
                const oddeven = (e.data.frame)&0x01;
                nesvars.audio.nesnodemessage[oddeven] = e.data;//todo - elsewhere?
        
                nesvars.audio.deltasum-=nesvars.audio.deltas[nesvars.audio.deltaindex];
                nesvars.audio.deltas[nesvars.audio.deltaindex] = e.data.samplesdelta;
                nesvars.audio.deltasum+=nesvars.audio.deltas[nesvars.audio.deltaindex];
                nesvars.audio.deltaindex = (nesvars.audio.deltaindex+1)&nesvars.audio.deltamask;
                
                //nesvars.audio.deltaaverage = nesvars.audio.deltasum>>nesvars.audio.deltabitstoshiftby;
        
            };
            nesvars.audio.node_nes.connect(nesvars.audio.node_hipass);
        }
    } else {
        if(nesvars.audio.node_nes!==undefined){
            nesvars.audio.node_nes.disconnect(nesvars.audio.node_hipass);
            nesvars.audio.node_nes = undefined;
        }
    }
}







nesvars.video_canvas = document.createElement("canvas");
const widthattrib = document.createAttribute("width");
widthattrib.value = 256;
nesvars.video_canvas.setAttributeNode(widthattrib);
const heightattrib = document.createAttribute("height");
heightattrib.value = 240;
nesvars.video_canvas.setAttributeNode(heightattrib);




const runnes = async (event) => {
    if(nesvars.nes_running===undefined){
        await setupaudio(true);
        nesvars.nes_running = setInterval(frameadvance, 1000/(nesvars.nes_refresh));
        nesvars.audio.muted = false;
    } else {
        clearInterval(nesvars.nes_running);
        await setupaudio(false);
        nesvars.nes_running = undefined;
        nesvars.audio.muted = true;
    }
    setgain();
}

function setgain(gain) {
    if(gain!==undefined){
        nesvars.audio.usergain = gain;
    }
    if(nesvars.audio.node_gain!==undefined){
        if(nesvars.audio.muted===true){
            nesvars.audio.node_gain.gain.value = 0;
        } else {
            nesvars.audio.node_gain.gain.value = nesvars.audio.usergain;
        }
    }
}



class nes{

    configurenes(drawnes, getinputseveryframe){
        nesvars.drawnes = drawnes;
        nesvars.getinputs = getinputseveryframe;
    }

    get palettebuffer() {
        return getNESpalettebuffer();
    }

    get bufferunderruns() {
        return underruns;
    }

    get cpumem() {
        return nesvars.cpumem;
    }

    get ppumem() {
        return nesvars.ppumem;
    }

    async loadrom(romarraybuffer){
        //todo - save data..

        await createNES(romarraybuffer);
    }

    async runnes(){
        await runnes();
    }

    setgain(value){
        setgain(value);
    }


}
export default new nes();

    }
    return fades;
}

*/