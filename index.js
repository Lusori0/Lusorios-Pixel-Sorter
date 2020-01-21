const pixels = require('image-pixels');
const output = require('image-output');
const {app, BrowserWindow} = require('electron');
const {ipcMain} = require('electron');
const {dialog} = require('electron');

var pixelList = [];
var startPixel = [0,0];
var imageData = [];

console.log(app.getPath("temp"));

app.on('ready', createWindow);
app.on('windows-all-closed', () =>{
    if(process.platform !== 'darwin'){
        app.quit();
    }
});
app.on('activate', () => {
    if(win === null){
        createWindow();
    }
});

let win;
function createWindow(){
    win = new BrowserWindow({
        width:400,
        height:600,
        resizable: false,
        frame: false,
        webPreferences:{
            nodeIntegration: true
        }
    });
    win.loadFile('index.html');

    win.on('closed', () => {
        win = null;
    });
}

ipcMain.on('startButton', (event, args) => {

    getImage(args.inputFile, args.threshold, args.highlightFactor, args.noise, args.outputFile);
    event.sender.send("btnclick-task-finished", "yes");
});

ipcMain.on('closeApp',(event)=>{
    app.quit();
});

ipcMain.on('minimizeApp', (event)=>{
    win.minimize();
});

async function getImage(inputFile, threshold, highlightFactor, noise, outputFile){
    var {data, width, height} = await pixels(inputFile);
    pixelSorting(data, width, height, threshold, highlightFactor, noise, outputFile);
};

function sorting(width){
    pixelList.sort((a,b) => sumOfPixel(a) - sumOfPixel(b));
    for (p = 0; p < pixelList.length;p++){
        imageData[(startPixel[1] + p - 1) * width + startPixel[0]] = pixelList[p];
    }
    pixelList = []
    startPixel = [0,0];
}

function sumOfPixel(obj){
    return obj.RGB.reduce((acc,curr) => acc + curr, 0) - 255;
}

function pixelSorting(data, width, height, threshold, highlightFactor, noise, outputFile){
    var mask = [];

    for (y = 0; y < height; y++){
        for (x = 0; x < width; x++){
            var rPos = (width*y+x)*4;
            var gPos = (width*y+x)*4+1;
            var bPos = (width*y+x)*4+2;
            var pixelBrightness = data[rPos] + data[gPos] + data[bPos];
            imageData.push({
                "RGB":[
                    data[rPos],
                    data[gPos],
                    data[bPos],
                    255
                ]
            });
            if(noise){
                if(Math.random() < 0.998){
                    mask.push({
                        "RGB":[
                            0,
                            0,
                            0,
                            1
                        ]
                    });
                }
                else{
                    mask.push({
                        "RGB":[
                            1,
                            1,
                            1,
                            1
                        ]
                    });
                }
            }
            if(pixelBrightness * highlightFactor > threshold * highlightFactor){
                if(!noise){
                   mask.push({
                       "RGB":[
                           0,
                           0,
                           0,
                           1
                       ]
                   });
                }
            }
            else{
                if(noise){mask.pop();}
                mask.push({
                    "RGB":[
                        1,
                        1,
                        1,
                        1
                    ]
                });
            }

        }
    }
    var outputMask = [];
    for(i = 0; i < mask.length;i++){
        outputMask.push(mask[i].RGB[0]);
        outputMask.push(mask[i].RGB[1]);
        outputMask.push(mask[i].RGB[2]);
        outputMask.push(mask[i].RGB[3]);
    }
    output({
        data: outputMask,
        width: width,
        height: height
    }, 'mask.png');
    for (x = 0; x < width; x++){
        for (y = 0; y < height; y++){
            var [r, g, b, a] = imageData[width*y+x].RGB;
            if(mask[width*y+x].RGB[0] == 0){
                pixelList.push({
                    "RGB":[
                        r,
                        g,
                        b,
                        255
                    ]
                });
                if(startPixel[0] == 0 && startPixel[1] == 0){
                    startPixel = [x,y];
                }
                if(y == height-1){
                    sorting(width);
                }
            }
            else{
                if(pixelList.length > 0){
                    sorting(width);
                }
            }
        }
    }
    var outputImage = [];
    for(i = 0; i < imageData.length;i++){
        outputImage.push(imageData[i].RGB[0]);
        outputImage.push(imageData[i].RGB[1]);
        outputImage.push(imageData[i].RGB[2]);
        outputImage.push(imageData[i].RGB[3]);
    }
    output({
        data: outputImage,
        width: width,
        height: height
    }, outputFile);
}


/*getImage();*/
