// Renderer javascript for index.html
const { remote, shell, ipcRenderer, webFrame } = require("electron");

//Our app's version for comparison below
thisAppVersion = remote.app.getVersion();

// Get the data about collections from mydata.js and set it to our variable for use.
const myData = require("../mydata");

let displayLang = myData.otherText.defaultLang;

//Check the if the app has been previously run and if version is same as last run.
//If lastOpenedVersion is null, then it's a new open.
if (localStorage.getItem("lastOpenedVersion") === null) {
  //set things up for first run: set a variable in local storage equal to current app version and continue.
  //You don't need to set up lastKnownStateMainWin now, the app will do that as you change panes
  localStorage.setItem("lastOpenedVersion", JSON.stringify(thisAppVersion));
  //This is in case of a first run, this populates the session memory with the array for the folders and pages.

  //Let the main process know the displayLang
  ipcRenderer.send("set-display-lang", displayLang);
}

//Or if the last version opened is the same as this one,
else if (
  JSON.parse(localStorage.getItem("lastOpenedVersion")) === thisAppVersion
) {
  //displayLang = JSON.parse(localStorage.getItem("lastKnownDisplayLanguage"));
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
  // displayLang = JSON.parse(localStorage.getItem("lastKnownDisplayLanguage"));
  ipcRenderer.send("set-display-lang", displayLang);
}

//Housekeeping:
//Give the app builder a message if they have put feedback message but no email or subject
if (!(appFeedback === "") && appFeedbackemail === "") {
  alert(
    `Menu item for app feedback is enabled but no email address is entered. Check out otherText section of mydata.js.`
  );
}
//Give app builder a msg if they have a 'visit our website' message but not website set
if (!(appMenuWebsite === "") && appMenuWebURL === "") {
  alert(
    `Menu item for "visit our website" is enabled but no site address is entered. Check out otherText section of mydata.js.`
  );
}

//** Event listeners/handlers

//the menu and its associated accelerators only work on Mac, so we have to manually add accelerators for non-Mac platforms

function getAccelerators() {
  if (
    (event.ctrlKey && event.key === "c") ||
    (event.metaKey && event.key === "c")
  ) {
    console.log("c heard");
    document
      .getElementById("mainFrame")
      .contentWindow.document.execCommand("copy");
  } else if (
    (event.ctrlKey && event.key === "a") ||
    (event.metaKey && event.key === "a")
  ) {
    console.log("a heard");
    document
      .getElementById("mainFrame")
      .contentWindow.document.execCommand("selectAll");
  } else if (
    (event.ctrlKey && event.key === "+") ||
    (event.metaKey && event.key === "+") ||
    (event.ctrlKey && event.shiftKey && event.key === "=") ||
    (event.metaKey && event.shiftKey && event.key === "=")
  ) {
    console.log("+ heard");
    webFrame.setZoomFactor(webFrame.getZoomFactor() + 0.1);
  } else if (
    (event.ctrlKey && event.key === "-") ||
    (event.metaKey && event.key === "-")
  ) {
    console.log("- heard");
    webFrame.setZoomFactor(webFrame.getZoomFactor() - 0.1);
  } else if (
    (event.ctrlKey && event.key === "0") ||
    (event.metaKey && event.key === "0")
  ) {
    console.log("- heard");
    webFrame.setZoomFactor(1);
  }
}
//Safety with nodeintegration:
//Our index.html has no outside links so they can be normally handled. But often an HTML collection will have
//an outside link, perhaps for a copyright page or other information. Here we want to parse for relative hyperlinks
//and let those go, but open all others in the user's default browser.
//Wrapping the onclick event in the onload event is important because you have to reload this code each time the iframe reloads
//as the onclick event is really applied to the iframe's contents. When the contents chagnes (onload) you have to reapply the handler.
document.getElementById("mainFrame").onload = () => {
  document.getElementById("mainFrame").contentWindow.document.onclick = () => {
    if (event.target.tagName === "A" && event.target.href.startsWith("http")) {
      event.preventDefault();
      shell.openExternal(event.target.href);
    }
  };
};

//See right above in the mainFrame onload - this loads the accelerators for the rest of the window when not on Mac
if (!remote.process.platform === "darwin") {
  document.onkeydown = () => {
    getAccelerators();
  };
}

//** Functions

ipcRenderer.on("language-switch", (e, lang) => {
  //Call this function from above to save the page
  saveDataMainWindow();
  //Store the incoming language request to localStorage
  localStorage.setItem("lastKnownDisplayLanguage", JSON.stringify(lang));
  //Now send a message back to main.js to reload the page
  ipcRenderer.send("lang-changed-reload-pages");
});
