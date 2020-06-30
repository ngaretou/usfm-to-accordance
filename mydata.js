//To customize this app, you should be able to add all the information you need here.

var myTranslations = {
  langName: {
    //The name of the language in that language
    en: "English",
    // fr: "Français",
    // wo: "Wolof",
  },
  menuLangSwitch: {
    //The menu item that invites the user to change languages
    en: "Language",
    fr: "Langue d'interface",
    wo: "Làmmiñu diisookaay bi",
  },

  menuCopy: {
    en: "Copy",
    fr: "Copier",
    wo: "Copier",
  },
  menuPaste: {
    en: "Paste",
    fr: "Coller",
    wo: "Coller",
  },
  menuSelectAll: {
    en: "Select All",
    fr: "Sélectionner tout",
    wo: "Sélectionner tout",
  },
  menutoggleDevTools: {
    en: "Open DevTools",
    fr: "Outils de développement",
    wo: "Jumtukaayi appli bi",
  },
  menuWebsite: {
    //The text prompt on the option to open the website. Note the URL is below in otherText.
    en: "More on the web",
    fr: "Notre site web",
    wo: "Xoolal sunu ëttu internet",
  },

  menuOpenAboutWin: {
    en: "Copyright && license",
    fr: "Copyright && license",
    wo: "Copyright && license",
  },
  menuQuit: {
    en: "Quit",
    fr: "Quitter",
    wo: "Ub",
  },
  updaterTitle: {
    en: "Update available",
    fr: "Mise à jour disponible",
    wo: "Mise à jour disponible",
  },
  updaterInvToDownload: {
    en: "A new version is available. Do you want to download it now?",
    fr:
      "Une nouvelle version de cette application est disponible. Voulez-vous la mettre à jour maintenant ?",
    wo:
      "Une nouvelle version de cette application est disponible. Voulez-vous la mettre à jour maintenant ?",
  },
  updaterInvToInstall: {
    en:
      "The new version has downloaded. Do you want to quit and install it now?",
    fr:
      "Une nouvelle version de cette application est prête. Quitter et installer maintenant ?",
    wo:
      "Une nouvelle version de cette application est prête. Quitter et installer maintenant ?",
  },

  // buttons: ["Mettre à jour", "Non"],
};

var otherText = {
  //These are text strings that do not change with translations
  thisAppName: "usfm-to-accordance", //The name that you want to use in the app title bar etc.
  menuWebURL: "https://github.com/ngaretou/usfm-to-accordance", //The URL for 'visit our website'. Leave empty if you have no website.
  giveFeedbackemail: "equipedevmbs@gmail.com", //the email address to which a user can send feedback
  defaultFont: "Harmattan-Regular.ttf", //A font in the HTML folder that can handle gracefully all scripts in your app;
  //used where the names of all collections are shown side-by-side
  defaultLang: "en", //The language code that the app should be initially opened in
};

module.exports.myTranslations = myTranslations;
module.exports.otherText = otherText;
