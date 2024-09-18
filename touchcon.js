






const touchcontroller = {
    width:256,
    height:240,
    screenratio:0.6,
    screenLock:null,
    controls:[],
    screencanv:{}
};

function resettouches(){
    touchcontroller.padstate = 0;
    touchcontroller.touchmap = {};
}
resettouches();


const btns = {
    abut:0,
    bbut:1,
    select:2,
    start:3,
    dpad:4
};




function whichbuttonistouchon(touchindex){
    for(let i = 0;i<5;i++){
        if(touchcontroller.touchmap[i]===touchindex){
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

    touchcontroller.padstate &= 0x0F;
    if(lengthsquared < deadzonesquared){
        return;
    }

    if(Math.abs(lengthy)>minaxis){

        if (lengthy<0){
            touchcontroller.padstate |= 1<<4;//up
        } else {
            touchcontroller.padstate |= 1<<5;//down
        }
    }
    if(Math.abs(lengthx)>minaxis){
        if (lengthx<0){
            touchcontroller.padstate |= 1<<6;//left
        } else {
            touchcontroller.padstate |= 1<<7;//right
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
                if(touchcontroller.touchmap[index]===undefined){
                    shortest = lengthsquared;
                    foundindex = index;
                }
            }
        }
    });
    if(foundindex!==null){
        if(foundindex!==5){
            touchcontroller.padstate|=1<<foundindex;
        }
        touchcontroller.touchmap[foundindex]=touch.identifier;
    }
    return foundindex;
}




const handletouchevent = (event) =>{
    if(document.fullscreenElement!==touchcontroller.canvas){
        touchcontroller.touchenabled = true;
        toggleFullscreen();
        return;
    }
    event.preventDefault();
    Array.prototype.forEach.call( event.changedTouches, (touch) =>{
        switch (event.type){
            case "touchend":
            case "touchcancel":
                const buttontouchison = whichbuttonistouchon(touch.identifier);
                if(buttontouchison!==null){
                    if(buttontouchison===btns["dpad"]){
                        touchcontroller.padstate &= 0x0F;
                    }
                    touchcontroller.padstate&= ~(1<<buttontouchison);
                    touchcontroller.touchmap[buttontouchison] = undefined;
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
    //console.log(touchcontroller.padstate);
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




async function createcontroller(appendto = document.body, options = null){//event will be passed, but doesn't matter.

    touchcontroller.width = options?.width?options.width:256;
    touchcontroller.height = options?.height?options.height:240;
    touchcontroller.screenratio = options?.screenratio?options.screenratio:0.6;

    const infullscreen = document.fullscreenElement===touchcontroller.canvas;
    const htmlelement = document.querySelector("html");
    const width = infullscreen?htmlelement.clientWidth:touchcontroller.width;//screen.width
    const height = infullscreen?htmlelement.clientHeight:touchcontroller.height;
    const screenratio = (infullscreen && touchcontroller.touchenabled)?touchcontroller.screenratio:1;

    const nesaspect = 256/240;
    const aspect = width/height;
    touchcontroller.portrait = aspect<nesaspect;

    if(touchcontroller.canvas===undefined){
        if(appendto===null){
            return null;
        }

        touchcontroller.canvas = document.createElement("canvas");

        const widthattrib = document.createAttribute("width");
        widthattrib.value = width;
        touchcontroller.canvas.setAttributeNode(widthattrib);
        const heightattrib = document.createAttribute("height");
        heightattrib.value = height;
        touchcontroller.canvas.setAttributeNode(heightattrib);
        
        appendto.appendChild(touchcontroller.canvas);

        touchcontroller.screencanv.ctx = touchcontroller.canvas.getContext("2d");
        touchcontroller.canvas.addEventListener('fullscreenchange',createcontroller);
        touchcontroller.canvas.addEventListener('fullscreenerror',createcontroller);
        touchcontroller.canvas.addEventListener('touchstart',handletouchevent);
        touchcontroller.canvas.addEventListener('touchmove',handletouchevent);
        touchcontroller.canvas.addEventListener('touchend',handletouchevent);
        touchcontroller.canvas.addEventListener('touchcancel',handletouchevent);

        screen.orientation.addEventListener("change", function(event) {
            createcontroller();
        });

        window.addEventListener("resize", (event) => {
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
    }

    if(infullscreen && ("wakeLock" in navigator)){
        try {
            touchcontroller.screenLock = await navigator.wakeLock.request("screen");
        } catch(error) {
            console.log(error);
        }
    } else {
        if(touchcontroller.screenLock!==null){
            await touchcontroller.screenLock.release();
            touchcontroller.screenLock = null;
        }
    }

    if(touchcontroller.portrait){
        //console.log("portrait");
        let scalerp = (nesaspect/aspect)*screenratio;//clamp to 1 max
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
        touchcontroller.controls[btns["dpad"]] = { x:padinset, y:nesheightp+padinset, r:padinset*0.8 };
        touchcontroller.controls[btns["abut"]] = { x:(width-padinset)+(padinset/2), y:nesheightp+(padinset*0.9), r:padinset*0.4 };
        touchcontroller.controls[btns["bbut"]] = { x:(width-padinset)-(padinset/2), y:nesheightp+(padinset*0.9), r:padinset*0.4 };

        touchcontroller.controls[btns["select"]] ={ x:(width-padinset)-(padinset/2), y:nesheightp+(padinset*1.6), r:padinset*0.3 };
        touchcontroller.controls[btns["start"]] = { x:(width-padinset)+(padinset/2), y:nesheightp+(padinset*1.6), r:padinset*0.3 };

    } else {
        //console.log("landscape");
        let scalerl = (aspect/nesaspect)*screenratio;//clamp to 1 max.
        if(scalerl>1){
            scalerl = 1;
        }
        const nesheightl = height*scalerl;
        const neswidthl = nesheightl*nesaspect;

        touchcontroller.screencanv.coords = { x:(width-neswidthl)/2, y:0, w:neswidthl, h:nesheightl };
        const padinset = touchcontroller.screencanv.coords.x/2;
        touchcontroller.controls[btns["dpad"]] = { x:padinset, y:(height/4)*3, r:touchcontroller.screencanv.coords.x*0.4 };
        
        touchcontroller.controls[btns["bbut"]] = { x:width-(padinset*1.5), y:height/2, r:touchcontroller.screencanv.coords.x*0.2 }
        touchcontroller.controls[btns["abut"]] = { x:width-(padinset*0.5), y:height/2, r:touchcontroller.screencanv.coords.x*0.2 }

        touchcontroller.controls[btns["start"]] = { x:width-(padinset*0.5), y:height*0.2, r:touchcontroller.screencanv.coords.x*0.2 }
        touchcontroller.controls[btns["select"]] ={ x:width-(padinset*1.5), y:height*0.2, r:touchcontroller.screencanv.coords.x*0.2 }
    }

    touchcontroller.canvas.width = width;
    touchcontroller.canvas.height = height;

    drawthing(touchcontroller.screencanv.ctx, "rect", "black", {x:0, y:0, w:width, h:height });
    drawthing(touchcontroller.screencanv.ctx, "rect", "white", touchcontroller.screencanv.coords);
  
    if(touchcontroller.touchenabled){
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["dpad"]]);
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["abut"]]);
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["bbut"]]);
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["start"]]);
        drawthing(touchcontroller.screencanv.ctx, "circle", "white", touchcontroller.controls[btns["select"]]);
    } else {
        resettouches();
    }
    return touchcontroller.canvas;
}


function toggleFullscreen() {
    if(document.fullscreenEnabled){
        if (!document.fullscreenElement) {
            touchcontroller.canvas.requestFullscreen().catch((err) => {
                console.log(err);
                return false
            });
            return true;
        } else {
            document.exitFullscreen();
        }
    }
    return false;
}




class touchcon{

    get state(){
        return touchcontroller.padstate;
    }

    async config(options , appendto = null ){
        if(await createcontroller(appendto, options)===null){
            return false;
        }
        return true;
    }

    toggleFullscreen(event){
        touchcontroller.touchenabled = false;
        //or set touchenabled based on event data?
        return toggleFullscreen();
    }

    drawNES(nescanvas){
        touchcontroller.screencanv.ctx
            .drawImage(nescanvas,0,0,256,240,
            touchcontroller.screencanv.coords.x,
            touchcontroller.screencanv.coords.y,
            touchcontroller.screencanv.coords.w,
            touchcontroller.screencanv.coords.h);
    }
}

export default new touchcon();
