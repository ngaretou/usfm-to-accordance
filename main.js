const { app, BrowserWindow, Menu, ipcMain, ipcRenderer } = require("electron");
const myData = require("./mydata");
const appText = myData.otherText;
const transl = myData.myTranslations;
//Set up some info about the app
let MyAppVersion = app.getVersion();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let mainMenu;
let contextMenu;

// Window state keeper - this and below windowStateKeeper code let the window
//return at its last known dimensions and location when reopened.
const windowStateKeeper = require("electron-window-state");

//------------------------
//mainWindow code
function createWindow() {
  //This is a global shared variable we'll use just to differentiate between mainWindow and secWindow on load.
  //We want to set it to true on createWindow so the window loading will know it is to run the mainWindow
  //code rather thansecondary window code.

  let winState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 600,
  });
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: winState.width,
    height: winState.height,
    minHeight: 600,
    minWidth: 1000,
    x: winState.x,
    y: winState.y,
    show: false,
    backgroundColor: 111111,
    resizable: true,
    webPreferences: { nodeIntegration: true, enableRemoteModule: true },
  });

  //Attach the windowstatemanager
  winState.manage(mainWindow);

  // and load the index.html of the app.
  mainWindow.loadFile("HTML/index.html");

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  //On close clear the variable
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
//End of mainWindow
//------------------------

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Create main window
  createWindow();
  createMenus();
});

//------------------------
//Menus
//For multilingual to work correctly we have to put our menus in separately
//from our normal window opening process, a bit unusually for Electron.
//This enables us to return to it however when we change languages.

//This calls the initial menu load after the variable has been loaded from localStorage
//Then for the refreshes the menu calls createMenus on click
ipcMain.on("set-display-lang", (e, displayLang) => {
  createMenus(displayLang);
  // Check for update after x seconds
  // const updater = require("./updater");
  // setTimeout(updater.check, 5000, displayLang);
});

function createMenus(displayLang) {
  let coreMenuSection1 = [
    {
      label: transl.menuCopy[displayLang],
      accelerator: "CmdOrCtrl+C",
      selector: "copy:",
    },
    {
      label: transl.menuSelectAll[displayLang],
      role: "selectAll",
      accelerator: "CmdOrCtrl+A",
    },
    {
      type: "separator",
    },
    {
      label: transl.menutoggleDevTools[displayLang],
      role: "toggleDevTools",
    },
    {
      label: transl.menuOpenAboutWin[displayLang],
      click() {
        openAboutWindow();
      },
    },
  ];

  //Language switcher submenu
  var coreMenuSection2 = [];
  if (!(Object.entries(transl.langName).length === 1)) {
    var langMenuDefinition = [];
    for (let [key, value] of Object.entries(transl.langName)) {
      miniLangMenuDefinition = {
        label: `${value}`,
        click() {
          createMenus(`${key}`);
          //Send a message to the renderer to refresh the language on the sidebar
          mainWindow.send("language-switch", `${key}`);
        },
      };
      langMenuDefinition.push(miniLangMenuDefinition);
    }

    coreMenuSection2 = [
      {
        label: transl.menuLangSwitch[displayLang],
        submenu: langMenuDefinition,
      },
    ];
  } //If the length is not equal to 1 that means there are multiple languages, so put in lang switcher
  //If there's only one display language it keeps rolling, skipping the language switcher

  //Now we have the first part of the menu as the array coreMenuDefinition
  //If we have a website prompt and a URL, make it the next part of the menu,
  //but if we don't have either one, then skip on to the final section of the menu
  if (
    !(transl.menuWebsite[displayLang] === "") &&
    !(appText.menuWebURL === "")
  ) {
    coreMenuSection3 = [
      {
        type: "separator",
      },
      {
        label: transl.menuWebsite[displayLang],
        click() {
          shell.openExternal(appText.menuWebURL);
        },
      },
      {
        type: "separator",
      },
    ];
  } else {
    coreMenuSection3 = [
      {
        type: "separator",
      },
    ];
  }

  //This is the last section of the menu
  coreMenuSection4 = [
    {
      label: transl.menuQuit[displayLang],
      role: "quit",
      accelerator: "CmdOrCtrl+Q",
    },
    { label: appText.thisAppName + " " + MyAppVersion, enabled: false },
  ];
  //This operator takes multiple arrays (coreMenuSections) and joins them into one array, coreMenuDefinition
  //https://dmitripavlutin.com/operations-on-arrays-javascript/#42-spread-operator
  coreMenuDefinition = [
    ...coreMenuSection1,
    ...coreMenuSection2,
    ...coreMenuSection3,
    ...coreMenuSection4,
  ];

  // Here we have separate menus for Mac (darwin) vs Win&Linux. To gain some consistency across the operating systems, we show the menu only in Mac.
  // If Win or Linux, it returns null below, which makes the menu empty, and thus hidden, and all functions are available from context menu.
  // Because of that our menu and contextmenu are basically identical, except that the mainMenu needs an extra level on top, with the main menu elements
  // as a submenu underneath that. So set up the core menu, then either dress it with that top Menu level or not and return the objects.

  //Now take that core definition array that we've assembled and include it in the Menu array wrapper
  //but only enable it if we're on macOS (darwin)
  if (process.platform === "darwin") {
    mainMenu = Menu.buildFromTemplate([
      { label: "Menu", submenu: coreMenuDefinition },
    ]);
  } else {
    mainMenu = null;
  }

  //The context menu just takes that core menu
  contextMenu = Menu.buildFromTemplate(coreMenuDefinition);

  mainWindow.webContents.on("context-menu", (e) => {
    contextMenu.popup();
  });

  //This is the menu declared in menu.js. If Win or Lin there will be no main menu.
  Menu.setApplicationMenu(mainMenu);

  mainWindow.send("change-lang", displayLang);
}
//End of createMenus
//------------------------

//When a language change is triggered via a click() calling createMenus() wiht the new language, it sends a message to
//the renderer telling it to change localStorage to teh desired lanugage for future loads. It then bounces a message
//back here to tell main process to reload the pages.
ipcMain.on("lang-changed-reload-pages", (e) => {
  mainWindow.hide();
  global.sharedObj = { loadingMain: true };
  mainWindow.webContents.reload();
  mainWindow.show();
});

//Handle drag and drop
ipcMain.on("ondragstart", (event, filePath) => {
  console.log("draganddrop in main.js");
  event.sender.startDrag({
    file: filePath,
    icon: "/path/to/icon.png",
  });
});

app.on("window-all-closed", function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") app.quit();
});

// When app icon is clicked and app is running, (macOS) recreate the BrowserWindow
app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
