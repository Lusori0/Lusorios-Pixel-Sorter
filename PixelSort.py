from PIL import Image
from tkinter import ttk, messagebox
from tkinter import filedialog, HORIZONTAL, LEFT, RIGHT, TOP, BOTTOM
from tkinter import Tk, Label, Button, LabelFrame, Scale
import threading

class GUI:
    filename = None
    fileOutput = None
    im = None
    out = None
    width, height = (10,10)
    threshold = 450
    t1 = None
    startPixel = (0,0)
    pixelList = []
    hlfactor = 1
    def __init__(self, master):
        self.master = master
        master.title("PixelSorting")

        ### HEADER ###

        self.label = Label(master, text="Pixel Sorting Algorithm")
        self.label.config(font=('Courier',29))
        self.label.pack(padx=20,pady=20)

        ### FILE MANAGEMENT ###

        self.fileGroup = LabelFrame(master,text="",padx=5,pady=5,bd=0)
        self.fileGroup.pack()

        ### input file ###
        self.iFileGroup = LabelFrame(self.fileGroup, text="Input",padx=5,pady=5)
        self.iFileGroup.grid(row=0,column=0,padx=5,pady=5)

        self.fileLabel = Label(self.iFileGroup, text=self.filename)
        self.fileLabel.config(width='40')
        self.fileLabel.pack()

        self.inputFileButton = Button(self.iFileGroup, text="Choose File", command=self.chooseFile)
        self.inputFileButton.pack(side=LEFT)

        ### output dir ###

        self.oFileGroup = LabelFrame(self.fileGroup,text="Output", padx=5,pady=5)
        self.oFileGroup.grid(row = 0,column=1,padx=5,pady=5)

        self.oFileLabel = Label(self.oFileGroup, text=self.fileOutput)
        self.oFileLabel.config(width='40')
        self.oFileLabel.pack()

        self.outputFileDir = Button(self.oFileGroup,text="Choose Output", command=self.chooseDir)
        self.outputFileDir.pack(side=LEFT)

        ### SETTINGS ###

        self.settingsGroup = LabelFrame(master,text="Settings",padx=5,pady=5)
        self.settingsGroup.pack(padx=5,pady=10)

        self.thresholdLabel = Label(self.settingsGroup, text="Threshold")
        self.thresholdLabel.grid(column = 0,row=0,pady=5,padx=5)

        self.threshSlider = Scale(self.settingsGroup, from_=0, to=765,orient=HORIZONTAL,sliderlength=10,length=500)
        self.threshSlider.grid(column = 1,row=0,pady=5,padx=5)

        self.hlfactorButton = Button(self.settingsGroup, text="Highlights", command=self.hlfactorBtn)
        self.hlfactorButton.config(width='10')
        self.hlfactorButton.grid(column = 0,row=1,padx=5,pady=5)

        self.progressBar = ttk.Progressbar(master,orient=HORIZONTAL,length=600,mode="determinate")
        self.progressBar["maximum"]=100
        self.progressBar.pack(padx=5,pady=5)

        self.startButton = Button(master, text="Run PixelSort", command=self.startProcess,width=25)
        self.startButton.pack(padx=5,pady=5)

    def hlfactorBtn(self):
        if(self.hlfactor == 1):
            self.hlfactorButton.config(text="Shadows")
        else:
            self.hlfactorButton.config(text="Highlights")
        self.hlfactor = self.hlfactor * -1

        
    def chooseFile(self):
        self.filename = filedialog.askopenfilename(initialdir = "/",title = "Select File", filetypes = (("JPEG","*.jpg"),("PNG",".png")))
        self.fileLabel.config(text=self.filename)

    def chooseDir(self):
        self.fileOutput = filedialog.asksaveasfilename()

        self.oFileLabel.config(text=self.fileOutput)


    def startProcess(self):
        if (self.filename != None and self.fileOutput != None):
            self.im = Image.open(self.filename)
            self.im = self.im.convert('RGB')
            self.out = Image.new('RGB', self.im.size, 0xffffff)
            self.width, self.height = self.im.size
            self.threshold = self.threshSlider.get()
            self.t1 = threading.Thread(target=self.pixelSorting)
            self.t1.start()
        else:
            messagebox.showinfo("Error","Please make sure to select a Input File and a Output Directory")
       
    ### Pixel Sorting Algorithm ###

    def sorting(self):
        self.pixelList.sort(key=lambda tup: tup[0]+tup[1]+tup[2])
        for p in range(len(self.pixelList)):
            self.im.putpixel((self.startPixel[0],self.startPixel[1] + p -1),self.pixelList[p])
        self.pixelList = []
        self.startPixel = (0,0)


    def pixelSorting(self):
        for x in range(self.width):
            self.progressBar["value"]=(int((x/self.width)*100))
            for y in range(self.height):
                pixel = self.im.getpixel((x,y))
                if(sum(pixel)*self.hlfactor > self.threshold*self.hlfactor):
                    self.pixelList.append(pixel)
                    if(self.startPixel == (0,0)):
                        self.startPixel = (x,y)
                    if(y == self.height-1):
                        self.sorting()
                else:
                    if(self.pixelList != []):
                        self.sorting()

        self.im.save(self.fileOutput)
        print("Done!")
        self.progressBar["value"] = 0

root = Tk()
my_gui = GUI(root)
root.geometry("700x400")
root.mainloop()

