const { app, BrowserWindow, Menu, ipcMain, ipcRenderer } = require("electron");
const fs = require("fs");
const myData = require("./mydata");
const appText = myData.otherText;
const transl = myData.myTranslations;
//Set up some info about the app
let MyAppVersion = app.getVersion();
let accArray = [];
let notesArray = [];
let trimmedstring;
let currentFileList;

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

//Testing mode
var testing;
//Comment out to disable automatic testing of the test file
//testing = true;
if (testing === true) {
  let rawdata = fs.readFileSync(
    "/Users/corey/Desktop/testingfile.json",
    "utf-8"
  );
  currentFileList = JSON.parse(rawdata);
  conversion(currentFileList);
}
//End testing mode

function sendmessage() {
  mainWindow.send("incoming-index");
}
function cutoutmiddle(str, wheretostartcut, wheretoendcut) {
  wheretostartcutindex = str.indexOf(wheretostartcut);
  wheretoendcutindex = str.indexOf(wheretoendcut) + wheretoendcut.length;
  firstpart = str.substring(0, wheretostartcutindex);
  secondpart = str.substring(wheretoendcutindex);
  trimmedstring = firstpart + secondpart;
  return trimmedstring;
}

function cutoutatstartandend(str, whattocutatstart, whattocutatend) {
  whattocutatstartindex = whattocutatstart.length;
  trimmedstring = str.substring(whattocutatstartindex);
  whattocutatendindex = trimmedstring.indexOf(whattocutatend);
  trimmedstring = trimmedstring.substring(0, whattocutatendindex);
  return trimmedstring;
}

//Conversion
function conversion(files) {
  for (let file of files) {
    //file by file, get the contents into a workable string
    var fileContents = fs.readFileSync(file.path, "utf8");

    // Get a string containing book abbreviation
    bookNameAbbreviation = fileContents.match(/(?<=\\id\s)\w*/);
    bookNameAbbreviationString = bookNameAbbreviation[0].toString();
    //console.log("bookNameAbbreviationString " + bookNameAbbreviationString);

    //Now do general changes.
    //Remove °
    var fileContents = fileContents.replace(/\°/g, "");

    //Replace \\p & \q1,\q2 etc with ¶
    var fileContents = fileContents.replace(/\\p\s/g, "¶");
    var fileContents = fileContents.replace(/\\q.*?\s/g, "¶");
    var fileContents = fileContents.replace(/\\ip.*?\s/g, "¶");
    var fileContents = fileContents.replace(/\\ie/g, "¶");

    //Replace \fk, fq, fr...\ft with <b>...</b>
    var fileContents = fileContents.replace(
      /(\\fr\s)(\d+[.:]\d+)(\s\\fk\s)(.*?)(\s\\ft)/g,
      `<b>$2</b> <b>$4</b>`
    );

    // console.log(fileContents);

    var fileContents = fileContents.replace(/\\fk\s/g, "<b>");
    var fileContents = fileContents.replace(/\\fq\s/g, "<b>");
    var fileContents = fileContents.replace(/\\fr\s/g, "<b>");
    var fileContents = fileContents.replace(/(?<!\s)\\ft/g, "</b>"); //instances where there is no space before the \ft
    var fileContents = fileContents.replace(/\s\\ft/g, "</b>");

    //italics
    var fileContents = fileContents.replace(/\\bk\s/g, "<i>");
    var fileContents = fileContents.replace(/\\bk\\*/g, "</i>");

    //intro outline lists
    var fileContents = fileContents.replace(/\\ili\s/g, "¶•  ");

    //Take out glossary terms (for now)
    var fileContents = fileContents.replace(/\|.*?:\\w\*/g, "");
    var fileContents = fileContents.replace(/\\w\s/g, "");

    //split the file contents into chapters
    var chapters = fileContents.split(/\\c\s/);

    //split chapter into verses
    for (let chapter of chapters) {
      chapNum = chapter.match(/\d+/);
      // console.log("chapter " + chapNum[0]);

      var verses = chapter.split(/\\v\s/);
      if (verses.length < 2) {
        //special case for intros; any section that does not have verses
        chapterWithNoVerses = verses.toString();

        //Peel off the \id, \h, and TOCs to get to \mt1
        var startAt = `\\mt1`;
        var startingChar = chapterWithNoVerses.indexOf(startAt);
        chapterWithNoVersesFromMT1 = chapterWithNoVerses.substring(
          startingChar
        );

        //This gets your main titles mt mt1 mt2, also imt is intro section headings
        var titles = chapterWithNoVersesFromMT1.match(
          /(?<=\\\w?[sm].?\d?\s).+.+/g
        );

        //Now for each of our title lines, mt1, mt2, imt etc
        for (let title of titles) {
          var entry = {
            bookAbbreviation: bookNameAbbreviationString,
            type: "title",
            lineText: `<b>${title}</b>`,
          };
          // console.log("titles " + entry.lineText);

          //Store those titles in the notes array
          notesArray.push(entry);
        }
        //If there's only one title, we've entered the rest of what we need already above; move on.
        if (titles.length > 1) {
          //But if there is something more than one title, we should enter it.
          lastTitle = titles[titles.length - 1];

          whatsLeftAfterTitles = chapterWithNoVersesFromMT1.substring(
            chapterWithNoVersesFromMT1.indexOf(lastTitle) + lastTitle.length
          );
          var entry = {
            bookAbbreviation: bookNameAbbreviationString,
            type: "intro",
            lineText: whatsLeftAfterTitles,
          };
          //This logs out the titles of the book
          //console.log(entry);

          //Store those titles in the notes array
          notesArray.push(entry);
        }
      } else {
        //if it's a regular chapter, not our introduction
        for (let verse of verses) {
          //Take out section headings - this is a general change so is done to all the files but here rather than with rest of them because we have to get the main titles in the first chapter.
          //\ms, \mr etc
          var verseContents = verse.toString();
          var verseNum = verseContents.match(/\d+/);

          var verseContents = verseContents.replace(/\\m.*?\s.*\n/g, "");
          //\s \s1 etc
          var verseContents = verseContents.replace(/\\s.*?\s.*\n/g, "");

          //For first entry in verses you have usually just the chapter number alone, so throw it away and move on
          if (verseContents.length > 8) {
            //Check for footnotes
            hasFootnotes = verseContents.includes(`\\f \+`);
            if (hasFootnotes === true) {
              //Grab the footnotes in an array
              var footnotes = verseContents.match(/\\f.*?\\f\u002a.*?/g);
              // console.log(footnotes.length + " = number of footnotes");

              for (let footnote of footnotes) {
                cutoutatstartandend(footnote, `\\f + `, `\\f*`);
                footnote = trimmedstring;

                var entry = {
                  bookAbbreviation: bookNameAbbreviationString,
                  type: "footnote",
                  lineText: footnote,
                };
                // console.log("footnotes below: ");
                // console.log(entry);

                notesArray.push(entry);
                cutoutmiddle(verseContents, `\\f \+`, `\\f\*`);

                verseContents = trimmedstring;
              }
            }
            //End of has footnotes case
            var entry = {
              bookAbbreviation: bookNameAbbreviationString,
              type: "verse",
              chapNum: chapNum[0],
              verseNum: verseNum[0],
              lineText: verseContents,
            };

            accArray.push(entry);
          }
        }
      }
    }
  }
  // sendmessage();
  mainWindow.send("indexing-done", accArray, notesArray);

  console.log("last bracket");
}

// var oneChapterByVerse = fileContentsBody.split(splitString);
// //Leave out the documents that don't have more than two verses: intros, glossaries etc. This counts the array elements = verses.
// if (oneChapterByVerse.length > 2) {
//   //For each verse in the resulting array, make an object that contains the relevent info so we can go back to it
//   for (const verse of oneChapterByVerse) {
//     //Get verse number
//     var verseNumber = verse.substring(0, verse.indexOf(`"`));
//     //Get the verse string without the nbsp;. substring with no second argument goes to end of string

//     var verseInteriorIndex = verse.indexOf(`&nbsp;</span>`);

//     var verseString = verse.substring(verseInteriorIndex);
//     //Now we're changing the verseString and stripping off bits we don't need
//     verseString = verseString.substring(
//       0,
//       verse.indexOf(`<span id="bookmarks${verseNumber}"></span>`)
//     );

//     //for each verse, Take out HTML tags
//     verseString = verseString.replace(/<\/?[^>]+(>|$)/g, "");

//     //There is a nbsp; left over at the beginning of each verse, take it out; rememeber (6) here amounts to "start 6 characters in and go to the end"
//     verseString = verseString.substring(6);

//     //Now store each verse in the array
//     var oneVerse = {
//       id: verseid,
//       file: file,
//       folder: collection.folder,
//       collectionName: collection.name,
//       verseText: verseString,
//       bookAndChapter: bookAndChapter,
//       verseNumber: verseNumber,
//     };
//     allVersesArray.push(oneVerse);
//     verseid++;
//   }

ipcMain.on("start-conversion", (event, currentFileList) => {
  conversion(currentFileList);
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
