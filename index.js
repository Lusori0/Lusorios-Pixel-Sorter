const pixels = require('image-pixels');
const output = require('image-output');
const {app, BrowserWindow} = require('electron');
const {ipcMain} = require('electron');

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
		width:880,
	    height:600,
		resizable: false,
		frame: false,
		webPreferences:{
			nodeIntegration: true
		}
	});
	win.loadFile('index.html');
	win.webContents.openDevTools();
	win.on('closed', () => {
		win = null;
	});
}
/////////////////////////////////////////////////////////
////*Communication between Main and Renderer process*////
/////////////////////////////////////////////////////////

ipcMain.on('closeApp',(event)=>{
	app.quit();
});

ipcMain.on('minimizeApp', (event)=>{
	win.minimize();
});
