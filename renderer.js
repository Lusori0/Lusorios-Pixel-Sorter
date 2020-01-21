//Imports
const ipcRen = require('electron').ipcRenderer;
const fs = require("fs");
const {dialog} = require("electron").remote;
//HTML Elements
const startButton = document.getElementById('startButton');
const fileInputButton = document.getElementById('fileInputButton');
const highlightButton = document.getElementById('highlightButton');
const thresholdSlider = document.getElementById('thresholdSlider');
//Edit Variables
var highlightFactor = 1;
var inputFile = "";
var outputFile = "";
var noise = true;

document.getElementById('close').addEventListener('click', () =>{
    ipcRen.send('closeApp');
});

document.getElementById('minimize').addEventListener('click', ()=>{
    ipcRen.send('minimizeApp');
});

startButton.addEventListener('click', () => {
    if(inputFile !== ""){

        dialog.showSaveDialog({filters:[{name: 'Images', extensions:['jpg', 'png']}]},
                             ).then(result =>{
                                 if(!result.canceled){
                                     outputFile = result.filePath;
                                     var threshold = (thresholdSlider.value/100)*765;
                                     var args = {
                                         inputFile: inputFile,
                                         threshold: threshold,
                                         highlightFactor: highlightFactor,
                                         noise: noise,
                                         outputFile: outputFile
                                     };
                                     ipcRen.send('startButton', args);
                                 }
                             }).catch(err =>{
                                 console.log(err);
                             });
    }
    else{
        console.log('no file');
        dialog.showMessageBox({type:"warning",
                               title:"Warning",
                               message:"Please select a input file"});
    }
});

fileInputButton.addEventListener('click', () =>{
    console.log('FileButtonClicked');
    dialog.showOpenDialog({filters:[{name: 'Images', extensions: ['jpg', 'png']}]},
                          {properties:['openFile']}).then(result =>{
                              console.log(result.canceled)
                              console.log(result.filePaths)
                              if(!result.canceled){
                                  inputFile = result.filePaths[0];
                              }
                              document.getElementById("inputFilePath").innerHTML = inputFile.split('\\').pop().split('/').pop();
                          }).catch(err =>{
                              console.log(err)
                          });
});

highlightButton.addEventListener('click', () => {
    highlightFactor = highlightFactor * -1;
    if(highlightFactor > 0){
        highlightButton.value = "Highlights";
    }
    else{
        highlightButton.value = "Shadows";
    }
});

thresholdSlider.addEventListener('input',() =>{
    document.getElementById('thresholdValue').innerHTML = thresholdSlider.value;
});

document.getElementById('noiseBox').addEventListener('click', () =>{
    noise = !noise;
});
