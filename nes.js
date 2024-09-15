import touchcon from './touchcon.js'

const searchParams = new URLSearchParams(window.location.search);
const debug = searchParams.has("debug");






function getelement(eltype, eltext=null, attribs=[]){
    const thiselement = document.createElement(eltype);
    if(eltext!==null){
        thiselement.appendChild(document.createTextNode(eltext));
    }
    attribs.forEach( thisattrib => {
        const attrib = document.createAttribute(thisattrib.name);
        attrib.value = thisattrib.val;
        thiselement.setAttributeNode(attrib);
    });
    return thiselement;
}

function getanchor(anchortext,linkaddress = null){
    return getelement("a", anchortext, [{ name:"href", val:linkaddress!==null?linkaddress:anchortext}] );
}

function getanchorinelement(eltype, anchortext, linkaddress = null){
    const thiselement = document.createElement(eltype);
    thiselement.appendChild(getanchor(anchortext,linkaddress));
    return thiselement;
}

function addbutton(addtoelement=null, buttontext="a button", thefunc = async (event)=>{console.log(event);} ){
    const thisbutton= getelement("button",buttontext );
    thisbutton.addEventListener('click', thefunc, false );//bubbling/capturing?
    if(addtoelement!==null){
        addtoelement.appendChild(thisbutton);
    }
    return thisbutton;
}

function addfileselect(addtoelement=null, thefunc = async (event)=>{console.log(event);} ){
    const thisfs= getelement("input",null,[  {name:"type", val:"file"}]);
                                            //,{name:"multiple", val:null}]);
    thisfs.addEventListener('change', thefunc );
    if(addtoelement!==null){
        addtoelement.appendChild(thisfs);
    }
    return thisfs;
}

function addcanvas(addtoelement=null, x, y ){
    const thiscanv= getelement("canvas",null,[  {name:"width", val:x}
                                                ,{name:"height", val:y}]);
    if(addtoelement!==null){
        addtoelement.appendChild(thiscanv);
    }
    return thiscanv;
}





const colours = new Uint8Array([
    84, 84, 84, 255,
    0, 30, 116, 255,
    8, 16, 144, 255,
    48, 0, 136, 255,
    68, 0, 100, 255,
    92, 0, 48, 255,
    84, 4, 0, 255,
    60, 24, 0, 255,
    32, 42, 0, 255,
    8, 58, 0, 255,
    0, 64, 0, 255,
    0, 60, 0, 255,
    0, 50, 60, 255,
    0, 0, 0, 255,
    0, 0, 0, 255,
    0, 0, 0, 255,
    152, 150, 152, 255,
    8, 76, 196, 255,
    48, 50, 236, 255,
    92, 30, 228, 255,
    136, 20, 176, 255,
    160, 20, 100, 255,
    152, 34, 32, 255,
    120, 60, 0, 255,
    84, 90, 0, 255,
    40, 114, 0, 255,
    8, 124, 0, 255,
    0, 118, 40, 255,
    0, 102, 120, 255,
    0, 0, 0, 255,
    0, 0, 0, 255,
    0, 0, 0, 255,
    236, 238, 236, 255,
    76, 154, 236, 255,
    120, 124, 236, 255,
    176, 98, 236, 255,
    228, 84, 236, 255,
    236, 88, 180, 255,
    236, 106, 100, 255,
    212, 136, 32, 255,
    160, 170, 0, 255,
    116, 196, 0, 255,
    76, 208, 32, 255,
    56, 204, 108, 255,
    56, 180, 204, 255,
    60, 60, 60, 255,
    0, 0, 0, 255,
    0, 0, 0, 255,
    236, 238, 236, 255,
    168, 204, 236, 255,
    188, 188, 236, 255,
    212, 178, 236, 255,
    236, 174, 236, 255,
    236, 174, 212, 255,
    236, 180, 176, 255,
    228, 196, 144, 255,
    204, 210, 120, 255,
    180, 222, 120, 255,
    168, 226, 144, 255,
    152, 226, 180, 255,
    160, 214, 228, 255,
    160, 162, 160, 255,
    0, 0, 0, 255,
    0, 0, 0, 255
]);



const nesvars = {
                    sizeofscreenarray:(256*240*4),
                    sizeofpalettearray:(64*8*4),
                    sizeofframesamplebuffer:29781,//-0.5
                    nes_refresh:60,
                    input_p1:0,
                    input_gamepads:{},
                    audio:{
                        muted:false,
                        usergain:1
                    }
                };


async function createNES(romdataarraybuffer) {
    if(nesvars.wasm_screenptr===undefined){
        nesvars.video_ctx = nesvars.video_canvas.getContext("2d");
        nesvars.video_imagedata = nesvars.video_ctx.createImageData(256,240);

        nesvars.wasm_screenptr = Module._malloc(nesvars.sizeofscreenarray);
        //Module.HEAPU8.subarray(nesvars.wasm_screenptr, nesvars.wasm_screenptr+nesvars.sizeofscreenarray).fill(255);
        
        nesvars.wasm_paletteptr = Module._malloc(nesvars.sizeofpalettearray);
        const palview = Module.HEAPU8.subarray(nesvars.wasm_paletteptr, nesvars.wasm_paletteptr+nesvars.sizeofpalettearray);
        palview.set(colours);
        //other emphasis bit variations? todo

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
    checkpads();
    //zelda kill streak: screenlog(nesvars.cpumem[0x50],false,true);

    if(nesvars.wasm_romfileptr===undefined){
        console.log("no rom file");
        if(nesvars.nes_running!==undefined){
            runnes();
        }
        return;
    }
    
    const audioframes = Module.ccall("processNESFrame", "number", ["number", "number"], [nesvars.input_p1 | touchcon.state, 0] );
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
    
    nesvars.screencanv.ctx.drawImage(nesvars.video_canvas,0,0,256,240,
        nesvars.screencanv.coords.x, nesvars.screencanv.coords.y, nesvars.screencanv.coords.w, nesvars.screencanv.coords.h);

}




let missedcount = 0;

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
        screenlog(message);
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
                    missedcount++;
                    screenlog("buffer underruns:"+missedcount,false,true);
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






function checkpads(){
    for(const gamepad of navigator.getGamepads()){
        if(!gamepad) continue;
        /*if(gamepad.index!==0){
            continue;
        }*/
        for(const [i, button] of gamepad.buttons.entries()){
            const index = {//xbox360/linux
                0:0,
                3:1,
                8:2,
                9:3,
                12:4,
                13:5,
                14:6,
                15:7
            }[i];
            if(index!==undefined){
                setinputfromindex(index,button.pressed);
            }
        }
        for(const [i, axis] of gamepad.axes.entries()){
            //console.log(axis);
        }
    }
}

function setinput(key,pressed){
    const index = {
        "x":0,//A
        "z":1,//B
        "c":2,//Select
        "v":3,//Start
        "ArrowUp":4,
        "ArrowDown":5,
        "ArrowLeft":6,
        "ArrowRight":7,

        " ":0,//space, modern pc layout
        "Enter":1,
        "q":2,
        "e":3,
        "w":4,
        "s":5,
        "a":6,
        "d":7,
    }[key];
    if(index===undefined){
        return false;
    }
    setinputfromindex(index,pressed);
    return true;
}

function setinputfromindex(index,pressed){
    const bit = (1<<index);
    if(pressed===true){
        nesvars.input_p1 |= bit;
    } else {
        nesvars.input_p1 &= ~bit;
    }
}


function gamepadHandler(event, connected) {
    const gamepad = event.gamepad;  
    if (connected) {
      nesvars.input_gamepads[gamepad.index] = gamepad;
    } else {
      delete nesvars.input_gamepads[gamepad.index];
    }
    //console.log(nesvars);
}


function registercontrollers(){
    window.addEventListener(
        "keydown",
        (event) => {
            if (event.defaultPrevented) {
                return;
            }
            if(event.key==="Escape"){
                runnes();
                return;
            }
            if(setinput(event.key,true)){
                event.preventDefault();
            }
        },
        true,
    );
    window.addEventListener(
        "keyup",
        (event) => {
            if (event.defaultPrevented) {
                return;
            }
            if(setinput(event.key,false)){
                event.preventDefault();
            }
        },
        true,
    );

    

    window.addEventListener(
        "gamepadconnected",
        (e) => {
          gamepadHandler(e, true);
        },
        false,
      );
      window.addEventListener(
        "gamepaddisconnected",
        (e) => {
          gamepadHandler(e, false);
        },
        false,
    );

}

registercontrollers();




const passedromfile = async(event) => {
    const loadfileelement = event.target;    
    await createNES(await loadfileelement.files[0].arrayBuffer());
    loadfileelement.value = "";
}


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


nesvars.video_canvas = addcanvas(null,256,240);
addfileselect( document.getElementById("puthere") ,passedromfile);
nesvars.screencanv = touchcon.init( document.getElementById("puthere") );
addbutton(document.body,"Start/Pause",runnes);





function windowactivething(){

    let hidden, visibilityChange; 
    if (typeof document.hidden !== "undefined") {
        hidden = "hidden";
        visibilityChange = "visibilitychange";
    } else if (typeof document.mozHidden !== "undefined") {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }
    
    
    handleVisibilityChange = (event) => {
        //console.log(event);
        if (document[hidden]) {
            //console.log("hidey");
        } else {
            //console.log("show");
        }
    };
    
    document.addEventListener(visibilityChange, handleVisibilityChange  );
}
//windowactivething();//don't think this even works.. todo.





function screenlog(message, tojson = false, clear = false){
    if(tojson===true){
        message = JSON.stringify(message);
    }
    const el = document.getElementById("tommy");
    if(clear){
        el.innerText = "";
    }
    el.innerText+=message;
}

