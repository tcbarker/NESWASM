



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
    84, 84, 84,0,
    0, 30, 116,0,
    8, 16, 144,0,
    48, 0, 136,0,
    68, 0, 100,0,
    92, 0, 48,0,
    84, 4, 0,0,
    60, 24, 0,0,
    32, 42, 0,0,
    8, 58, 0,0,
    0, 64, 0,0,
    0, 60, 0,0,
    0, 50, 60,0,
    0, 0, 0,0,
    0, 0, 0,0,
    0, 0, 0,0,
    152, 150, 152,0,
    8, 76, 196,0,
    48, 50, 236,0,
    92, 30, 228,0,
    136, 20, 176,0,
    160, 20, 100,0,
    152, 34, 32,0,
    120, 60, 0,0,
    84, 90, 0,0,
    40, 114, 0,0,
    8, 124, 0,0,
    0, 118, 40,0,
    0, 102, 120,0,
    0, 0, 0,0,
    0, 0, 0,0,
    0, 0, 0,0,
    236, 238, 236,0,
    76, 154, 236,0,
    120, 124, 236,0,
    176, 98, 236,0,
    228, 84, 236,0,
    236, 88, 180,0,
    236, 106, 100,0,
    212, 136, 32,0,
    160, 170, 0,0,
    116, 196, 0,0,
    76, 208, 32,0,
    56, 204, 108,0,
    56, 180, 204,0,
    60, 60, 60,0,
    0, 0, 0,0,
    0, 0, 0,0,
    236, 238, 236,0,
    168, 204, 236,0,
    188, 188, 236,0,
    212, 178, 236,0,
    236, 174, 236,0,
    236, 174, 212,0,
    236, 180, 176,0,
    228, 196, 144,0,
    204, 210, 120,0,
    180, 222, 120,0,
    168, 226, 144,0,
    152, 226, 180,0,
    160, 214, 228,0,
    160, 162, 160,0,
    0, 0, 0,0,
    0, 0, 0,0
]);



const nesvars = {
                    buffersizes:{
                        screenarraysize:(256*240*4),
                        palettearraysize:(64*8*4),
                        samplesperframe:29781//-0.5
                    },
                    refresh:60,
                    p1input:0,
                    gamepads:{},
                    audio:{
                        muted:false,
                        usergain:1
                    }
                };


async function createNES(romdataarraybuffer) {
    await setupaudio();

    if(nesvars.CPP_screenptr===undefined){
        nesvars.ctx = nesvars.canvas.getContext("2d");
        nesvars.imagedata = nesvars.ctx.createImageData(256,240);

        nesvars.CPP_screenptr = Module._malloc(nesvars.buffersizes.screenarraysize);
        Module.HEAPU8.subarray(nesvars.CPP_screenptr, nesvars.CPP_screenptr+nesvars.buffersizes.screenarraysize).fill(255);
        
        nesvars.CPP_palptr = Module._malloc(nesvars.buffersizes.palettearraysize);
        let palview = Module.HEAPU8.subarray(nesvars.CPP_palptr, nesvars.CPP_palptr+nesvars.buffersizes.palettearraysize);
        palview.set(colours);
        //other emphasis bit variations? todo

        nesvars.CPP_audiobufferptr = Module._malloc(nesvars.buffersizes.samplesperframe);
        nesvars.CPP_sramptr = Module._malloc(1024*8);
    }


    if(nesvars.CPP_romfileptr!==undefined){
        destroynes();
    }

    if(nesvars.CPP_romfileptr===undefined){
        nesvars.framenumber = -1;
        nesvars.CPP_rombytecount = romdataarraybuffer.byteLength;
        nesvars.CPP_romfileptr = Module._malloc(nesvars.CPP_rombytecount);
        let romview = Module.HEAPU8.subarray(nesvars.CPP_romfileptr, nesvars.CPP_romfileptr+nesvars.CPP_rombytecount);
        romview.set(new Uint8Array(romdataarraybuffer));
    
        const nesstate = Module.ccall("createNES", "number", ["number", "number", "number", "number", "number", "number"],
        [nesvars.CPP_screenptr, nesvars.CPP_palptr, nesvars.CPP_romfileptr, nesvars.CPP_rombytecount, nesvars.CPP_sramptr, nesvars.CPP_audiobufferptr ] );

        if( (nesstate&0x80000000)===0 ){
            console.log("file error");
            destroynes();
        } else {
            nesvars.savesize = nesstate&~0x80000000;
            if(nesvars.running===undefined){
                runnes();
            }
        }
    }
}

function destroynes(){
    Module.ccall("destroyNES", null, [], [] );
    Module._free(nesvars.CPP_romfileptr);
    nesvars.CPP_romfileptr = undefined;
}




function frameadvance(){
    checkpads();

    if(nesvars.CPP_romfileptr===undefined){
        console.log("no rom file");
        if(nesvars.running!==undefined){
            runnes();
        }
        return;
    }
    
    const audioframes = Module.ccall("processNESFrame", "number", ["number"], [nesvars.p1input] );    
    const rawaudio = Module.HEAPU8.subarray(nesvars.CPP_audiobufferptr, nesvars.CPP_audiobufferptr+nesvars.buffersizes.samplesperframe);


    const oddeven = (nesvars.framenumber)&0x01;
    if(nesvars.audio.nesnodemessage[oddeven].frame===nesvars.framenumber){
        const otherframe = 1-oddeven;
        nesvars.audio.advancer = (nesvars.buffersizes.samplesperframe-0.5)*64 / nesvars.audio.deltasum;

        const offby = nesvars.audio.nesnodemessage[oddeven].missedsections-6;
        if(offby<0){//only slow down to fill buffer, don't speed up if too much buffer. or maybe do if it gets ridiculous.. todo.
            nesvars.audio.advancer *= 1+(( offby )*0.001);//arbitrary bullshit. needs to relate to framerate. todo.
        }
      



    let startsection = nesvars.audio.writehead&nesvars.audio.ausectionmask;
    for(;nesvars.audio.readhead<audioframes;nesvars.audio.readhead+=nesvars.audio.advancer){
        nesvars.audio.aubuffer[nesvars.audio.writehead] = (rawaudio[Math.floor(nesvars.audio.readhead)] * 0.01) - 1;
        nesvars.audio.writehead=(nesvars.audio.writehead+1)&nesvars.audio.aubufmask;
    }
    nesvars.audio.readhead-=audioframes;

    let sectionstosend = [];
    for(    ;
            startsection!==(nesvars.audio.writehead&nesvars.audio.ausectionmask);
            startsection = (startsection+nesvars.audio.aubufsectionlength)&nesvars.audio.ausectionmask
        ){
        sectionstosend.push( nesvars.audio.aubuffer.subarray(startsection,startsection+nesvars.audio.aubufsectionlength) );
    }
    nesvars.framenumber++;
    nesvars.audio.nesnode.port.postMessage( {frame:nesvars.framenumber, sections:sectionstosend} );


    nesvars.imagedata.data.set(Module.HEAPU8.subarray(nesvars.CPP_screenptr, nesvars.CPP_screenptr+nesvars.buffersizes.screenarraysize));
    nesvars.ctx.putImageData(nesvars.imagedata,0,0);
}




async function setupaudio() {

    //refactor todo - destroy/create

    if(nesvars.audio.ctx!==undefined){
        return;
    }
    
    if(!window.AudioContext){
        if(!window.webkitAudioContext){//old convention
            return;//unsupported..
        }
        window.AudioContext = window.webkitAudioContext;
    }
    nesvars.audio.ctx = new AudioContext();

    nesvars.audio.nessamplerate = (nesvars.buffersizes.samplesperframe-0.5)*nesvars.refresh;
    const samplespreframe = nesvars.audio.ctx.sampleRate/nesvars.refresh;
    const minbuffersizefromaudionode = 128;
    nesvars.audio.aubufsectionlength = minbuffersizefromaudionode;
    while(samplespreframe>nesvars.audio.aubufsectionlength){
        nesvars.audio.aubufsectionlength*=2;
    }

    nesvars.audio.fullaubuflength = nesvars.audio.aubufsectionlength*16;//todo.. multiplier affects how slow it can can go (for low cpu) before audio will settle running fraction of speed.

    nesvars.audio.aubufmask = nesvars.audio.fullaubuflength-1;
    nesvars.audio.ausectionmask = nesvars.audio.aubufmask^(nesvars.audio.aubufsectionlength-1);

    nesvars.audio.aubuffer = new Float32Array(nesvars.audio.fullaubuflength);
    nesvars.audio.readhead = 0;
    nesvars.audio.advancer = (nesvars.audio.nessamplerate/nesvars.audio.ctx.sampleRate) * 1.0315;//why? who knows.

    if(nesvars.audio.ctx.audioWorklet===undefined){
        const message = "audioWorklet unsupported. https issues??"
        screenlog(message);
        nesvars.audio.nesnode = { port:{postMessage:function(buf){
            //use the crappy old one instead?
        }}};
        debugger;
        return;
    }

    await nesvars.audio.ctx.audioWorklet.addModule("nesaudio.js");

    nesvars.audio.nesnode = new AudioWorkletNode(
        nesvars.audio.ctx,
        "nesaudio", {
            processorOptions:{
                sectionsize: nesvars.audio.aubufsectionlength
            }
        }
    );

    let missedcount = 0;

    const bitsformask = 7;//7=64?
    nesvars.audio.deltabitstoshiftby = (-1) + bitsformask;
    nesvars.audio.deltamask = (1<<nesvars.audio.deltabitstoshiftby)-1;
    nesvars.audio.deltaindex = 0;
    nesvars.audio.deltas = [];
    for(let i =0;i<(nesvars.audio.deltamask+1);i++){
        nesvars.audio.deltas.push( Math.floor(samplespreframe) );
    }
    nesvars.audio.deltasum = Math.floor(samplespreframe)*(nesvars.audio.deltamask+1);
    
    nesvars.audio.deltaaverage = Math.floor(samplespreframe);;
    nesvars.audio.nesnodemessage = { 0:{}, 1:{} };
    //let thing = { frame:-1, samplesdelta:0, ahead:0, missedsections:0, samplesofcurrentleft:nesvars.audio.aubufsectionlength };

    nesvars.audio.nesnode.port.onmessage = (e) => {
        //console.log(e.data.missedsections);

        if(e.data.missedsections<0){
            missedcount++;
            screenlog("missed:"+missedcount,false,true);
        }

        const oddeven = (e.data.frame)&0x01;
        nesvars.audio.nesnodemessage[oddeven] = e.data;//todo - elsewhere?

        nesvars.audio.deltasum-=nesvars.audio.deltas[nesvars.audio.deltaindex];
        nesvars.audio.deltas[nesvars.audio.deltaindex] = e.data.samplesdelta;
        nesvars.audio.deltasum+=nesvars.audio.deltas[nesvars.audio.deltaindex];
        nesvars.audio.deltaindex = (nesvars.audio.deltaindex+1)&nesvars.audio.deltamask;
        
        nesvars.audio.deltaaverage = nesvars.audio.deltasum>>nesvars.audio.deltabitstoshiftby;

    };

    nesvars.audio.hipassnode = new BiquadFilterNode(nesvars.audio.ctx);
    nesvars.audio.hipassnode.type = "highpass";
    nesvars.audio.hipassnode.frequency.value = 25;
    nesvars.audio.hipassnode.Q.value = 1;
    //nesvars.audio.hipassnode.gain

    /*nesvars.audio.lowpassnode = new BiquadFilterNode(nesvars.audio.ctx);
    nesvars.audio.lowpassnode.type = "lowpass";
    nesvars.audio.lowpassnode.frequency.value = 10000;
    nesvars.audio.lowpassnode.Q.value = 1;*/

    nesvars.audio.gainnode = new GainNode(nesvars.audio.ctx);
    nesvars.audio.gainnode.gain.value = 0;

    nesvars.audio.analysernode = new AnalyserNode(nesvars.audio.ctx);
    nesvars.audio.analysernode.fftSize = 2048;

    nesvars.bufferLength = nesvars.audio.analysernode.frequencyBinCount;
    nesvars.dataArray = new Uint8Array(nesvars.bufferLength);
    nesvars.audio.analysernode.getByteTimeDomainData(nesvars.dataArray);

    nesvars.osccanvas = document.getElementById("oscilloscope");
    nesvars.osccanvasctx = canvas.getContext("2d");



    nesvars.audio.nesnode
        .connect(nesvars.audio.hipassnode)
        //.connect(nesvars.audio.lowpassnode)
        .connect(nesvars.audio.analysernode)
        .connect(nesvars.audio.gainnode)
        .connect(nesvars.audio.ctx.destination);

        drawfft();
}



function drawfft(){
    requestAnimationFrame(drawfft);

    nesvars.audio.analysernode.getByteTimeDomainData(nesvars.dataArray);

    nesvars.osccanvasctx.fillStyle = "rgb(200 200 200)";
    nesvars.osccanvasctx.fillRect(0, 0, nesvars.osccanvas.width, nesvars.osccanvas.height);

    nesvars.osccanvasctx.lineWidth = 2;
    nesvars.osccanvasctx.strokeStyle = "rgb(0 0 0)";

    nesvars.osccanvasctx.beginPath();

    const sliceWidth = (nesvars.osccanvas.width * 1.0) / nesvars.bufferLength;
    let x = 0;

    for (let i = 0; i < nesvars.bufferLength; i++) {
        const v = nesvars.dataArray[i] / 128.0;
        const y = (v * nesvars.osccanvas.height) / 2;

        if (i === 0) {
            nesvars.osccanvasctx.moveTo(x, y);
        } else {
            nesvars.osccanvasctx.lineTo(x, y);
        }

        x += sliceWidth;
    }
    nesvars.osccanvasctx.lineTo(nesvars.osccanvas.width, nesvars.osccanvas.height / 2);
    nesvars.osccanvasctx.stroke();
}


function setgain(gain) {
    if(gain!==undefined){
        nesvars.audio.usergain = gain;
    }
    if(nesvars.audio.gainnode!==undefined){
        if(nesvars.audio.muted===true){
            nesvars.audio.gainnode.gain.value = 0;
        } else {
            nesvars.audio.gainnode.gain.value = nesvars.audio.usergain;
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
        nesvars.p1input |= bit;
    } else {
        nesvars.p1input &= ~bit;
    }
}


function gamepadHandler(event, connected) {
    const gamepad = event.gamepad;  
    if (connected) {
      nesvars.gamepads[gamepad.index] = gamepad;
    } else {
      delete nesvars.gamepads[gamepad.index];
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

const runnes = (event) => {
    if(nesvars.running===undefined){
        //maybe reset something timing related.. todo.
        nesvars.running = setInterval(frameadvance, 1000/(nesvars.refresh));
        nesvars.audio.muted = false;
    } else {
        clearInterval(nesvars.running);
        nesvars.running = undefined;
        nesvars.audio.muted = true;
    }
    setgain();
}


const neselement = document.querySelector("body");

nesvars.canvas = addcanvas(neselement,256,240);
addfileselect(neselement,passedromfile);
addbutton(neselement,"Start/Pause",runnes);





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
windowactivething();//don't think this even works..





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

