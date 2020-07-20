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
    //Accordance says it doesn't care about missing verses in the help file but that's not correct -
    //missing verses don't throw an error on import but they mess up synchronized scrolling.
    //They also care about extra verses, and there can be none.
    //So here we grab dashed verses and expand them with placeholder text. *shakes fist in direction of Accordance HQ*
    var fileContents = fileContents.replace(
      /(\\v )(\d+)-(\d+)(.*?\r\n)/g,
      "$1$2$4\\v $3 [Verse $3 is combined with verse $2 /Le verset $3 est combiné avec le verset $2]\r\n"
    );
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

  function checkVersification() {
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
          currentBookLastVersesArray[i] >
          KJVversification.maxVerses[bookName][i]
        ) {
          longer++;
          console.log(
            bookName + " ch " + (i + 1) + " is longer than KJV versification."
          );
        } else if (
          currentBookLastVersesArray[i] <
          KJVversification.maxVerses[bookName][i]
        ) {
          shorter++;
          console.log(
            bookName + " ch " + (i + 1) + " is shorter than KJV versification."
          );
        }
      }

      // console.log(longer + " chapters longer");
      // console.log(shorter + " chapters shorter");

      //** End of versification checking */
    }
  }
  //This will start out at 0
  var farthestAccArrayIndexReached = 0;
  var farthestNotesArrayIndexReached = 0;

  function change1Verse(
    book,
    destinationChapter,
    destinationVerse,
    origChapter,
    origVerse
  ) {
    //Normalize the verses
    for (var i = farthestAccArrayIndexReached; i < accArray.length; i++) {
      if (
        accArray[i].bookAbbreviation === book &&
        accArray[i].chapNum === origChapter &&
        accArray[i].verseNum === origVerse
      ) {
        accArray[i].chapNum = destinationChapter;
        accArray[i].verseNum = destinationVerse;
        farthestAccArrayIndexReached = i + 1;
        break;
      }
    }
    //Normalize the notes
    for (var i = farthestNotesArrayIndexReached; i < notesArray.length; i++) {
      if (
        notesArray[i].bookAbbreviation === book &&
        notesArray[i].chapNum === origChapter &&
        notesArray[i].verseNum === origVerse
      ) {
        notesArray[i].chapNum = destinationChapter;
        notesArray[i].verseNum = destinationVerse;
        farthestNotesArrayIndexReached = i + 1;
        break;
      }
    }
  }

  function changeVerseRange(
    book,
    destinationChapter,
    destinationVerseRangeStart,
    destinationVerseRangeEnd,
    origChapter,
    origVerseRangeStart,
    origVerseRangeEnd
  ) {
    //First make sure that the verse ranges are equal
    var destRangeLength =
      Number(destinationVerseRangeEnd) - Number(destinationVerseRangeStart);
    var origRangeLength =
      Number(origVerseRangeEnd) - Number(origVerseRangeStart);

    if (destRangeLength !== origRangeLength) {
      console.log(
        "Error in versification normalization in " +
          book +
          " " +
          origChapter +
          " " +
          origVerseRangeStart +
          "-" +
          origVerseRangeEnd
      );
      return;
    }
    //now that we know we are dealing with equal verse ranges
    destinationVerseHolder = Number(destinationVerseRangeStart);
    origVerseHolder = Number(origVerseRangeStart);
    for (
      var verse = Number(origVerseRangeStart);
      verse <= Number(origVerseRangeEnd);
      verse++
    ) {
      change1Verse(
        book,
        destinationChapter,
        destinationVerseHolder.toString(),
        origChapter,
        origVerseHolder.toString()
      );
      destinationVerseHolder++;
      origVerseHolder++;
    }
  }

  //Normalize versification
  // KJV << Orig
  // "GEN 31:55": "GEN 32:1",
  change1Verse("GEN", "31", "55", "32", "1");
  // "GEN 32:1-32": "GEN 32:2-33",
  changeVerseRange("GEN", "32", "1", "32", "32", "2", "33");
  // "EXO 8:1-4": "EXO 7:26-29",
  changeVerseRange("EXO", "8", "1", "4", "7", "26", "29");
  // "EXO 8:5-32": "EXO 8:1-28",
  changeVerseRange("EXO", "8", "5", "32", "8", "1", "28");
  // "EXO 22:1": "EXO 21:37",
  change1Verse("EXO", "22", "1", "21", "37");
  // "EXO 22:2-31": "EXO 22:1-30",
  //step into here
  changeVerseRange("EXO", "22", "2", "31", "22", "1", "30");

  changeVerseRange("LEV", "6", "1", "7", "5", "20", "26");
  changeVerseRange("LEV", "6", "8", "30", "6", "1", "23");
  changeVerseRange("NUM", "16", "36", "50", "17", "1", "15");
  changeVerseRange("NUM", "17", "1", "13", "17", "16", "28");
  change1Verse("NUM", "29", "40", "30", "1");
  changeVerseRange("NUM", "30", "1", "16", "30", "2", "17");
  change1Verse("DEU", "12", "32", "13", "1");
  changeVerseRange("DEU", "13", "1", "18", "13", "2", "19");
  change1Verse("DEU", "22", "30", "23", "1");
  changeVerseRange("DEU", "23", "1", "25", "23", "2", "26");
  change1Verse("DEU", "29", "1", "28", "69");
  changeVerseRange("DEU", "29", "2", "29", "29", "1", "28");
  change1Verse("1SA", "20", "42", "21", "1");
  changeVerseRange("1SA", "21", "1", "15", "21", "2", "16");
  change1Verse("1SA", "23", "29", "24", "1");
  changeVerseRange("1SA", "24", "1", "22", "24", "2", "23");
  change1Verse("2SA", "18", "33", "19", "1");
  changeVerseRange("2SA", "19", "1", "43", "19", "2", "44");
  changeVerseRange("1KI", "4", "21", "34", "5", "1", "14");
  changeVerseRange("1KI", "5", "1", "18", "5", "15", "32");
  changeVerseRange("1KI", "22", "43", "53", "22", "44", "54");
  change1Verse("2KI", "11", "21", "12", "1");
  changeVerseRange("2KI", "12", "1", "21", "12", "2", "22");
  changeVerseRange("1CH", "6", "1", "15", "5", "27", "41");
  changeVerseRange("1CH", "6", "16", "81", "6", "1", "66");
  changeVerseRange("1CH", "12", "4", "40", "12", "5", "41");
  change1Verse("2CH", "2", "1", "1", "18");
  changeVerseRange("2CH", "2", "2", "18", "2", "1", "17");
  change1Verse("2CH", "14", "1", "13", "23");
  changeVerseRange("2CH", "14", "2", "15", "14", "1", "14");
  changeVerseRange("NEH", "4", "1", "6", "3", "33", "38");
  changeVerseRange("NEH", "4", "7", "23", "4", "1", "17");
  changeVerseRange("NEH", "7", "69", "73", "7", "68", "72");
  change1Verse("NEH", "9", "38", "10", "1");
  changeVerseRange("NEH", "10", "1", "39", "10", "2", "40");
  changeVerseRange("JOB", "41", "1", "8", "40", "25", "32");
  changeVerseRange("JOB", "41", "9", "34", "41", "1", "26");
  changeVerseRange("PSA", "3", "0", "8", "3", "1", "9");
  changeVerseRange("PSA", "4", "0", "8", "4", "1", "9");
  changeVerseRange("PSA", "5", "0", "12", "5", "1", "13");
  changeVerseRange("PSA", "6", "0", "10", "6", "1", "11");
  changeVerseRange("PSA", "7", "0", "17", "7", "1", "18");
  changeVerseRange("PSA", "8", "0", "9", "8", "1", "10");
  changeVerseRange("PSA", "9", "0", "20", "9", "1", "21");
  changeVerseRange("PSA", "12", "0", "8", "12", "1", "9");
  // changeVerseRange("PSA", "13", "0", "5", "13", "1", "6"); // This one called for in Paratext mapping but not in Wolof actual text.
  changeVerseRange("PSA", "18", "0", "50", "18", "1", "51");
  changeVerseRange("PSA", "19", "0", "14", "19", "1", "15");
  changeVerseRange("PSA", "20", "0", "9", "20", "1", "10");
  changeVerseRange("PSA", "21", "0", "13", "21", "1", "14");
  changeVerseRange("PSA", "22", "0", "31", "22", "1", "32");
  changeVerseRange("PSA", "30", "0", "12", "30", "1", "13");
  changeVerseRange("PSA", "31", "0", "24", "31", "1", "25");
  changeVerseRange("PSA", "34", "0", "22", "34", "1", "23");
  changeVerseRange("PSA", "36", "0", "12", "36", "1", "13");
  changeVerseRange("PSA", "38", "0", "22", "38", "1", "23");
  changeVerseRange("PSA", "39", "0", "13", "39", "1", "14");
  changeVerseRange("PSA", "40", "0", "17", "40", "1", "18");
  changeVerseRange("PSA", "41", "0", "13", "41", "1", "14");
  changeVerseRange("PSA", "42", "0", "11", "42", "1", "12");
  changeVerseRange("PSA", "44", "0", "26", "44", "1", "27");
  changeVerseRange("PSA", "45", "0", "17", "45", "1", "18");
  changeVerseRange("PSA", "46", "0", "11", "46", "1", "12");
  changeVerseRange("PSA", "47", "0", "9", "47", "1", "10");
  changeVerseRange("PSA", "48", "0", "14", "48", "1", "15");
  changeVerseRange("PSA", "49", "0", "20", "49", "1", "21");
  change1Verse("PSA", "51", "0", "51", "2");
  changeVerseRange("PSA", "51", "1", "19", "51", "3", "21");
  change1Verse("PSA", "52", "0", "52", "2");
  changeVerseRange("PSA", "52", "1", "9", "52", "3", "11");
  changeVerseRange("PSA", "53", "0", "6", "53", "1", "7");
  change1Verse("PSA", "54", "0", "54", "2");
  changeVerseRange("PSA", "54", "1", "7", "54", "3", "9");
  changeVerseRange("PSA", "55", "0", "23", "55", "1", "24");
  changeVerseRange("PSA", "56", "0", "13", "56", "1", "14");
  changeVerseRange("PSA", "57", "0", "11", "57", "1", "12");
  changeVerseRange("PSA", "58", "0", "11", "58", "1", "12");
  changeVerseRange("PSA", "59", "0", "17", "59", "1", "18");
  change1Verse("PSA", "60", "0", "60", "2");
  changeVerseRange("PSA", "60", "1", "12", "60", "3", "14");
  changeVerseRange("PSA", "61", "0", "8", "61", "1", "9");
  changeVerseRange("PSA", "62", "0", "12", "62", "1", "13");
  changeVerseRange("PSA", "63", "0", "11", "63", "1", "12");
  changeVerseRange("PSA", "64", "0", "10", "64", "1", "11");
  changeVerseRange("PSA", "65", "0", "13", "65", "1", "14");
  changeVerseRange("PSA", "67", "0", "7", "67", "1", "8");
  changeVerseRange("PSA", "68", "0", "35", "68", "1", "36");
  changeVerseRange("PSA", "69", "0", "36", "69", "1", "37");
  changeVerseRange("PSA", "70", "0", "5", "70", "1", "6");
  changeVerseRange("PSA", "75", "0", "10", "75", "1", "11");
  changeVerseRange("PSA", "76", "0", "12", "76", "1", "13");
  changeVerseRange("PSA", "77", "0", "20", "77", "1", "21");
  changeVerseRange("PSA", "80", "0", "19", "80", "1", "20");
  changeVerseRange("PSA", "81", "0", "16", "81", "1", "17");
  changeVerseRange("PSA", "83", "0", "18", "83", "1", "19");
  changeVerseRange("PSA", "84", "0", "12", "84", "1", "13");
  changeVerseRange("PSA", "85", "0", "13", "85", "1", "14");
  changeVerseRange("PSA", "88", "0", "18", "88", "1", "19");
  changeVerseRange("PSA", "89", "0", "52", "89", "1", "53");
  changeVerseRange("PSA", "92", "0", "15", "92", "1", "16");
  changeVerseRange("PSA", "102", "0", "28", "102", "1", "29");
  changeVerseRange("PSA", "108", "0", "13", "108", "1", "14");
  changeVerseRange("PSA", "140", "0", "13", "140", "1", "14");
  changeVerseRange("PSA", "142", "0", "7", "142", "1", "8");
  change1Verse("ECC", "5", "1", "4", "17");
  changeVerseRange("ECC", "5", "2", "20", "5", "1", "19");
  change1Verse("SNG", "6", "13", "7", "1");
  changeVerseRange("SNG", "7", "1", "13", "7", "2", "14");
  change1Verse("ISA", "9", "1", "8", "23");
  changeVerseRange("ISA", "9", "2", "21", "9", "1", "20");
  changeVerseRange("ISA", "64", "2", "12", "64", "1", "11");
  change1Verse("JER", "9", "1", "8", "23");
  changeVerseRange("JER", "9", "2", "26", "9", "1", "25");
  changeVerseRange("EZK", "20", "45", "46", "21", "1", "2");
  change1Verse("EZK", "20", "47", "21", "3");
  changeVerseRange("EZK", "20", "48", "49", "21", "4", "5");
  changeVerseRange("EZK", "21", "1", "32", "21", "6", "37");
  changeVerseRange("DAN", "4", "1", "3", "3", "31", "33");
  changeVerseRange("DAN", "4", "4", "37", "4", "1", "34");
  change1Verse("DAN", "5", "31", "6", "1");
  changeVerseRange("DAN", "6", "1", "28", "6", "2", "29");
  changeVerseRange("HOS", "1", "10", "11", "2", "1", "2");
  changeVerseRange("HOS", "2", "1", "23", "2", "3", "25");
  change1Verse("HOS", "11", "12", "12", "1");
  changeVerseRange("HOS", "12", "1", "14", "12", "2", "15");
  change1Verse("HOS", "13", "16", "14", "1");
  changeVerseRange("HOS", "14", "1", "9", "14", "2", "10");
  changeVerseRange("JOL", "2", "28", "32", "3", "1", "5");
  changeVerseRange("JOL", "3", "1", "21", "4", "1", "21");
  change1Verse("JON", "1", "17", "2", "1");
  changeVerseRange("JON", "2", "1", "10", "2", "2", "11");
  change1Verse("MIC", "5", "1", "4", "14");
  changeVerseRange("MIC", "5", "2", "15", "5", "1", "14");
  change1Verse("NAM", "1", "15", "2", "1");
  changeVerseRange("NAM", "2", "1", "13", "2", "2", "14");
  changeVerseRange("ZEC", "1", "18", "21", "2", "1", "4");
  changeVerseRange("ZEC", "2", "1", "13", "2", "5", "17");
  changeVerseRange("MAL", "4", "1", "6", "3", "19", "24");
  // "LEV 6:1-7": "LEV 5:20-26",
  // "LEV 6:8-30": "LEV 6:1-23",
  // "NUM 16:36-50": "NUM 17:1-15",
  // "NUM 17:1-13": "NUM 17:16-28",
  // "NUM 29:40": "NUM 30:1",
  // "NUM 30:1-16": "NUM 30:2-17",
  // "DEU 12:32": "DEU 13:1",
  // "DEU 13:1-18": "DEU 13:2-19",
  // "DEU 22:30": "DEU 23:1",
  // "DEU 23:1-25": "DEU 23:2-26",
  // "DEU 29:1": "DEU 28:69",
  // "DEU 29:2-29": "DEU 29:1-28",
  // "1SA 20:42": "1SA 21:1",
  // "1SA 21:1-15": "1SA 21:2-16",
  // "1SA 23:29": "1SA 24:1",
  // "1SA 24:1-22": "1SA 24:2-23",
  // "2SA 18:33": "2SA 19:1",
  // "2SA 19:1-43": "2SA 19:2-44",
  // "1KI 4:21-34": "1KI 5:1-14",
  // "1KI 5:1-18": "1KI 5:15-32",
  // "1KI 22:43-53": "1KI 22:44-54",
  // "2KI 11:21": "2KI 12:1",
  // "2KI 12:1-21": "2KI 12:2-22",
  // "1CH 6:1-15": "1CH 5:27-41",
  // "1CH 6:16-81": "1CH 6:1-66",
  // "1CH 12:4-40": "1CH 12:5-41",
  // "2CH 2:1": "2CH 1:18",
  // "2CH 2:2-18": "2CH 2:1-17",
  // "2CH 14:1": "2CH 13:23",
  // "2CH 14:2-15": "2CH 14:1-14",
  // "NEH 4:1-6": "NEH 3:33-38",
  // "NEH 4:7-23": "NEH 4:1-17",
  // "NEH 7:69-73": "NEH 7:68-72",
  // "NEH 9:38": "NEH 10:1",
  // "NEH 10:1-39": "NEH 10:2-40",
  // "JOB 41:1-8": "JOB 40:25-32",
  // "JOB 41:9-34": "JOB 41:1-26",
  // "PSA 3:0-8": "PSA 3:1-9",
  // "PSA 4:0-8": "PSA 4:1-9",
  // "PSA 5:0-12": "PSA 5:1-13",
  // "PSA 6:0-10": "PSA 6:1-11",
  // "PSA 7:0-17": "PSA 7:1-18",
  // "PSA 8:0-9": "PSA 8:1-10",
  // "PSA 9:0-20": "PSA 9:1-21",
  // "PSA 12:0-8": "PSA 12:1-9",
  // "PSA 13:0-5": "PSA 13:1-6",
  // "PSA 18:0-50": "PSA 18:1-51",
  // "PSA 19:0-14": "PSA 19:1-15",
  // "PSA 20:0-9": "PSA 20:1-10",
  // "PSA 21:0-13": "PSA 21:1-14",
  // "PSA 22:0-31": "PSA 22:1-32",
  // "PSA 30:0-12": "PSA 30:1-13",
  // "PSA 31:0-24": "PSA 31:1-25",
  // "PSA 34:0-22": "PSA 34:1-23",
  // "PSA 36:0-12": "PSA 36:1-13",
  // "PSA 38:0-22": "PSA 38:1-23",
  // "PSA 39:0-13": "PSA 39:1-14",
  // "PSA 40:0-17": "PSA 40:1-18",
  // "PSA 41:0-13": "PSA 41:1-14",
  // "PSA 42:0-11": "PSA 42:1-12",
  // "PSA 44:0-26": "PSA 44:1-27",
  // "PSA 45:0-17": "PSA 45:1-18",
  // "PSA 46:0-11": "PSA 46:1-12",
  // "PSA 47:0-9": "PSA 47:1-10",
  // "PSA 48:0-14": "PSA 48:1-15",
  // "PSA 49:0-20": "PSA 49:1-21",
  // "PSA 51:0": "PSA 51:2",
  // "PSA 51:1-19": "PSA 51:3-21",
  // "PSA 52:0": "PSA 52:2",
  // "PSA 52:1-9": "PSA 52:3-11",
  // "PSA 53:0-6": "PSA 53:1-7",
  // "PSA 54:0": "PSA 54:2",
  // "PSA 54:1-7": "PSA 54:3-9",
  // "PSA 55:0-23": "PSA 55:1-24",
  // "PSA 56:0-13": "PSA 56:1-14",
  // "PSA 57:0-11": "PSA 57:1-12",
  // "PSA 58:0-11": "PSA 58:1-12",
  // "PSA 59:0-17": "PSA 59:1-18",
  // "PSA 60:0": "PSA 60:2",
  // "PSA 60:1-12": "PSA 60:3-14",
  // "PSA 61:0-8": "PSA 61:1-9",
  // "PSA 62:0-12": "PSA 62:1-13",
  // "PSA 63:0-11": "PSA 63:1-12",
  // "PSA 64:0-10": "PSA 64:1-11",
  // "PSA 65:0-13": "PSA 65:1-14",
  // "PSA 67:0-7": "PSA 67:1-8",
  // "PSA 68:0-35": "PSA 68:1-36",
  // "PSA 69:0-36": "PSA 69:1-37",
  // "PSA 70:0-5": "PSA 70:1-6",
  // "PSA 75:0-10": "PSA 75:1-11",
  // "PSA 76:0-12": "PSA 76:1-13",
  // "PSA 77:0-20": "PSA 77:1-21",
  // "PSA 80:0-19": "PSA 80:1-20",
  // "PSA 81:0-16": "PSA 81:1-17",
  // "PSA 83:0-18": "PSA 83:1-19",
  // "PSA 84:0-12": "PSA 84:1-13",
  // "PSA 85:0-13": "PSA 85:1-14",
  // "PSA 88:0-18": "PSA 88:1-19",
  // "PSA 89:0-52": "PSA 89:1-53",
  // "PSA 92:0-15": "PSA 92:1-16",
  // "PSA 102:0-28": "PSA 102:1-29",
  // "PSA 108:0-13": "PSA 108:1-14",
  // "PSA 140:0-13": "PSA 140:1-14",
  // "PSA 142:0-7": "PSA 142:1-8",
  // "ECC 5:1": "ECC 4:17",
  // "ECC 5:2-20": "ECC 5:1-19",
  // "SNG 6:13": "SNG 7:1",
  // "SNG 7:1-13": "SNG 7:2-14",
  // "ISA 9:1": "ISA 8:23",
  // "ISA 9:2-21": "ISA 9:1-20",
  // "ISA 64:2-12": "ISA 64:1-11",
  // "JER 9:1": "JER 8:23",
  // "JER 9:2-26": "JER 9:1-25",
  // "EZK 20:45-46": "EZK 21:1-2",
  // "EZK 20:47": "EZK 21:3",
  // "EZK 20:48-49": "EZK 21:4-5",
  // "EZK 21:1-32": "EZK 21:6-37",
  // "DAN 4:1-3": "DAN 3:31-33",
  // "DAN 4:4-37": "DAN 4:1-34",
  // "DAN 5:31": "DAN 6:1",
  // "DAN 6:1-28": "DAN 6:2-29",
  // "HOS 1:10-11": "HOS 2:1-2",
  // "HOS 2:1-23": "HOS 2:3-25",
  // "HOS 11:12": "HOS 12:1",
  // "HOS 12:1-14": "HOS 12:2-15",
  // "HOS 13:16": "HOS 14:1",
  // "HOS 14:1-9": "HOS 14:2-10",
  // "JOL 2:28-32": "JOL 3:1-5",
  // "JOL 3:1-21": "JOL 4:1-21",
  // "JON 1:17": "JON 2:1",
  // "JON 2:1-10": "JON 2:2-11",
  // "MIC 5:1": "MIC 4:14",
  // "MIC 5:2-15": "MIC 5:1-14",
  // "NAM 1:15": "NAM 2:1",
  // "NAM 2:1-13": "NAM 2:2-14",
  // "ZEC 1:18-21": "ZEC 2:1-4",
  // "ZEC 2:1-13": "ZEC 2:5-17",
  // "MAL 4:1-6": "MAL 3:19-24"
  //************************* */

  checkVersification();

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
