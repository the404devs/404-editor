var firebaseConfig = {
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

//Global state vars
var db = firebase.database(); //Reference to the database
var doc;
var editor;
var editorValues; //Collection of all editors
var editorId; //Current editor
var applyingDeltas = false;
var currentEditorValue = null;
var queueRef = null;
var uid = Math.random().toString();
var currentFileID = null;

$('#id-input').keypress(function(e) { if (e.keyCode == 13) { join(); } });

var join = function() {
    var id = sanitize($("#id-input").val());
    var re = /[#$.\[\]]+/g;
    if (id.trim() === "" || id === null || id.match(re)) {
        console.log("bad");
        alert("Please use only alphanumeric characters in the workspace name!\n\nThe following characters cannot be used:\n $  #  .  [  ]");
        return;
    }
    $("#join-modal").fadeOut();
    $("#id-input").val("");
    closeNav();
    init(id);
}

var init = function(id) {
    editorId = id; //set editor id
    console.log("editor id is " + editorId)
        // console.log()
        // var fileRef = db.ref("editor_values/" + editorId + "/files");

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

    document.title = sanitize(editorId) + " | 404-Editor";

    // This is the local storage field name where we store the user theme
    // We set the theme per user, in the browser's local storage
    let LS_THEME_KEY = "editor-theme";
    let EDITOR_FONT_SIZE = "editor-font-size"

    // This function will return the user theme or the Tomorrow theme (which
    // is the default)
    function getTheme() {
        return localStorage.getItem(LS_THEME_KEY) || "ace/theme/tomorrow_night";
    }

    //Function to get preferred font size
    function getFontSize() {
        return localStorage.getItem(EDITOR_FONT_SIZE) || 12;
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

    $("#font-size").change(function() {
        // Update font size
        $("#editor").css("font-size", this.value + "px");

        try {
            localStorage.setItem(EDITOR_FONT_SIZE, this.value);
        } catch (e) {}
    }).val(getFontSize());

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

    // Generate a pseudo user id
    // This will be used to know if it's me the one who updated
    // the code or not
    editor = null;

    // Write the entries in the database 
    editorValues = db.ref("editor_values");

    // Get the current editor reference
    currentEditorValue = editorValues.child(editorId);

    // console.log(currentEditorValue.child("files").child("1633719398985:08581516502984317")).get();
    // var keys = Object.keys(currentEditorValue.child("files"))
    // var allFilesInWorkspace = [];
    // fileRef.on("value", function(snapshot) {
    //     const data = snapshot.val() || null;
    //     if (data) {
    //         allFilesInWorkspace = Object.keys(snapshot.val());
    //         currentFileID = allFilesInWorkspace[0];
    //     }
    // });


    // Store the current timestamp (when we opened the page)
    // It's quite useful to know that since we will
    // apply the changes in the future only
    var openPageTimestamp = Date.now();
    // Take the editor value on start and set it in the editor

    console.log(currentEditorValue.child("files"))
        // fileRef.child(currentFileID).child("content").once("value", function(contentRef) {
    currentEditorValue.child("content").once("value", function(contentRef) {
        // Somebody changed the lang. Hey, we have to update it in our editor too!
        // currentEditorValue.child("files").child(currentFileID).child("lang").on("value", function(r) {
        currentEditorValue.child("lang").on("value", function(r) {
            var value = r.val();
            // Set the language
            var cLang = $selectLang.val();
            if (cLang !== value && value !== null) {
                //Ensure the language isn't a null value. 
                //This caused problems with deleting workspaces, as the null value would trigger an update, recreating the workspace with just a lang key.
                $selectLang.val(value).change();
            }
        });

        // Initialize the ACE editor
        editor = ace.edit("editor");
        editor.setTheme(getTheme());
        editor.$blockScrolling = Infinity;
        $("#editor").css("font-size", getFontSize() + "px");



        // Get the queue reference
        queueRef = currentEditorValue.child("queue");
        // queueRef = currentEditorValue.child("files").child(currentFileID).child("queue");

        // This boolean is going to be true only when the value is being set programmatically
        // We don't want to end with an infinite cycle, since ACE editor triggers the
        // `change` event on programmatic changes (which, in fact, is a good thing)
        applyingDeltas = false;

        // When we change something in the editor, update the value in Firebase
        editor.on("change", function(e) {

            // In case the change is emitted by us, don't do anything
            // (see below, this boolean becomes `true` when we receive data from Firebase)
            if (applyingDeltas) {
                return;
            }
            // Set the content in the editor object
            // This is being used for new users, not for already-joined users.
            currentEditorValue.update({
                content: editor.getValue()
            });
            // Generate an id for the event in this format:
            //  <timestamp>:<random>
            // We use a random thingy just in case somebody is saving something EXACTLY
            // in the same moment
            queueRef.child(Date.now().toString() + ":" + Math.random().toString().slice(2)).set({
                event: e,
                by: uid
            }).catch(function(e) {
                console.error(e);
            });
        });

        // Get the editor document object 

        doc = editor.getSession().getDocument();

        // Listen for updates in the queue
        queueRef.on("child_added", function(ref) {
            // Get the timestamp
            var timestamp = ref.key.split(":")[0];

            // Do not apply changes from the past
            if (openPageTimestamp > timestamp) {
                return;
            }

            // Get the snapshot value
            var value = ref.val();
            // console.log(value.by);

            // In case it's me who changed the value, I am
            // not interested to see twice what I'm writing.
            // So, if the update is made by me, it doesn't
            // make sense to apply the update
            if (value.by === uid) { return; }

            // We're going to apply the changes by somebody else in our editor
            //  1. We turn applyingDeltas on
            applyingDeltas = true;
            //  2. Update the editor value with the event data
            doc.applyDeltas([value.event]);
            //  3. Turn off the applyingDeltas
            applyingDeltas = false;
        });

        // Get the current content
        var val = contentRef.val();

        // If an editor with that name doesn't exist already....
        if (val === null) {
            // ...we will initialize a new one. 
            // ...with this content:
            val = "/* Welcome to 404Editor v2.0.4! */";
            var defaultID = Date.now().toString() + ":" + Math.random().toString().replace(".", "");
            // currentFileID = defaultID;

            // Here's where we set the initial content of the editor
            // editorValues.child(editorId).set({
            //     files: {
            //         [defaultID]: {
            //             name: "Untitled",
            //             content: "",
            //             lang: "javascript",
            //             queue: {},
            //         }
            //     }
            // });
            editorValues.child(editorId).set({
                lang: "markdown",
                queue: {},
                content: val
            });
        }
        // We're going to update the content, so let's turn on applyingDeltas 
        applyingDeltas = true;

        // ...then set the value
        // -1 will move the cursor at the beginning of the editor, preventing
        // selecting all the code in the editor (which is happening by default)
        editor.setValue(val, -1);

        // ...then set applyingDeltas to false
        applyingDeltas = false;

        // Hide the spinner and other loading crap, show the editor and buttons
        $("#loader").fadeOut();
        $("#welcome").fadeOut();
        $("#editor").fadeIn();
        $("#buttons").fadeIn();
        $("#header").fadeIn();
        $("#nav-open").fadeIn();
        $("#join-close").show();

        // And finally, focus the editor!       
        editor.focus();
        return;
    });
}


/*Function to delete an existing workspace*/
var deleteWorkspace = function() {
    //Double check they understand what the trash can symbol means
    if (confirm("Are you sure you want to delete this workspace?\n\nThis cannot be undone.")) {
        editorValues.child(editorId).remove(); //Remove the editor
        location.reload();
    }
}

/*Function to download a workspace*/
var downloadWorkspace = function() {

    var save = function(data, filename, type) {
            var file = new Blob([data], { type: type }); //New file variable (blob?) with the contents and type
            if (window.navigator.msSaveOrOpenBlob) // IE10+
                window.navigator.msSaveOrOpenBlob(file, filename);
            else { // Others
                var a = document.createElement("a"); //Creating an a element
                var url = URL.createObjectURL(file); //Get url to our newly made file
                a.href = url; //Set that as the href of our a tag
                a.download = filename; //Set the download property to our filename
                document.body.appendChild(a); //Add the a tag to the page
                a.click(); //Click it
                setTimeout(function() {
                    document.body.removeChild(a); //Remove it
                    window.URL.revokeObjectURL(url); //Get rid of the url to our file
                }, 0);
            }
        }
        /*Function to determine the language, and therefore the correct file extension*/

    var determineLang = function() {
        /*Function to determine the selected option in a <select> element. Takes the element as a parameter.*/
        var getSelectedOption = function(sel) {
                var opt; //To hold the option
                //For loop to go through each option in the select tag
                for (var i = 0, len = sel.options.length; i < len; i++) {
                    opt = sel.options[i]; //Get option
                    if (opt.selected === true) { //Check it its the selected one
                        break; //found it
                    }
                }
                return opt; //return the correct option
            }
            //Return the id of the selected option
        return getSelectedOption(document.getElementById("select-lang")).id;
        //I painstakingly made the ids of each option correspond to the proper file extension (C# has id '.cs', etc)
    }

    // var text = ""; //This string will hold the contents of our file
    // //Go through each line of the editor, which are separate entities
    // $('.ace_line').each(function() {
    //     text += $(this).text() + "\r\n"; //Add the text from that line to our string, and append a newline at the end
    // });

    let text = editor.getValue();
    var fullname = editorId + determineLang(); //Construct the complete filename from the name of the editor and the file extension
    save(text, fullname, "txt"); //Save the file with our save function. Type is plain text, since that's all these kind of files are
}

var sanitize = function(str) {
    //strip all html from string
    return str.replace(/(<([^>]+)>)/ig, "");
}

var stalinSort = function(arr) {
    // why is this here?
    arr2 = [];
    min = arr[0];
    for (var i = 0; i <= arr.length - 1; i++) {
        if (arr[i] >= min) {
            arr2.push(arr[i]);
            min = arr[i];
        }
    }
    return arr2;
}

function openNav() {
    document.getElementById("navbox").style.width = "250px";
}

function closeNav() {
    document.getElementById("navbox").style.width = "0";
}
