const firebaseConfig = {
    apiKey: "AIzaSyB4NTU1ziKd7YcrNzpPZSKU6ZKyJwX81zI",
    authDomain: "editor-8a0f1.firebaseapp.com",
    databaseURL: "https://editor-8a0f1.firebaseio.com",
    projectId: "editor-8a0f1",
    storageBucket: "editor-8a0f1.appspot.com",
    messagingSenderId: "215947375655",
    appId: "1:215947375655:web:315951007d76fd7d060a02"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// firebase.analytics();
firebase.firestore().settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});
firebase.firestore().enablePersistence({
    synchronizeTabs: true
});

//Global state vars
var db = firebase.firestore();
var doc;
var editor;
var editorValues;
var editorId;
var applyingDeltas;
var currentEditorValue = null;
var queueRef = null;
var uid = Math.random().toString();
var currentFileID = null;
var allFilesInWorkspace = {};


//Allow 'enter' keypress in workspace name input prompt.
$('#id-input').keypress(function(e) { if (e.keyCode == 13) { join(); } });
$('#id-input').focus();

var join = function() {
    //Sanitize inputted workspace name
    var id = sanitize($("#id-input").val());
    //Check for empty input
    if (id === "" || id === null) {
        console.log("bad");
        return;
    }
    //Fade out prompt and clear input field
    $("#join-modal").fadeOut();
    $("#id-input").val("");
    //Hide navmenu if open
    closeNav();
    //and initialize the editor.
    init(id);
}

var init = async function(id) {
    editorId = id;
    console.log("editor id is " + editorId);

    let editorSnapshot = await db.collection(editorId).get({ source: 'server' });
    console.log(editorSnapshot);

    //reset event listeners
    if (currentEditorValue) {
        if (currentEditorValue.key == editorId) { return; }
        currentEditorValue.child("content").off("value");
        currentEditorValue.child("lang").off("value");
    }
    if (queueRef) { queueRef.off("child_added") }
    if (editor) { editor.off("change") }

    //if no id is specified just stop
    if (!editorId) {
        return;
    }

    $("#workspace-name").html("<b>Workspace:</b> " + sanitize(editorId)); //Display the name of the editor on the page

    // This is the local storage field name where we store the user theme
    // We set the theme per user, in the browser's local storage
    var LS_THEME_KEY = "editor-theme";

    // This function will return the user theme or the Tomorrow theme (which
    // is the default)
    function getTheme() {
        return localStorage.getItem(LS_THEME_KEY) || "ace/theme/tomorrow_night";
    }

    // Select the desired theme of the editor
    $("#select-theme").change(function() {
        // Set the theme in the editor
        editor.setTheme(this.value);

        // Update the theme in the localStorage
        // We wrap this operation in a try-catch because some browsers don't
        // support localStorage (e.g. Safari in private mode)
        try {
            localStorage.setItem(LS_THEME_KEY, this.value);
        } catch (e) {}
    }).val(getTheme());

    // Select the desired programming language you want to code in 
    var $selectLang = $("#select-lang").change(function() {
        // Set the language in the Firebase object
        // This is a preference per editor
        currentEditorValue.update({
            lang: this.value
        });
        // Set the editor language
        editor.getSession().setMode("ace/mode/" + this.value);
    });

    editor = null;
    editorSnapshot.forEach((doc) => {
        allFilesInWorkspace[doc.id] = { id: doc.id, ...doc.data() }
    });
    let firstKey = Object.keys(allFilesInWorkspace)[0];
    currentFileID = allFilesInWorkspace[firstKey].id;

    // Store the current timestamp (when we opened the page)
    // It's quite useful to know that since we will
    // apply the changes in the future only
    var openPageTimestamp = Date.now();


    // let fileSnapshot = await db.collection(editorId + "/" + currentFileID).get({ source: 'server' });
    let fileSnapshot = await db.collection(editorId).doc(currentFileID);
    console.log(fileSnapshot)


    // Initialize the ACE editor
    editor = ace.edit("editor");
    editor.setTheme(getTheme());
    editor.$blockScrolling = Infinity;


}

var sanitize = function(str) {
    //strip all html from string
    return str.replace(/(<([^>]+)>)/ig, "");
}

var openNav = function() {
    document.getElementById("navbox").style.width = "250px";
}

var closeNav = function() {
    document.getElementById("navbox").style.width = "0";
}