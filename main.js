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

function addbutton(addtoelement=null, buttontext="a button", thefunc = async (event)=>{console.log(event);}, capture = false ){//else bubbling
    const thisbutton= getelement("button",buttontext );
    thisbutton.addEventListener('click', thefunc, capture );
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

const keyboardinput = { value:0, player:0 };
const gamepads = {};







function checkpads(){
    for(const gamepad of navigator.getGamepads()){
        if(!gamepad) continue;
        gamepads[gamepad.index].value = 0;//set all false
        for(const [i, button] of gamepad.buttons.entries()){
            if(debug && button.pressed){
                screenlog("button "+i,false,true);
            }
            const index = gamepads[gamepad.index].mapping[i];
            if(index!==undefined){
                if(button.pressed===true){
                    gamepads[gamepad.index].value |= (1<<index);//just set true if pressed.
                }
            }
        }
        for(const [i, axis] of gamepad.axes.entries()){
            //console.log(axis);//ps2 thing...
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

        "Enter":0,//modern pc layout
        " ":1,//space
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
    setinputfromindex(index,pressed,keyboardinput);
    return true;
}

function setinputfromindex(index,pressed,input){//don't use for pads. multiple buttons.
    const bit = (1<<index);
    if(pressed===true){
        input.value |= bit;
    } else {
        input.value &= ~bit;
    }
}




function getmappingfromgamepad(gamepadid){
    if(gamepadid!==undefined && gamepadid!==null){
        const jsoned = localStorage.getItem("CONFIG_"+gamepadid+"_0");
        if(jsoned!==null){
            return JSON.parse(jsoned);
        }
    }
    return { 0:0, 2:1, 3:1, 8:2, 9:3, 12:4,13:5,14:6,15:7,    1:0, 4:1, 5:1, 6:1, 7:1, 10:1, 11:1 };
}


function gamepadHandler(event, connected) {
    const gamepad = event.gamepad;  
    if (connected) {
        const player = gamepad.index===1?1:0;
        const thispad = { gamepad, index:gamepad.index, player, mapping:getmappingfromgamepad(gamepad.id), value:0 };
        const padlistel = document.getElementById("gamepads");
        thispad.padel = creategamepadelement(thispad);
        padlistel.appendChild(thispad.padel);
        gamepads[gamepad.index] = thispad;
    } else {
        gamepads[gamepad.index].padel.remove();
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
                if(keyboardinput.player<2){
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
                if(keyboardinput.player<2){
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
    const ok = await nes.loadrom(await event.target.files[0].arrayBuffer());
    if(!ok){
        event.target.value = "";
    }
}




const loadbase64button = async (event) =>{
    const index = event.currentTarget.attributes[0].value;
    loadfrombase64(index);
}

const loadfrombase64 = async (index) =>{
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


    const inputs = [touchcon.state,0];
    if(keyboardinput.player<2){
        inputs[keyboardinput.player] |= keyboardinput.value;
    }
    checkpads();
    for(const [key, padref] of Object.entries(gamepads)){
        if(padref.player<2){
            inputs[padref.player] |= padref.value;
        }
    }
    return inputs;
}





const nesel = document.getElementById("nes");

const screendiv = nesel.appendChild(getelement("div",null));
//await touchcon.config( null, screendiv );
const backgroundimageel = getelement("img",null,[{"name":"src","val":"bg.png"}]);

//generate image from base64? todo.

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



const gain = localStorage.getItem("gain") || 0;

const volslider = getelement("input",null,[
                                    {name:"type",val:"range"},
                                    {name:"min",val:"-4001"},
                                    {name:"max",val:"1200"},
                                    {name:"value",val:gain},
                                    {name:"name",val:"volslider"},
]);
pausevoldiv.appendChild(volslider);



const displaydb = getelement("label","", [{name:"for",val:"volslider"}]);
pausevoldiv.appendChild(displaydb);


function getdbtext(dbs){
    return dbs<-40?"Mute":
    (dbs>0?" +":"")+dbs.toString()+"\xA0dB";//&nbsp
}

function setnesgain(dbs){
    displaydb.innerText = getdbtext(dbs);
    nes.setgain(dbs<-40?0:(10)**(dbs/20));
    //const db = 20*Math.log10(gainratio);
}
setnesgain(gain/100);

const volchangeeventhandler = (event) => {
    setnesgain(event.target.value/100);    
};


const volchangestore = (event) => {
    localStorage.setItem("gain", event.target.value);
};

volslider.addEventListener("input", volchangeeventhandler);
volslider.addEventListener("change", volchangestore);





const fileselectdiv = nesel.appendChild(getelement("div",null));
fileselectdiv.appendChild(getelement("label","Load from your device: ",[{ name:"for", val:"romselect" }]));
addfileselect( fileselectdiv ,passedromfile,[{"name":"id","val":"romselect"}]);




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

    const buttonny = addbutton(romelement, null, loadbase64button );
    buttonny.setAttributeNode(attrib);


    buttonny.appendChild(getelement("h2",rom.name));
    buttonny.appendChild(getelement("p","by "+rom.developer));


    if(rom.link!==null){
        romelement.appendChild(getanchorinelement("p", "Web link", rom.link));
    }


    const details = romelement.appendChild(getelement("details",null));
    details.appendChild(getelement("summary","License Information"));
    
    details.appendChild(getelement("pre",rom.license));

    return romelement;
}






const loadjsonroms = async(request) => {
    await fetch(request)
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






function createplayerselect(identifier, eventhandler, initval = 2){
    const selectelement = getelement("select",null,[{name:"name", val:identifier }, {name:"id", val:identifier }]);
    selectelement.appendChild( getelement("option","Unused",[{name:"value", val:"2" }]) );
    selectelement.appendChild( getelement("option","NES Player 1",[{name:"value", val:"0" }]) );
    selectelement.appendChild( getelement("option","NES Player 2",[{name:"value", val:"1" }]) );
    selectelement.onchange = eventhandler;
    selectelement.value = initval;
    return selectelement;
}


function updatepadref(padref){
    for(const gamepad of navigator.getGamepads()){
        if(!gamepad) continue;
        if(gamepad.index===padref.index){
            padref.gamepad = gamepad;
            return gamepad;
        }
    }
    console.error("failed to find pad.");
}

function setnesbuttonascurrentlyheldbuttonsongamepad(nesbutton, padref){
    const gamepad = updatepadref(padref);
    for(const [key, value] of Object.entries(padref.mapping)){
        if(value===nesbutton){
            padref.mapping[key] = undefined;
        }
    }
    let count = 0;
    for(const [i, button] of gamepad.buttons.entries()){
        if(button.pressed){
            count++;
            padref.mapping[i] = nesbutton;
        }
    }
    for(const [i, axis] of padref.gamepad.axes.entries()){
        //console.log(axis);//ps2 thing...
    }
    return " ("+count+" gamepad buttons are now set to this NES button.)";
}



function creategamepadconfigelement(padref, padelement){
    const gamepad = updatepadref(padref);
    const configelement = getelement("div",null);
    configelement.appendChild( getelement("div", "Button Configuration for Gamepad with "+gamepad.buttons.length+" buttons.") );

    ["A","B","Select","Start","Up","Down","Left","Right"].forEach( (buttonname, index) => {
        const buttonboxel = getelement("div", null);
        configelement.appendChild(buttonboxel);
        const buttontext = "Hold the buttons on this gamepad that you wish to work as NES button: "+buttonname+" and click here.";
        addbutton(buttonboxel, buttontext, (event) => {
            event.currentTarget.innerText = buttontext+setnesbuttonascurrentlyheldbuttonsongamepad(index,padref);
        });
    });

    addbutton(configelement,"Save", (event) => {
        localStorage.setItem("CONFIG_"+gamepad.id+"_0", JSON.stringify(padref.mapping) );
    });

    addbutton(configelement,"Close Config", (event) => {
        padelement.getElementsByTagName("button")[0].style.display="unset";
        configelement.remove();
    });

    addbutton(configelement,"Reset saved to default", (event) => {
        localStorage.removeItem("CONFIG_"+gamepad.id+"_0");
        padref.mapping = getmappingfromgamepad(gamepad.id);
        padelement.getElementsByTagName("button")[0].style.display="unset";
        configelement.remove();
    });
    return configelement;
}



function creategamepadelement(padref){    
    const gamepad = updatepadref(padref);
    const padelement = getelement("div",null);
    padelement.appendChild( getelement("div", gamepad.id) );
    padelement.appendChild( createplayerselect("pad"+gamepad.index,
        (event) => {
            padref.player = event.target.value;
        },padref.player));

    addbutton(padelement,"Configure", (event) => {
        event.currentTarget.style.display = "none";
        padelement.appendChild(creategamepadconfigelement(padref, padelement));
    } );

    return padelement;
}




const keyboardel = getelement("div",null);
keyboardel.appendChild( getelement("div","Use Keyboard for:") );
keyboardel.appendChild( createplayerselect("keys",
    (event) => {
        keyboardinput.player = event.target.value;
    },keyboardinput.player));
document.getElementById("gamepads").appendChild(keyboardel);




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



