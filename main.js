import touchcon from './touchcon.js'
import nes from './nes.js'
import nescolours from './nescolours.js'


function gethex(fromthis){
    let hex = fromthis.toString(16);
    if(hex.length===1){
        hex = "0"+hex;
    }
    return hex.toUpperCase();
}

for(let i = 0;i<64;i++){
    document.documentElement.style.setProperty("--NES"+gethex(i), "#"
        +gethex(nescolours[i*4+0])
        +gethex(nescolours[i*4+1])
        +gethex(nescolours[i*4+2])
    );
}


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

function addfileselect(addtoelement=null, thefunc = async (event)=>{console.log(event);}, extraattribs=[] ){
    const thisfs= getelement("input",null,[ {name:"type", val:"file"} ].concat(extraattribs) );
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






const romsdata = [];

const keyboardplayernumber = 0;
const gamepads = {};
const inputs = [0,0];
const padconfigs = [ {name:"xbox 360 wired pad on linux", mapping:{ 0:0,3:1,8:2,9:3,12:4,13:5,14:6,15:7 }}  ];


function checkpads(){
    for(const gamepad of navigator.getGamepads()){
        if(!gamepad) continue;
        const player = gamepads[gamepad.index].player;
        const mappingindex = gamepads[gamepad.index].mappingindex;
        const mapping = padconfigs[mappingindex].mapping;
        if(player===null || mapping===undefined){continue;}
        for(const [i, button] of gamepad.buttons.entries()){
            const index = mapping[i];
            if(index!==undefined){
                setinputfromindex(index,button.pressed,player);
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
    setinputfromindex(index,pressed,keyboardplayernumber);
    return true;
}

function setinputfromindex(index,pressed,playerno){
    const bit = (1<<index);
    if(pressed===true){
        inputs[playerno] |= bit;
    } else {
        inputs[playerno] &= ~bit;
    }
}


function getmappingfromgamepad(gamepad){//todo...
    console.log(gamepad);
    for (padconfig in padconfigs){
        if(padconfig.name==="xbox360"){
            return 0;
        }
    }
    return 0;
}


function gamepadHandler(event, connected) {
    const gamepad = event.gamepad;  
    if (connected) {
      gamepads[gamepad.index] = { gamepad, player:0, mappingindex:getmappingfromgamepad(gamepad) };
    } else {
      delete gamepads[gamepad.index];
    }
}


function registercontrollers(){
    window.addEventListener(
        "keydown",
        (event) => {
            if (event.defaultPrevented) { return; }
            if(event.key==="Escape"){
                nes.runnes();
                return;
            }
            if(setinput(event.key,true)){
                if(!debug){
                    event.preventDefault();
                }
            }
        },
        true,
    );
    window.addEventListener(
        "keyup",
        (event) => {
            if (event.defaultPrevented) { return; }
            if(setinput(event.key,false)){
                if(!debug){
                    event.preventDefault();
                }
            }
        },
        true,
    );

    window.addEventListener("gamepadconnected", (e) => { gamepadHandler(e, true); }, false );
    window.addEventListener("gamepaddisconnected", (e) => { gamepadHandler(e, false); }, false );

}

registercontrollers();




const passedromfile = async(event) => {
    const loadfileelement = event.target;
    nes.loadrom(await loadfileelement.files[0].arrayBuffer());
    loadfileelement.value = "";
}





const loadfrombase64 = async (event) =>{
    const index = event.target.parentElement.attributes[0].value;
    const romref = romsdata[index];
    const romdata = Uint8Array.from(atob(romref.romdata), c => c.charCodeAt(0));
    const romdatastream = new ReadableStream({
        start(controller) {
            controller.enqueue(romdata.buffer);
            controller.close();
        }
    });
    const ds = new DecompressionStream("gzip");
    const decompstream = romdatastream.pipeThrough(ds);
    let response = new Response(decompstream);
    nes.loadrom( await response.arrayBuffer() );
}


const loadfromurl = async(theurl) => {
    const request = new Request(theurl, {
        method: "GET",
    });
    try {
        const response = await fetch(request);
        nes.loadrom( await new Response(response.body).arrayBuffer() );
    } catch (e) {
        console.log(e);
    }
}


const fetchnesfile = async(event) => {
    //console.log(event);
    await loadfromurl(event.target.attributes[0].value);
}

const getfromdata = (event) => {
    const romref = romsdata[event.target.attributes[0].value];
    nes.loadrom( allromdata.slice(romref.dataoffset,romref.dataoffset+romref.size) );
}


function getinputs(){//runs at start of every frame..
    if(debug){
        screenlog(nes.cpumem[0x50],false,true);//show zelda kill streak
    }

    checkpads();
    return [ inputs[0] | touchcon.state, inputs[1] ];
}





const nesel = document.getElementById("nes");

const screendiv = nesel.appendChild(getelement("div",null));
//await touchcon.config( null, screendiv );
const backgroundimageel = getelement("img",null,[{"name":"src","val":"bg.png"}]);

//generate image from base64. todo.

backgroundimageel.onload = async function() {
    await touchcon.config( {backgroundimage:backgroundimageel}, screendiv );
};




const pausevoldiv = nesel.appendChild(getelement("div",null));

const pauseboxdiv = pausevoldiv.appendChild(getelement("div",null));

const pausebutton = addbutton(pauseboxdiv, "", nes.runnes);
pausebutton.style.display = "none";
pausebutton.addEventListener(
    "nesrunstate",
    (e) => {
        switch(e.detail){
            default:
                document.getElementById("status").innerText += e.detail;
                break;

            case null:
                e.target.style.display = "none";
                touchcon.setallowfullscreen(false);
                document.getElementById("status").innerText += "\nInvalid iNes file, or unsupported mapper.";
                break;
            
            case false:
                e.target.style.display = "initial";
                e.target.innerText="▶️";
                touchcon.setallowfullscreen(false);
                break;
            
            case true:
                e.target.style.display = "initial";
                e.target.innerText="⏸️";
                touchcon.setallowfullscreen(true);
                break;
        }
    },
    false,
);





const volslider = getelement("input",null,[
                                    {name:"type",val:"range"},
                                    {name:"min",val:"-4001"},
                                    {name:"max",val:"1200"},
                                    {name:"value",val:"0"},
                                    {name:"name",val:"volslider"},
]);
pausevoldiv.appendChild(volslider);

const displaydb = getelement("label","0 dB", [{name:"for",val:"volslider"}]);
pausevoldiv.appendChild(displaydb);


const volchangeeventhandler = (event) => {
    //const db = 20*Math.log10(gainratio);
    const dbs = event.target.value/100;
    if(dbs<-40){
        displaydb.innerText = "Mute";
        nes.setgain(0);
        return;
    }
    displaydb.innerText = (dbs>0?" +":"")+dbs.toString()+"\xA0dB";//&nbsp
    nes.setgain((10)**(dbs/20));
};

volslider.addEventListener("input", volchangeeventhandler);






const fileselectdiv = nesel.appendChild(getelement("div",null));
fileselectdiv.appendChild(getelement("label","Load a rom from your device: ",[{ name:"for", val:"romselect" }]));
addfileselect( fileselectdiv ,passedromfile,[{"name":"id","val":"romselect"}]);


nesel.appendChild(getelement("div","config stuff - pads, keyboard?"));



nes.configurenes(touchcon.drawNES,getinputs,[pausebutton]);


if(debug===true){
    const inputurlbox = getelement("input", null, [{name:"type", val:"text"}, {name:"placeholder", val:"rom url (note that cors will do its job and block this unless the receiving server is configured.)"},]);
    nesel.appendChild(inputurlbox);
    
    const loadfromurlbutton = async(event) => {
        //console.log(event);
        await loadfromurl(inputurlbox.value);
    }
    
    const loadurlbutton = addbutton(nesel, "Load from URL", loadfromurlbutton);
}






function createromelement(rom, index){
    
    const romelement = getelement("div");

    const attrib = document.createAttribute("romindex");
    attrib.value = index;

    const buttonny = addbutton(romelement, null,loadfrombase64);
    buttonny.setAttributeNode(attrib);


    buttonny.appendChild(getelement("h2",rom.name));
    buttonny.appendChild(getelement("p","by "+rom.developer));


    if(rom.link!==null){
        romelement.appendChild(getanchorinelement("p", rom.link));
    }


    const details = romelement.appendChild(getelement("details",null));
    details.appendChild(getelement("summary","License Information"));
    
    details.appendChild(getelement("pre",rom.license));

    return romelement;
}






const loadjsonroms = async(request) => {
    fetch(request)
    .then( response => response.text() )
    .then( responsetext => JSON.parse(responsetext) )
    .then( imported => {
        const romselement = document.getElementById("roms");
        imported.roms.forEach( (rom ) => {
            const index = romsdata.length;
            romsdata.push(rom);
            romselement.appendChild(createromelement(rom, index));
        });
    })
    .catch( (e) => {
        console.log(e);
    });
}


await loadjsonroms( new Request("roms.json", {
    method: "GET",
}));












function screenlog(message, tojson = false, clear = false){
    if(tojson===true){
        message = JSON.stringify(message);
    }
    const el = document.getElementById("status");
    if(clear){
        el.innerText = "";
    }
    el.innerText+=message;
}




















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



