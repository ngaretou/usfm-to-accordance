const { app, BrowserWindow, Menu, ipcMain, ipcRenderer } = require("electron");
const fs = require("fs");
const myData = require("./mydata");
const appText = myData.otherText;
const transl = myData.myTranslations;
//Set up some info about the app
let MyAppVersion = app.getVersion(),
  // accArray = [],
  // notesArray = [],
  // errorArray = [],
  trimmedstring,
  // currentFileList,
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  mainWindow,
  mainMenu,
  contextMenu;

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

  //Testing mode
  var testing;
  //Comment out to disable automatic testing of the test file
  //testing = true;
  if (testing === true) {
    let rawdata = fs.readFileSync(
      "/Users/corey/Desktop/testingfile.u2ac",
      "utf-8"
    );
    currentFileList = JSON.parse(rawdata);
    conversion(currentFileList);
  }
  //End testing mode
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

function cutoutatstart(str, whattocutatstart) {
  var whattocutatstartStr = str.match(whattocutatstart);
  whattocutatstartindex = whattocutatstartStr[0].length;
  trimmedstring = str.substring(whattocutatstartindex);
  return trimmedstring;
}

//Conversion
function conversion(files) {
  let accArray = [],
    notesArray = [],
    errorArray = [],
    listofBooksinCurrentBible = [],
    chaptersByLastVerse = [];
  for (let file of files) {
    //file by file, get the contents into a workable string
    var fileContents = fs.readFileSync(file.path, "utf8");

    // Get a string containing book abbreviation
    bookNameAbbreviation = fileContents.match(/(?<=\\id\s)\w*/);
    bookNameAbbreviationString = bookNameAbbreviation[0].toString();
    listofBooksinCurrentBible.push(bookNameAbbreviationString);

    //Now do general changes.
    // var fileContents = fileContents.replace(/\\s.*?\s.*\n/g, "");
    //\p \pmo \pm marks have to be inside, not outside, their associated verses
    var fileContents = fileContents.replace(
      /(\\p\w*\r\n)(\\v\s)(\d*\s)/g,
      "$2$3¶ "
    );

    //Cleanup of an unusual case where there was \c 5 \b \q1 \v 1: that extra marker in between \c  and \v threw an error when parsed to an array of verses later on
    var fileContents = fileContents.replace(
      /(\\c\s\d+\r\n)(\\\w+\r\n)(\\\w+\r\n)/g,
      `$1$3`
    );

    //Above changing para marks to be inside their verse numbers - this time for dash-separated verse marks
    var fileContents = fileContents.replace(
      /(\\p\r\n)(\\v\s)(\d*-\d*\s)/g,
      "$2$3¶ "
    );
    //Also get \li* marks inside their verse numbers - this continues to get verse numbers inline
    var fileContents = fileContents.replace(
      /(\\li\d*\r\n)(\\v\s)(\d*\s)/g,
      "$2$3¶ "
    );
    //Also get \li* marks inside their verse numbers - this time for dash-separated verse marks
    var fileContents = fileContents.replace(
      /(\\li\d*\s)(\\v\s)(\d*-\d*\s)/g,
      "$2$3¶ "
    );

    //at this point any remaining \p markers are mid-verse so get <br>
    var fileContents = fileContents.replace(/\r\n\\p\w*\s/g, "<br>");

    //q1, q2 when next to a \v get para mark; otherwise get <br>
    var fileContents = fileContents.replace(
      /(\\q\d*\r\n)(\\v\s)(\d*\s)/g,
      `$2$3¶ `
    );
    var fileContents = fileContents.replace(/\r\n\\q.*?\s/g, "<br>");

    // But /ip intro paragraph gets the para mark
    var fileContents = fileContents.replace(/\\ip.*?\s/g, "¶");

    //Remove °
    var fileContents = fileContents.replace(/\°/g, "");
    var fileContents = fileContents.replace(/---/g, "-");

    //Replace \\p & \q1,\q2 etc with ¶

    //Some li* markers have carriage returns that we need to eliminate when li >> br
    var fileContents = fileContents.replace(/\r\n\\li\d*/g, "<br>");
    var fileContents = fileContents.replace(/\r\n\\ie/g, "<br>");
    //others do not, we just replace them with br
    var fileContents = fileContents.replace(/\\li\d*/g, "<br>");
    var fileContents = fileContents.replace(/\\ie/g, "<br>");

    //Replace \fk, fq, fr...\ft with <b>...</b>
    // var fileContents = fileContents.replace(
    //   /(\\fr\s)(\d+[.:]\d+)(\s\\fk\s)(.*?)(\s\\ft)/g,
    //   `<b>$2</b> <b>$4</b>`
    // );

    //The order is important!
    //fq...fk italics
    var fileContents = fileContents.replace(
      /(\\fq\s)(.*?)(\\ft)/g,
      `<i>$2</i>`
    );
    //Footnote ref callers
    // var fileContents = fileContents.replace(/(\\fr\s)/g, `<b>`);
    // var fileContents = fileContents.replace(/(\\ft)/g, `</b>`);
    // //\fk only appears in between fr and ft and always is in the middle of bold so get rid of it.
    // var fileContents = fileContents.replace(/(\\fk\s)/g, "");
    //Temporarily not doing bold
    var fileContents = fileContents.replace(/(\\fr\s)/g, `<b>`);
    var fileContents = fileContents.replace(/(\s\\ft)/g, `</b>`);
    var fileContents = fileContents.replace(/(\\ft)/g, `</b>`); //as above but catching ones without whitespace before - only one or two
    //\fk only appears in between fr and ft and always is in the middle of bold so get rid of it.
    var fileContents = fileContents.replace(/(\\fk\s)/g, "");
    var fileContents = fileContents.replace(/(\\fk\*\s)/g, "</b>");
    var fileContents = fileContents.replace(
      /(\\fq\s)(.*?)(\\ft\s)/g,
      `<i>$2</i>`
    );
    var fileContents = fileContents.replace(
      /(\\fq\s)(.*?)(\\fq\*)/g,
      `<i>$2</i>`
    );
    var fileContents = fileContents.replace(
      /(\\fqa*\s)(.*?)(\\f\*)/g,
      `<i>$2</i> $3`
    );
    var fileContents = fileContents.replace(
      /(\\qs\s)(.*?)(\\qs\*)/g,
      `<i>$2</i>`
    );
    var fileContents = fileContents.replace(
      /(\\qt\s)(.*?)(\\qt\*)/g,
      `<i>$2</i>`
    );

    // var fileContents = fileContents.replace(
    //   /(\\fk\s)(.*?)(\\fk\*)/g,
    //   `<b>$2</b>`
    // );

    // var fileContents = fileContents.replace(/\\fk\s/g, "<b>");
    // // var fileContents = fileContents.replace(/\\fq\s/g, "<b>");

    // var fileContents = fileContents.replace(/\\fr\s/g, "<b>");
    // var fileContents = fileContents.replace(/(?<!\s)\\ft/g, "</b>"); //instances where there is no space before the \ft
    // var fileContents = fileContents.replace(/\s\\ft/g, "</b>");

    //italics
    var fileContents = fileContents.replace(/\\bk\s/g, "<i>");
    var fileContents = fileContents.replace(/\\bk\*/g, "</i>");
    var fileContents = fileContents.replace(/\\k\s/g, "<i>");
    var fileContents = fileContents.replace(/\\k\*\s/g, "</i>");

    //intro outline lists
    var fileContents = fileContents.replace(/\\ili\s/g, "¶•  ");

    //Take out glossary terms (for now)
    var fileContents = fileContents.replace(/\|.*?:\\\+*w\*/g, ""); // |glossaryterm\w
    var fileContents = fileContents.replace(/\\\+*w\s/g, ""); //\w, \+w

    //Take out \\b and replace with inline <br> line breaks
    //but first an unusual case - in case of \c X \b \xxx
    var fileContents = fileContents.replace(/(\\c\s\d*\r\n)(\\b\r\n)/g, "$1");
    //now that \b to <br>
    var fileContents = fileContents.replace(/\r\n\\b/g, "<br>");

    //split the file contents into chapters
    var chapters = fileContents.split(/\\c\s/);

    //split chapter into verses
    for (let chapter of chapters) {
      chapNum = chapter.match(/\d+/);

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
            chapNum: chapNum,
            verseNum: 0,
            type: "title",
            lineText: `<b>${title}</b>`,
          };

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

          //At this point, the only thing left are intros and other front matter, so put a verse 0 on it and it will go to the beginning of the notes book when it is formed.

          var entry = {
            bookAbbreviation: bookNameAbbreviationString,
            chapNum: chapNum,
            verseNum: 0,
            type: "intro",
            lineText: whatsLeftAfterTitles,
          };

          //Store those titles in the notes array
          notesArray.push(entry);
        }
      } else {
        //if it's a regular chapter, not our introduction
        for (let verse of verses) {
          //Take out section headings - this is a general change so is done to all the files but here rather than with rest of them because we have to get the main titles in the first chapter.
          //\ms, \mr etc
          var verseContents = verse.toString();

          //Accordance doesn't care about missing verses. They only care about extra verses, and there can be none.
          //What it doesn't handle well is dashed verses, so if we get rid of the second number on any dashed verses, that should work well in most cases.
          // var verseNum = verseContents.match(/\d+-*\d*/); //This would get dashed verses
          var verseNum = verseContents.match(/\d+/); //This strips off dashes and only gets that first number.

          //Accordance does not take section headings, just verse text, so blow away \s \s1 \sp etc
          var verseContents = verseContents.replace(/\\m.*?\s.*\n/g, "");

          var verseContents = verseContents.replace(/\\s.*?\s.*\n/g, "");

          cutoutatstart(verseContents, `\\d+-*\\d*\\s`);
          verseContents = trimmedstring;

          //For first entry in verses you have usually just the chapter number alone, so throw it away and move on
          if (verseContents.length > 8) {
            //Check for footnotes
            hasFootnotes = verseContents.includes(`\\f \+`);
            if (hasFootnotes === true) {
              //Grab the footnotes in an array
              var footnotes = verseContents.match(/\\f.*?\\f\u002a.*?/g);

              for (let footnote of footnotes) {
                cutoutatstartandend(footnote, `\\f + `, `\\f*`);
                footnote = trimmedstring;

                var entry = {
                  bookAbbreviation: bookNameAbbreviationString,
                  chapNum: chapNum,
                  verseNum: verseNum,
                  type: "footnote",
                  lineText: footnote,
                };

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

  //Now normalize the versification.

  //First get current Bible versification
  for (let book of listofBooksinCurrentBible) {
    // console.log("listofBooksinCurrentBible");
    // console.log(book);

    let versesInCurrentBook = accArray.filter(function (e) {
      return e.bookAbbreviation === book;
    });
    //This makes a new array that only includes the chapters in current book.
    //[1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2] etc - so then we can get the index of the last verse of each chapter and look up the verse number back in the original array
    const arrChapters = versesInCurrentBook.map((el) => el.chapNum);

    //Get a list of the chapter numbers in this book in an array by reducing that array of Chapter numbers to unique values
    // https://www.samanthaming.com/tidbits/43-3-ways-to-remove-array-duplicates/
    arrOfChapterNumbers = Array.from(new Set(arrChapters));
    // console.log("arrOfChapterNumbers");
    // console.log(arrOfChapterNumbers);

    //Now get the index of the last verse in each chapter
    //For each chapter in our simplified list of unique chapter numbers - so one result per chapter
    for (let chapter of arrOfChapterNumbers) {
      //get the last index of where that chap number appears.
      let lastverseindex = arrChapters.lastIndexOf(chapter);

      var lastversenumber = versesInCurrentBook[lastverseindex].verseNum;

      var dashedVersesCheck = lastversenumber.search("-");
      if (dashedVersesCheck !== -1) {
        console.log("dashed verses check here:");
        console.log(lastversenumber + " becomes:");
        lastversenumber = lastversenumber.substring(dashedVersesCheck + 1);
        // console.log(lastversenumber);
      }

      entry = {
        bookAbbreviation: book,
        chapNum: chapter,
        lastverse: lastversenumber,
      };
      chaptersByLastVerse.push(entry);
    }
  }
  //chaptersByLastVerse gives you the number of the last verse of each chapter in each book.
  // console.log(
  //   "chaptersByLastVerse gives you the number of the last verse of each chapter in each book."
  // );
  // console.log(chaptersByLastVerse);
  let rawdata1 = fs.readFileSync(`eng.json`);
  let KJVversification = JSON.parse(rawdata1);
  let rawdata2 = fs.readFileSync(`org.json`);
  let origversification = JSON.parse(rawdata2);

  //Get array of book names in our current Bible
  const arrBooks = chaptersByLastVerse.map((el) => el.bookAbbreviation);
  arrOfBooks = Array.from(new Set(arrBooks));
  //Keep track of how many chapters are longer or shorter than KJV
  var longer = 0;
  var shorter = 0;
  for (let bookName of arrOfBooks) {
    //   console.log(arrOfBooks);
    //   console.log(bookName);
    //   console.log("this is should be identitcal to next");

    // console.log(origversification.maxVerses.GEN);
    // console.log(origversification);

    //Get array of current book lastverses
    var currentBookObject = chaptersByLastVerse.filter((obj) => {
      return obj.bookAbbreviation === bookName;
    });
    const currentBookLastVersesArray = currentBookObject.map(
      (el) => el.lastverse
    );
    //Compare to original versification
    if (
      currentBookLastVersesArray.length !=
      origversification.maxVerses[bookName].length
    ) {
      console.log(
        bookName +
          " chapters are out of sync with Original versification: " +
          currentBookLastVersesArray.length +
          "chapters in current " +
          bookName +
          ", " +
          origversification.maxVerses[bookName].length +
          " in Original."
      );
    }
    //Compare to KJV versification
    if (
      currentBookLastVersesArray.length !=
      KJVversification.maxVerses[bookName].length
    ) {
      console.log(
        bookName +
          " chapters are out of sync with KJV versification: " +
          currentBookLastVersesArray.length +
          " chapters in current " +
          bookName +
          ", " +
          KJVversification.maxVerses[bookName].length +
          " in KJV schema."
      );
    } //Now for each verse in this bookName book, check lastverse

    for (var i = 0; i < KJVversification.maxVerses[bookName].length; i++) {
      if (
        currentBookLastVersesArray[i] > KJVversification.maxVerses[bookName][i]
      ) {
        longer++;
        console.log(
          bookName + " ch " + (i + 1) + " is longer than KJV versification."
        );
      } else if (
        currentBookLastVersesArray[i] < KJVversification.maxVerses[bookName][i]
      ) {
        shorter++;
        console.log(
          bookName + " ch " + (i + 1) + " is shorter than KJV versification."
        );
      }
    }

    // console.log(currentBookLastVersesArray);
    // console.log(origversification.maxVerses[bookName]);
  }
  console.log(longer + " chapters longer");
  console.log(shorter + " chapters shorter");
  //First check if the book we're dealing with and the original versification book are the same; if not log it out

  // if (!=origversification.maxVerses[bookName].length){
  //   console.log();
  // }

  //** End of versification checking */

  //now the conversion is done, let's do some error checking.
  function errorchecking(array, searchforwhat) {
    for (let element of array) {
      var errorPresent = element.lineText.includes(searchforwhat);
      if (errorPresent === true) {
        var entry = {
          bookAbbreviation: element.bookAbbreviation,
          type: element.type,
          chapNum: element.chapNum,
          verseNum: element.verseNum,
          lineText: element.lineText,
        };
        errorArray.push(entry);
      }
    }
  }

  function errorchecking2(array) {
    for (let element of array) {
      var testArray = element.lineText.split(/\n/);
      //testing to see if there are mulitple carriage returns per line
      if (testArray.length >= 3) {
        var entry = {
          bookAbbreviation: element.bookAbbreviation,
          type: element.type,
          chapNum: element.chapNum,
          verseNum: element.verseNum,
          lineText: element.lineText,
        };
        errorArray.push(entry);
      }
    }
  }

  errorchecking(accArray, "\\");
  errorchecking(notesArray, "\\");
  errorchecking(accArray, "\r\n<br>\r\n");
  errorchecking2(accArray);
  setTimeout(function () {
    mainWindow.send("indexing-done", accArray, notesArray, errorArray);
  }, 2000);
}

ipcMain.on("start-conversion", (event, currentFileList) => {
  conversion(currentFileList);
});

// ipcMain.on("clear-currentFileList", (event) => {
//   currentFileList = [];
// });

app.on("window-all-closed", function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") app.quit();
});

// When app icon is clicked and app is running, (macOS) recreate the BrowserWindow
app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
