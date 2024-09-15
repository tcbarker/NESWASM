



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











let padstate = 0;

const touchmap = {};

const touchcontroller = {
    enabled:true,
    screenratio:0.6,
    scale:0.3,
    controls:[],
    screencanv:{}
};


const btns = {
    abut:0,
    bbut:1,
    select:2,
    start:3,
    dpad:4
};


function toggleFullscreen() {  
    if (!document.fullscreenElement) {
        touchcontroller.scale = 1;
        touchcontroller.canvas.requestFullscreen().catch((err) => {
            console.log(err);
        });
        //touchcontroller.enabled=true;
    } else {
        document.exitFullscreen();
        //touchcontroller.enabled=false;
    }
}



function whichbuttonistouchon(touchindex){
    for(let i = 0;i<5;i++){
        if(touchmap[i]===touchindex){
            return i;
        }
    }
    return null;
}


function updatedpad(touch){
    const deadzonesquared = 0.0;

    const control = touchcontroller.controls[btns["dpad"]];
    const minaxis = control.r*0.25;
    const lengthx = touch.clientX - control.x;
    const lengthy = touch.clientY - control.y;
    const lengthsquared = Math.pow(lengthx,2) + Math.pow(lengthy,2);

    padstate &= 0x0F;
    if(lengthsquared < deadzonesquared){
        return;
    }

    if(Math.abs(lengthy)>minaxis){

        if (lengthy<0){
            padstate |= 1<<4;//up
        } else {
            padstate |= 1<<5;//down
        }
    }
    if(Math.abs(lengthx)>minaxis){
        if (lengthx<0){
            padstate |= 1<<6;//left
        } else {
            padstate |= 1<<7;//right
        }
    }
}


function getnearestbutton(touch){
    let shortest = Infinity;
    let foundindex = null;
    Array.prototype.forEach.call( touchcontroller.controls, (control, index) =>{
        const lengthx = touch.clientX - control.x;
        const lengthy = touch.clientY - control.y;
        const lengthsquared = Math.pow(lengthx,2) + Math.pow(lengthy,2);
        if(lengthsquared<shortest){
            if(lengthsquared < Math.pow(control.r,2) ){
                if(touchmap[index]===undefined){
                    shortest = lengthsquared;
                    foundindex = index;
                }
            }
        }
    });
    if(foundindex!==null){
        if(foundindex!==5){
            padstate|=1<<foundindex;
        }
        touchmap[foundindex]=touch.identifier;
    }
    return foundindex;
}




const handletouchevent = (event) =>{
    event.preventDefault();
    Array.prototype.forEach.call( event.changedTouches, (touch) =>{
        switch (event.type){
            case "touchend":
            case "touchcancel":
                const buttontouchison = whichbuttonistouchon(touch.identifier);
                if(buttontouchison!==null){
                    if(buttontouchison===btns["dpad"]){
                        padstate &= 0x0F;
                    }
                    padstate&= ~(1<<buttontouchison);
                    touchmap[buttontouchison] = undefined;
                }
                return;
                
            case "touchmove":
                let whichbuttonon = whichbuttonistouchon(touch.identifier);
                if(whichbuttonon===null){
                    whichbuttonon = getnearestbutton(touch);
                }
                if(whichbuttonon===btns["dpad"]){
                    updatedpad(touch);
                }
                return;
            
            case "touchstart":
                if(getnearestbutton(touch)===btns["dpad"]){
                    updatedpad(touch);
                }
                return;
        }
    } );
    //console.log({padstate});
    document.getElementById("statedisplay").innerText=padstate.toString();
};




function drawthing (ctx, thing, colour, coords){
    ctx.beginPath();
    if(thing==="circle"){
        ctx.arc(coords.x, coords.y, coords.r, 0, 360 );
    } else {
        ctx.rect(coords.x, coords.y, coords.w, coords.h);
    }
    ctx.fillStyle = colour;
    ctx.fill();
}



function createcontroller(appendto){
    const htmlelement = document.querySelector("html");
    const width = htmlelement.clientWidth*touchcontroller.scale;//screen.width
    const height = htmlelement.clientHeight*touchcontroller.scale;
    const nesaspect = 256/240;
    const aspect = width/height;
    touchcontroller.portrait = aspect<nesaspect;

    if(touchcontroller.main===undefined){
        touchcontroller.main = getelement("div");
        appendto.appendChild(touchcontroller.main);
        touchcontroller.canvas = addcanvas(touchcontroller.main,width,height);
        touchcontroller.screencanv.ctx = touchcontroller.canvas.getContext("2d");

        touchcontroller.canvas.addEventListener('touchstart',handletouchevent);
        touchcontroller.canvas.addEventListener('touchmove',handletouchevent);
        touchcontroller.canvas.addEventListener('touchend',handletouchevent);
        touchcontroller.canvas.addEventListener('touchcancel',handletouchevent);
        
        addbutton(touchcontroller.main,"Fullscreen",toggleFullscreen);
        touchcontroller.main.appendChild(getelement("div","",[{name:"id","val":"statedisplay"}]));
    }

    if(touchcontroller.portrait){
        //console.log("portrait");
        let scalerp = (nesaspect/aspect)*touchcontroller.screenratio;//clamp to 1 max
        if(scalerp>1){
            scalerp = 1;
        }
        const neswidthp = width*scalerp;
        const nesheightp = neswidthp/nesaspect;

        touchcontroller.screencanv.coords = { x:(width-neswidthp)/2, y:0, w:neswidthp, h:nesheightp };

        let padinset = (height-nesheightp)/2;
        if(neswidthp/width > 0.8){
            padinset = width/4;
        }
        touchcontroller.controls[btns["dpad"]] = { x:padinset, y:height-padinset, r:padinset*0.8 };
        touchcontroller.controls[btns["abut"]] = { x:(width-padinset)+(padinset/2), y:height-(padinset*0.9), r:padinset*0.4 };
        touchcontroller.controls[btns["bbut"]] = { x:(width-padinset)-(padinset/2), y:height-(padinset*0.9), r:padinset*0.4 };

        touchcontroller.controls[btns["select"]] ={ x:(width-padinset)-(padinset/2), y:height-(padinset*1.6), r:padinset*0.3 };
        touchcontroller.controls[btns["start"]] = { x:(width-padinset)+(padinset/2), y:height-(padinset*1.6), r:padinset*0.3 };

    } else {
        //console.log("landscape");
        let scalerl = (aspect/nesaspect)*touchcontroller.screenratio;//clamp to 1 max.
        if(scalerl>1){
            scalerl = 1;
        }
        const nesheightl = height*scalerl;
        const neswidthl = nesheightl*nesaspect;

        touchcontroller.screencanv.coords = { x:(width-neswidthl)/2, y:0, w:neswidthl, h:nesheightl };
        const padinset = touchcontroller.screencanv.coords.x/2;
        touchcontroller.controls[btns["dpad"]] = { x:padinset, y:height/2, r:touchcontroller.screencanv.coords.x*0.4 };
        
        touchcontroller.controls[btns["bbut"]] = { x:width-(padinset*1.5), y:height/2, r:touchcontroller.screencanv.coords.x*0.2 }
        touchcontroller.controls[btns["abut"]] = { x:width-(padinset*0.5), y:height/2, r:touchcontroller.screencanv.coords.x*0.2 }

        touchcontroller.controls[btns["start"]] = { x:width-(padinset*0.5), y:height*0.2, r:touchcontroller.screencanv.coords.x*0.2 }
        touchcontroller.controls[btns["select"]] ={ x:width-(padinset*1.5), y:height*0.2, r:touchcontroller.screencanv.coords.x*0.2 }
    }

    touchcontroller.canvas.width = width;
    touchcontroller.canvas.height = height;

    drawthing(touchcontroller.screencanv.ctx, "rect", "black", {x:0, y:0, w:width, h:height });
    drawthing(touchcontroller.screencanv.ctx, "rect", "white", touchcontroller.screencanv.coords);    

    if(touchcontroller.enabled){
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["dpad"]]);
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["abut"]]);
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["bbut"]]);
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["start"]]);
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["select"]]);
    }
    return touchcontroller.screencanv;
}




class touchcon{

    get state(){
        return padstate;
    }

    config( enable = true, screenratio = null ){
        if(screenratio!==null){
            touchcontroller.screenratio = screenratio;
        }
        if(enable!==touchcontroller.enabled){
            touchcontroller.enabled = enable;
            createcontroller();
        }
    }
    
    init(appendto = document.body){
        const screencanv = createcontroller(appendto);
        
        addEventListener("resize", (event) => {
            createcontroller();
        });
        
        screen.orientation.addEventListener("change", function(e) {
            createcontroller();
        });
    
        /*let portrait = window.matchMedia("(orientation: portrait)");
        portrait.addEventListener("change", function(e) {
            if(e.matches) {
                // Portrait mode
            } else {
                // Landscape
            }
        })*/
        return screencanv;
    }
}

export default new touchcon();
