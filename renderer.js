//Imports
const ipcRen = require('electron').ipcRenderer;
const fs = require("fs");
const {dialog} = require("electron").remote;
const pixels = require('image-pixels');
const output = require('image-output');
const resizeImageData = require('resize-image-data');
//HTML Elements
const highlightButton = document.getElementById('highlightButton');
const thresholdSlider = document.getElementById('thresholdSlider');
const c = document.getElementById("imageCanvas");
//Edit Variables
var origImageData = [[],0,0];
var downscaledImageData = [[],0,0];
var highlightFactor = 1;
var imageArray = [[],0,0];
var rotate = false;

var black = {"RGB":[0,0,0,1]};
var white = {"RGB":[1,1,1,1]};

function renderImageArray(){
	if(downscaledImageData[1] !== 0){
		let threshold = (thresholdSlider.value/100)*765;
		let noise = document.getElementById('noiseBox').checked;
		startPixelSorting(downscaledImageData, threshold, highlightFactor, noise).then(result=>{
			imageArray = result;
			console.log('rendered');
			updateCanvas();
		});
	}
}

function updateCanvas(){
	let input = imageArray[0];
	let outputData = [];
	for(i = 0; i < input.length;i++){
		outputData.push(input[i].RGB[0]);
		outputData.push(input[i].RGB[1]);
		outputData.push(input[i].RGB[2]);
		outputData.push(input[i].RGB[3]);
	}
	output({
		data: outputData,
		width: imageArray[1],
		height: imageArray[2]
	},c);	
}

function rotateImage(imageObject){
	var returnImageArray = [];
	var width = imageObject[1];
	var height = imageObject[2];
	for(i = 0; i < width;i++){
		for(j = 0; j < height; j++){
			returnImageArray[i * height + j] = imageObject[0][j * width + i]
		}
	}
	return [returnImageArray,height,width];
}

function scalePreserve(imgW,imgH,maxW,maxH){
	return(Math.min((maxW/imgW),(maxH/imgH)));
}

document.getElementById('rotate').addEventListener('click', () =>{
	rotate = !rotate;
	renderImageArray();
});

document.getElementById('startButton').addEventListener('click', () => {
    if(imageArray[1] !== 0){
        dialog.showSaveDialog({
			filters:[{
				name: 'Images',
				extensions:['jpg', 'png']}
			]}).then(result=>{
                if(!result.canceled){
					let threshold = (thresholdSlider.value/100)*765;
					let noise = document.getElementById('noiseBox').checked;
					startPixelSorting(origImageData, threshold, highlightFactor, noise).then(data=>{
						saveObjectAsImage(data[0],data[1],data[2],result.filePath)	
					});

                }
            }).catch(err =>{
                console.log(err);
            });
    }
    else{
        console.log('no file');
        dialog.showMessageBox({
			type:"warning",
            title:"Warning",
            message:"Please select a input file"});
    }
});

document.getElementById('fileInputButton').addEventListener('click', () =>{
	dialog.showOpenDialog({
		properties:['openFile'],
		filters:[{
			name: 'Images',
			extensions: ['jpg', 'png']
		}]
	}).then(async (result) =>{
   		if(!result.canceled){
   			var inputFile = result.filePaths[0];
			var {data, width, height} = await pixels(inputFile);
			origImageData[0] = dataToImageDataObject(width, height, data);
			origImageData[1] = width;
			origImageData[2] = height;


			var sizer = scalePreserve(width, height,500,500);
			let newWidth = Math.ceil(width*sizer);
			let newHeight = Math.ceil(height*sizer);
			let imageDataObject = {width: width,height:height,data:data};
			let resizedImageData=resizeImageData(imageDataObject,newWidth,newHeight,'biliniear-interpolation');
			downscaledImageData[0] = dataToImageDataObject(newWidth,newHeight,resizedImageData.data);
			downscaledImageData[1] = newWidth;
			downscaledImageData[2] = newHeight; 
			renderImageArray();
   		}
   	}).catch(err =>{
   		console.log(err)
   	});
});

document.getElementById('noiseBox').addEventListener('click', ()=>{
	renderImageArray();
});

highlightButton.addEventListener('click', () => {
    highlightFactor = highlightFactor * -1;
    if(highlightFactor > 0){
        highlightButton.value = "Highlights";
    }
    else{
        highlightButton.value = "Shadows";
    }
	renderImageArray();
});

thresholdSlider.addEventListener('input',() =>{
    document.getElementById('thresholdValue').innerHTML = thresholdSlider.value;
});

thresholdSlider.addEventListener('click',()=>{
	renderImageArray();	
});

document.getElementById('close').addEventListener('click', () =>{
    ipcRen.send('closeApp');
});

document.getElementById('minimize').addEventListener('click', ()=>{
    ipcRen.send('minimizeApp');
});

//////////////////////////////////////////////////////////////
////*Make mask, rotate and overall apply Image Processing*////
//////////////////////////////////////////////////////////////

//Retrieve image data
async function startPixelSorting(inputImageData, threshold, highlightFactor, noise){
	if(rotate){
		inputImageData = rotateImage(inputImageData);
	}
	var imageData = inputImageData[0].concat();
	var width = inputImageData[1];
	var height = inputImageData[2];

	var mask = makeMask(width, height, noise, highlightFactor, threshold, imageData);
	//saveObjectAsImage(mask, width, height, 'mask.png');

	var output = pixelSorting(width, height, imageData, mask);
	if(rotate){
		return rotateImage([output,width,height]);
	}
	else{
		return [output,width,height];
	}
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
function pixelSorting(width, height, imageData, mask){
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
	return imageData;
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

