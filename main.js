import touchcon from './touchcon.js'
import nes from './nes.js'
import nescolours from './nescolours.js'
import roms from './roms.js'


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








const gamepads = {};
const inputs = [0,0];



function checkpads(){
    for(const gamepad of navigator.getGamepads()){
        if(!gamepad) continue;
        /*if(gamepad.index!==0){
            continue;
        }*/
        const player = 0;
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
                setinputfromindex(index,button.pressed,player);
            }
        }
        for(const [i, axis] of gamepad.axes.entries()){
            //console.log(axis);
        }
    }
}

function setinput(key,pressed,player=0){
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
    setinputfromindex(index,pressed,player);
    return true;
}

function setinputfromindex(index,pressed,playerno=0){
    const bit = (1<<index);
    if(pressed===true){
        inputs[playerno] |= bit;
    } else {
        inputs[playerno] &= ~bit;
    }
}


function gamepadHandler(event, connected) {
    const gamepad = event.gamepad;  
    if (connected) {
      gamepads[gamepad.index] = gamepad;
    } else {
      delete gamepads[gamepad.index];
    }
}


function registercontrollers(){
    window.addEventListener(
        "keydown",
        (event) => {
            if (event.defaultPrevented) {
                return;
            }
            if(event.key==="Escape"){
                nes.runnes();
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
    await nes.loadrom(await loadfileelement.files[0].arrayBuffer());
    loadfileelement.value = "";
}


const fetchnesfile = async(event) => {
    console.log(event);
    const request = new Request("/roms/"+event.target.attributes[0].value, {
        method: "GET",
    });
    const response = await fetch(request);
    const rom = await new Response(response.body).arrayBuffer();
    await nes.loadrom(rom);
}


function getinputs(){//runs at start of every frame..
    if(debug){
        screenlog(nes.cpumem[0x50],false,true);//show zelda kill streak
    }

    checkpads();
    return [ inputs[0] | touchcon.state, inputs[1] ];
}



nes.configurenes(touchcon.drawNES,getinputs);


const nesel = document.getElementById("nes");
touchcon.config( null, nesel );
addbutton( nesel ,"Fullscreen",touchcon.toggleFullscreen);
addfileselect( nesel ,passedromfile);
addbutton(nesel, "Start/Pause", nes.runnes);


const ul = getelement("ul");
nesel.appendChild(ul);

roms.roms.forEach( (rom) => {
    const li = getelement("li");
    ul.appendChild(li);
    
    li.appendChild(getelement("h1",rom.name));

    const attrib = document.createAttribute("romname");
    attrib.value = rom.filename;
    addbutton(li, "Play in emulator",fetchnesfile).setAttributeNode(attrib);


    li.appendChild(getelement("p","by "+rom.developer));
    li.appendChild(getelement("p","License: "+rom.license));
    rom.link.forEach( (link) => {
        li.appendChild(getanchorinelement("p", link));
    });
    if(rom.archive!==null){
        li.appendChild(getanchorinelement("p", "Download Archive/License Information", "/roms/"+rom.archive ));
    }
    li.appendChild(getanchorinelement("p", "Download .nes file", "/roms/"+rom.filename));



});




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



