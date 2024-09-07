



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



const nesvars = { screenarraysize:(256*240*4),
                palettearraysize:(64*8*4),
                p1input:0,
                gamepads:{},
                samplesperframe:29781,
                nodes:[],
                queuefront:0 };


function createNES(romdataarraybuffer) {
    if(nesvars.CPP_screenptr===undefined){
        nesvars.ctx = nesvars.canvas.getContext("2d");
        nesvars.imagedata = nesvars.ctx.createImageData(256,240);

        nesvars.CPP_screenptr = Module._malloc(nesvars.screenarraysize);
        Module.HEAPU8.subarray(nesvars.CPP_screenptr, nesvars.CPP_screenptr+nesvars.screenarraysize).fill(255);
        
        nesvars.CPP_palptr = Module._malloc(nesvars.palettearraysize);
        let palview = Module.HEAPU8.subarray(nesvars.CPP_palptr, nesvars.CPP_palptr+nesvars.palettearraysize);
        palview.set(colours);
        //other emphasis bit variations? todo

        nesvars.CPP_audiobufferptr = Module._malloc(nesvars.samplesperframe);
        nesvars.CPP_sramptr = Module._malloc(1024*8);
    }


    if(nesvars.CPP_romfileptr!==undefined){
        destroynes();
    }

    if(nesvars.CPP_romfileptr===undefined){
        nesvars.framenumber = 0;
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



const fades = [];
const fadesampleslength = 10000;
function generatefades(){

    //const totaldbdrop = 140;
    //const totaldrop = totaldbdrop/20;
    //const dropper = totaldrop/fadesampleslength;
    
    for(let i = 0;i<fadesampleslength;i++){
        const percentage = i/fadesampleslength;
        //const thistime = (-totaldrop)+(dropper*i);
        //20*Math.log10(0.5) = -6.02
        //   Math.log10(0.5) = -0.30
        //      (10)**(-0.3) = 0.5
        //fades.push( ((10)**(thistime)) );
        fades.push( Math.pow(percentage,2) );
    }
}
generatefades();


const audio = {
                framenumber:0,
                mashedaudiobuffer:undefined,
                mashtogether:20,
                queueupto:-1};

function addsomeaudio(theaudio, howmanysamplesreally){
    if(audio.framenumber===0){
        audio.mashedaudiobuffer = nesvars.audiocontext.createBuffer(1, nesvars.samplesperframe*audio.mashtogether, nesvars.audiocontext.sampleRate);
    }

    let float32array = audio.mashedaudiobuffer.getChannelData(0);
    const firstone = audio.framenumber*nesvars.samplesperframe;
    for(let i = 0;i<nesvars.samplesperframe;i++){
        float32array[firstone+i] = (theaudio[i]*0.0078)-1;
    }

    if(audio.framenumber===(audio.mashtogether-1)){
        audio.queueupto++;

        //add hacky fades to beginning and end.?
        for(let i=0;i<fadesampleslength;i++){
            float32array[i]*=fades[i];
            float32array[(nesvars.samplesperframe*audio.mashtogether)-i]*=fades[i];
        }


        let node = nesvars.audiocontext.createBufferSource(0);

        node.buffer = audio.mashedaudiobuffer;

        let behind = audio.queueupto-nesvars.queuefront;
        if(behind>0){
            console.log("behind");
            behind*=behind*behind*behind;
        }

        node.playbackRate.value = (audio.playbackrate*(1.08 + behind*0.006 ));

        node.addEventListener("ended", () => {
            node.disconnect(nesvars.audiocontext.destination);
            playthebeast();
        });

        nesvars.nodes.push( node );

        audio.framenumber = 0;
    } else {
        audio.framenumber++;
    }
}






function frameadvance(){
    checkpads();

    nesvars.framenumber++;
    const audioframes = Module.ccall("processNESFrame", "number", ["number"], [nesvars.p1input] );    
    nesvars.imagedata.data.set(Module.HEAPU8.subarray(nesvars.CPP_screenptr, nesvars.CPP_screenptr+nesvars.screenarraysize));
    nesvars.ctx.putImageData(nesvars.imagedata,0,0);
    
    const audiosamples = Module.HEAPU8.subarray(nesvars.CPP_audiobufferptr, nesvars.CPP_audiobufferptr+nesvars.samplesperframe);

    addsomeaudio(audiosamples, audioframes);

    if(nesvars.playing!==true){
        nesvars.playing=true;
        playthebeast();
    }
}


playthebeast = ()=>{
    if(nesvars.nodes[nesvars.queuefront]===undefined){
        nesvars.playing=false;
        console.log("ahead. audio not ready.");
        return;
    }
    let node = nesvars.nodes[nesvars.queuefront];
    delete nesvars.nodes[nesvars.queuefront++];
    node.connect(nesvars.audiocontext.destination);
    node.start(0);
}


function setupaudio() {
    if(!window.AudioContext){
        if(!window.webkitAudioContext){//old convention
            return;//unsupported..
        }
        window.AudioContext = window.webkitAudioContext;
    }
    nesvars.audiocontext = new AudioContext();
    audio.playbackrate = 1786830/nesvars.audiocontext.sampleRate
}

setupaudio();



















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
        "ArrowRight":7
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
    createNES(await loadfileelement.files[0].arrayBuffer());
    loadfileelement.value = "";
}

const runnes = (event) => {
    if(nesvars.CPP_romfileptr===undefined){
        console.log("no rom file");
        return;
    }
    if(nesvars.running===undefined){
        nesvars.running = setInterval(frameadvance, 1000/60);
    } else {
        clearInterval(nesvars.running);
        nesvars.running = undefined;
    }
}


const neselement = document.querySelector("body");

nesvars.canvas = addcanvas(neselement,256,240);
addfileselect(neselement,passedromfile);
addbutton(neselement,"Start/Pause",runnes);
