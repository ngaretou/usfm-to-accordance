// Renderer javascript for index.html
const { remote, shell, ipcRenderer } = require("electron");
const { dialog } = require("electron").remote;
const fs = require("fs");
const path = require("path");

const desktopPath = remote.app.getPath("desktop"),
  WIN = remote.getCurrentWindow();

//Our app's version for comparison below
thisAppVersion = remote.app.getVersion();

// Get the data about collections from mydata.js and set it to our variable for use.
const myData = require("../mydata");

let displayLang = myData.otherText.defaultLang;

let openButton = document.getElementById("openButton"),
  saveButton = document.getElementById("saveButton"),
  newListButton = document.getElementById("newListButton"),
  convertButton = document.getElementById("convertButton"),
  fileListBox = document.getElementById("documentListBox"),
  overlay = document.getElementById("overlayid"),
  currentFileList = [];

const appFeedbackemail = myData.otherText.giveFeedbackemail;
const appMenuWebURL = myData.otherText.menuWebURL;

//Check the if the app has been previously run and if version is same as last run.
//If lastOpenedVersion is null, then it's a new open.
if (localStorage.getItem("lastOpenedVersion") === null) {
  //set things up for first run: set a variable in local storage equal to current app version and continue.

  localStorage.setItem("lastOpenedVersion", JSON.stringify(thisAppVersion));

  //This gets us our default interface lang from myData.
  displayLang = myData.otherText.defaultLang;
  localStorage.setItem("lastKnownDisplayLanguage", JSON.stringify(displayLang));
  //Let the main process know the displayLang
  ipcRenderer.send("set-display-lang", displayLang);
}

//Or if the last version opened is the same as this one,
else if (
  JSON.parse(localStorage.getItem("lastOpenedVersion")) === thisAppVersion
) {
  displayLang = JSON.parse(localStorage.getItem("lastKnownDisplayLanguage"));
  //Let the main process know the displayLang
  ipcRenderer.send("set-display-lang", displayLang);
}
//Or if we've upgraded, chances are we've added pages or collections, so reinitialize - that is:
else if (
  !(JSON.parse(localStorage.getItem("lastOpenedVersion")) === thisAppVersion)
) {
  //save our new version number
  localStorage.setItem("lastOpenedVersion", JSON.stringify(thisAppVersion));

  //Let the main process know the displayLang
  displayLang = JSON.parse(localStorage.getItem("lastKnownDisplayLanguage"));
  ipcRenderer.send("set-display-lang", displayLang);
}

const appMenuWebsite = myData.myTranslations.menuWebsite[displayLang];

//Housekeeping:
//Give the app builder a message if they have put feedback message but no email or subject

//Give app builder a msg if they have a 'visit our website' message but not website set
if (!(appMenuWebsite === "") && appMenuWebURL === "") {
  alert(
    `Menu item for "visit our website" is enabled but no site address is entered. Check out otherText section of mydata.js.`
  );
}

//the menu and its associated accelerators only work on Mac, so we have to manually add accelerators for non-Mac platforms

function getAccelerators() {
  if (
    (event.ctrlKey && event.key === "o") ||
    (event.metaKey && event.key === "o")
  ) {
    openList();
  } else if (
    (event.ctrlKey && event.key === "s") ||
    (event.metaKey && event.key === "s")
  ) {
    saveList();
  } else if (
    (event.ctrlKey && event.key === "n") ||
    (event.metaKey && event.key === "n")
  ) {
    newList();
  }
  // else if (
  //     (event.ctrlKey && event.key === "-") ||
  //     (event.metaKey && event.key === "-")
  //   ) {
  //     console.log("- heard");
  //     webFrame.setZoomFactor(webFrame.getZoomFactor() - 0.1);
  //   } else if (
  //     (event.ctrlKey && event.key === "0") ||
  //     (event.metaKey && event.key === "0")
  //   ) {
  //     console.log("- heard");
  //     webFrame.setZoomFactor(1);
  //   }
}

//Safety with nodeintegration:
//Here we want to parse for relative hyperlinks
//and let those go, but open all others in the user's default browser.
document.addEventListener("click", (e) => {
  if (event.target.tagName === "A" && event.target.href.startsWith("http")) {
    event.preventDefault();
    shell.openExternal(event.target.href);
  }
});

// this loads the accelerators for the rest of the window when not on Mac
if (!remote.process.platform === "darwin") {
  document.onkeydown = () => {
    getAccelerators();
  };
}

// Functions

function openList() {
  let options = {
    //Placeholder 1
    title: "Open USFM book list",
    defaultPath: desktopPath,
    filters: [
      { name: "U2AC files", extensions: ["u2ac"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  };

  currentFileList = [];
  localStorage.removeItem("currentFileList");

  dialog
    .showOpenDialog(WIN, options)
    .then((result) => {
      filePathToOpen = result.filePaths[0];
      let rawdata = fs.readFileSync(`${filePathToOpen}`, "utf-8");
      currentFileList = JSON.parse(rawdata);
      console.log("currentFileList: ");

      console.log(currentFileList);
      //Now populate the list
      fileListBox.innerHTML = "";

      for (let file of currentFileList) {
        let entryToAdd = document.createElement("option");
        entryToAdd.setAttribute("class", "file-list-item");
        entryToAdd.setAttribute("value", file.path);
        entryToAdd.innerHTML = file.name;
        fileListBox.appendChild(entryToAdd);
      }
    })
    .catch((err) => {
      console.log(err);
    });

  convertButton.style.display = "flex";
}

function saveList(currentFileList, andClear) {
  let options = {
    //Placeholder 1
    title: "Save USFM book list",

    //Placeholder 2
    defaultPath: desktopPath,

    //Placeholder 4
    buttonLabel: "Save",

    //Placeholder 3
    filters: [
      { name: "U2AC files", extensions: ["u2ac"] },
      { name: "All Files", extensions: ["*"] },
    ],
  };

  remote.dialog.showSaveDialog(WIN, options).then((path) => {
    localStorage.setItem("currentFileList", JSON.stringify(currentFileList));
    fs.writeFile(path.filePath, JSON.stringify(currentFileList), (err) => {
      if (err) throw err;

      //This is if the "andClear" setting is true, coming from the newList button command.
      if (andClear === "true") {
        fileListBox.innerHTML = "";
      }
    });
  });
}

function newList() {
  dialog
    .showMessageBox({
      type: "info",
      title: "Save?",
      message: "Do you want to save the existing list?",
      buttons: ["Yes", "No"],
    })
    .then((result) => {
      if (result.response === 0) {
        // bound to buttons array

        let andClear = "true";
        saveList(currentFileList, andClear);
      } else if (result.response === 1) {
        // bound to buttons array
        fileListBox.innerHTML = "";
        currentFileList = [];
        localStorage.removeItem("currentFileList");
      }
    });
}

function convert() {
  console.log("Converting...");
  //userfeedback
  overlay.style.display = "flex";

  if (
    Array.from(document.getElementsByClassName("file-list-item")).length ===
    currentFileList.length
  ) {
  }
  setTimeout(function () {
    ipcRenderer.send("start-conversion", currentFileList);
  }, 40);
}

function addFiles(files) {
  //Add/append the new files to they array one at a time
  //In addFiles

  //So a bit of a strange thing here...the array that drag and drop give you has named objects: the rows as it were
  //have a name "File:" instead of being simply numbered. So grab the info you need into a simple array here rather than using the array as-is.

  for (let file of files) {
    var tempObj = {
      name: file.name,
      path: file.path,
    };
    //filter for the right kind of files

    if (
      tempObj.name.substr(-4).toLowerCase() == ".sfm" ||
      tempObj.name.substr(-5).toLowerCase() == ".usfm"
    ) {
      currentFileList.push(tempObj);
    }
  }

  //This filters the array so you can't accidentally put in duplicates
  const filteredArr = currentFileList.reduce((acc, current) => {
    const x = acc.find((item) => item.name === current.name);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  currentFileList = filteredArr;

  // sort by name
  currentFileList.sort(function (a, b) {
    var nameA = a.name.toUpperCase(); // ignore upper and lowercase
    var nameB = b.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    if (nameA === nameB) {
      alert("Error: two identical file names entered.");
    }
  });

  //Now populate the list
  fileListBox.innerHTML = "";

  for (let file of currentFileList) {
    let entryToAdd = document.createElement("option");
    entryToAdd.setAttribute("class", "file-list-item");
    entryToAdd.setAttribute("value", file.path);
    entryToAdd.innerHTML = file.name;
    fileListBox.appendChild(entryToAdd);
  }
  convertButton.style.display = "flex";
}

//ipc messages
ipcRenderer.on("language-switch", (e, lang) => {
  //Call this function from above to save the page
  saveDataMainWindow();
  //Store the incoming language request to localStorage
  localStorage.setItem("lastKnownDisplayLanguage", JSON.stringify(lang));
  //Now send a message back to main.js to reload the page
  ipcRenderer.send("lang-changed-reload-pages");
});

//Event listeners for buttons
openButton.addEventListener("click", (e) => {
  openList();
});
saveButton.addEventListener("click", (e) => {
  saveList(currentFileList);
});
newListButton.addEventListener("click", (e) => {
  newList();
});
convertButton.addEventListener("click", (e) => {
  convert();
});

//Drag and drop files in
// let dragDropArea = document.getElementById("dragdroparea");

let dragDropArea = document;
let documentListBox = document.getElementsByClassName("select-css");

document.addEventListener("drop", (event) => {
  event.preventDefault();
  event.stopPropagation();
  fileList = event.dataTransfer.files;

  addFiles(fileList);

  document.body.style.backgroundColor = "#1f1e1eea";
  documentListBox[0].style.backgroundColor = "#1f1e1eea";
});

dragDropArea.addEventListener("dragover", (e) => {
  document.body.style.backgroundColor = "#686464";
  documentListBox[0].style.backgroundColor = "#413e3e";

  e.preventDefault();
  e.stopPropagation();
});

dragDropArea.addEventListener("dragleave", (event) => {
  document.body.style.backgroundColor = "#1f1e1eea";
  documentListBox[0].style.backgroundColor = "#1f1e1eea";
});

//Delete an entry from listbox and from the currentFileList array
fileListBox.addEventListener("keydown", (event) => {
  if (event.key === "Backspace" || event.key === "Delete") {
    var newFileList = currentFileList.filter(function (file) {
      return file.path !== fileListBox.value;
    });

    currentFileList = newFileList;
  }

  fileListBox.remove(fileListBox.selectedIndex);
});

function convertToRtf(plain) {
  plain = plain.replace(/\n/g, "\\par\n");
  return (
    "{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang2057{\\fonttbl{\\f0\\fnil\\fcharset0 Microsoft Sans Serif;}}\n\\viewkind4\\uc1\\pard\\f0\\fs17 " +
    plain +
    "\\par\n}"
  );
}

ipcRenderer.on("indexing-done", (e, accArray, notesArray, errorArray) => {
  //Now the indexes are built and it's time to write the files.
  console.log("in indexing-done");

  localStorage.removeItem("accArray");
  localStorage.removeItem("notesArray");
  localStorage.removeItem("errorArray");
  localStorage.setItem("accArray", JSON.stringify(accArray));
  localStorage.setItem("notesArray", JSON.stringify(notesArray));
  localStorage.setItem("errorArray", JSON.stringify(errorArray));

  overlay.style.display = "none";
  //this ugly thing gives the overlay time to disappear before the alert blocks it
  setTimeout(function () {
    var notify = confirm(
      "Conversion complete; " +
        errorArray.length +
        " errrors.\nChoose where you would like to save the results."
    );
    if (notify == true) {
      let filePathToSaveIn;
      let options = {
        title: "Choose where to save converted files",
        defaultPath: desktopPath,
        buttonLabel: "Save files here",
        openDirectory: true,
        properties: ["openDirectory"],
      };

      dialog
        .showOpenDialog(WIN, options)
        .then((result) => {
          let verseDataToWrite = "";
          let errorDataToWrite = "";

          //Get the data together to write for the main BibleOutput.txt
          for (let verse of accArray) {
            verseDataToWrite =
              verseDataToWrite +
              `${verse.bookAbbreviation} ${verse.chapNum}:${verse.verseNum} ${verse.lineText}`;
          }
          for (let error of errorArray) {
            errorDataToWrite =
              errorDataToWrite +
              `${error.bookAbbreviation} ${error.chapNum}:${error.verseNum} ${error.lineText}`;
          }

          //Find the path to save in
          filePathToSaveIn = result.filePaths[0];
          console.log(filePathToSaveIn);
          function formatDate(date) {
            var datePart = [
              date.getFullYear(),
              date.getMonth() + 1,
              date.getDate(),
            ];
            var timePart = [
              date.getHours(),
              date.getMinutes(),
              date.getSeconds(),
            ];

            return datePart.join("") + timePart.join("");
          }
          currentDateTime = formatDate(new Date());

          //write the contents of the accArray (the verses)
          // Data which will write in a file.

          // https://shapeshed.com/writing-cross-platform-node/
          // path.join('foo', '..', 'bar', 'baz/foo');
          // 'bar/baz/foo' on OSX and Linux
          // 'bar\\baz\\foo' on Windows

          var filePathToCreate = path.join(
            filePathToSaveIn,
            "U2AC" + currentDateTime
          );
          //Make the directory
          fs.mkdir(filePathToCreate, function (err) {
            if (err) {
              console.log(err);
            } else {
              //Now write the bible file.
              fs.writeFile(
                filePathToCreate + "/BibleOutput.txt",
                verseDataToWrite,
                (err) => {
                  // In case of a error throw err.
                  if (err) throw err;
                }
              );
              //Now write the errors file.
              if (errorArray.length !== 0) {
                fs.writeFile(
                  filePathToCreate + "/ErrorOutput.txt",
                  errorDataToWrite,
                  (err) => {
                    // In case of a error throw err.
                    if (err) throw err;
                  }
                );
              }
              if (notesArray.length !== 0) {
                //Make the User Notes directory
                filePathUserNotes = path.join(filePathToCreate, "Notes");
                fs.mkdir(filePathUserNotes, function (err) {
                  if (err) {
                    console.log(err);
                  } else {
                    for (let note of notesArray) {
                      //convert the markup text to rtf with the converToRTF function
                      rtfText = convertToRtf(note.lineText);
                      //Now write each file.
                      fs.writeFile(
                        filePathUserNotes +
                          `/${note.bookAbbreviation} ${note.chapNum}.${note.verseNum}.rtf`,
                        rtfText,
                        (err) => {
                          // In case of a error throw err.
                          if (err) throw err;
                        }
                      );
                    }
                  }
                });
              }
              alert("Converted file saved at " + filePathToCreate);
            }
          });

          //write the contents of the notes
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      return;
    }
    40;
  });
});
