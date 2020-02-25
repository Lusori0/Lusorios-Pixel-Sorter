const pixels = require('image-pixels');
const output = require('image-output');
const {app, BrowserWindow} = require('electron');
const {ipcMain} = require('electron');

//////////////////////////////////////
////*Setup of everything electron*////
//////////////////////////////////////
//dumb color definitions//
var black = {"RGB":[0,0,0,1]};
var white = {"RGB":[1,1,1,1]};

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
/////////////////////////////////////////////////////////
////*Communication between Main and Renderer process*////
/////////////////////////////////////////////////////////

ipcMain.on('startButton', (event, args) => {
	startPixelSorting(args.inputFile, args.threshold, args.highlightFactor, args.noise, args.outputFile);
	event.sender.send("btnclick-task-finished", "yes");
});

ipcMain.on('closeApp',(event)=>{
	app.quit();
});

ipcMain.on('minimizeApp', (event)=>{
	win.minimize();
});

//////////////////////////////////////////////////////////////
////*Make mask, rotate and overall apply Image Processing*////
//////////////////////////////////////////////////////////////

//Retrieve image data
async function startPixelSorting(inputFile, threshold, highlightFactor, noise, outputFile){
	var {data, width, height} = await pixels(inputFile);
	var imageData = dataToImageDataObject(width, height, data);

	var mask = makeMask(width, height, noise, highlightFactor, threshold, imageData);
	saveObjectAsImage(mask, width, height, 'mask.png');

	pixelSorting(width, height, outputFile, imageData, mask);

};

//Sort a list of Pixels and get it Back into imageData
function sorting(width, pixelList, startPixel, imageData){
	pixelList.sort((a,b) => sumOfPixel(a) - sumOfPixel(b));
	for (p = 0; p < pixelList.length;p++){
		imageData[(startPixel[1] + p - 1) * width + startPixel[0]] = pixelList[p];
	}
	return imageData;
}

function sumOfPixel(obj){
	return obj.RGB.reduce((acc,curr) => acc + curr, 0) - 255;
}
//Algorithm to make arrays of pixels to be sorted
function pixelSorting(width, height, outputFile, imageData, mask){
	var pixelList = [];
	var startPixel = [0,0];
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
					imageData =sorting(width, pixelList, startPixel, imageData);
					pixelList = [];
					startPixel = [0,0];
				}
			}
			else{
				if(pixelList.length > 0){
					imageData = sorting(width, pixelList, startPixel, imageData);
					pixelList = [];
					startPixel = [0,0];
				}
			}
		}
	}
	saveObjectAsImage(imageData, width, height, outputFile);
}
//save a image data object as an image
function saveObjectAsImage(input, width, height, name){
	var outputData = [];
	for(i = 0; i < input.length;i++){
		outputData.push(input[i].RGB[0]);
		outputData.push(input[i].RGB[1]);
		outputData.push(input[i].RGB[2]);
		outputData.push(input[i].RGB[3]);
	}
	output({
		data: outputData,
		width: width,
		height: height
	}, name);
}
//convert the image array data to a image data object
function dataToImageDataObject(width, height, data){
	var object = [];
	for (y = 0; y < height; y++){
		for (x = 0; x < width; x++){
			var rPos = (width*y+x)*4;
			var gPos = (width*y+x)*4+1;
			var bPos = (width*y+x)*4+2;
			var pixelBrightness = data[rPos] + data[gPos] + data[bPos];
			object.push({
				"RGB":[
					data[rPos],
					data[gPos],
					data[bPos],
					255
				]
			});
		}
	}
	return object;
}
//function to make the mask, where to apply pixel sorting
function makeMask(width, height, noise, highlightFactor, threshold, imageData){
	var mask = [];
	for (y = 0; y < height; y++){
		for (x = 0; x < width; x++){

			var [r, g, b, a] = imageData[width*y+x].RGB;
			pixelBrightness = r+g+b;

			if(pixelBrightness * highlightFactor > threshold * highlightFactor){
				mask.push(black);
			}
			else{
				mask.push(white);
			}

			if(noise && Math.random() > 0.998){
				mask.pop();
				mask.push(white);
			}
		}
	}
	return mask;
}
