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
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
});
firebase.firestore().enablePersistence({
    synchronizeTabs: true
});

//Global state vars
const db = firebase.firestore();
let editor;
let user;
let workspaceName;
let applyingDeltas = false;
let docRef;
let unsubscribe;
const sessionId = Math.random().toString().slice(2);
const modelist = ace.require("ace/ext/modelist");
const themelist = ace.require("ace/ext/themelist");

// This is the local storage field name where we store the user theme
// We set the theme per user, in the browser's local storage
let LS_DARK_THEME_KEY = "editor-dark-theme";
let LS_LIGHT_THEME_KEY = "editor-light-theme";
let LS_THEME_PREF_KEY = "editor-theme-pref";
let EDITOR_FONT_SIZE = "editor-font-size";

// This function will return the user theme or the Tomorrow theme (which
// is the default)
function getLightTheme() {
    return localStorage.getItem(LS_LIGHT_THEME_KEY) || "ace/theme/tomorrow";
}

function getDarkTheme() {
    return localStorage.getItem(LS_DARK_THEME_KEY) || "ace/theme/tomorrow_night";
}

function setEditorTheme() {
    if (getThemePref() === "DARK") {
        editor.setTheme(getDarkTheme());
    } else if (getThemePref() === "LIGHT") {
        editor.setTheme(getLightTheme());
    } else if (getThemePref() === "AUTO") {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            editor.setTheme(getDarkTheme());
        } else {
            editor.setTheme(getLightTheme());
        }
    }
}

//Function to get preferred font size
function getFontSize() {
    return localStorage.getItem(EDITOR_FONT_SIZE) || 12;
}

function load() {
    loadAceLangOptions();
    loadAceThemeOptions();
    setUITheme();

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in.
            console.log('User is logged in:', user.email);
            postLogin();
        } else {
            // No user is signed in.
            console.log('No user is logged in');
            showModal('#login-modal');
        }
    });
}

function getThemePref() {
    let LS_THEME_PREF_KEY = "editor-theme-pref";
    return localStorage.getItem(LS_THEME_PREF_KEY) || "DARK";
}

function getAutoTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "DARK" : "LIGHT";
}

function setUITheme() {
    if (getThemePref() === "DARK") {
        darkUI();
    } else if (getThemePref() === "LIGHT") {
        lightUI();
    } else if (getThemePref() === "AUTO") {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            darkUI();
        } else {
            lightUI();
        }
    }
}

function lightUI() {
    $('body').removeClass('theme-dark').addClass('theme-light');
}

function darkUI() {
    $('body').removeClass('theme-light').addClass('theme-dark');
}

function login() {
    const fields = $("#login-form").serializeArray();
    const email = fields[0]['value'];
    const password = fields[1]['value'];

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(function() {
            postLogin();
        })
        .catch(function(error) {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("%c" + errorCode + ": " + errorMessage, "color:red;font-weight:bold;font-style:italic;");
            $("#errmsg-login").html(error.message).css("opacity", "1").css("height", "34px");
            setTimeout(() => { $("#errmsg-login").css("opacity", "0"); }, 3000);
            setTimeout(() => { $("#errmsg-login").css("height", "0"); }, 3000);
            setTimeout(() => { $("#errmsg-login").html(""); }, 3000);
        });
    
}

function postLogin() {
    document.cookie = "state=logged;";
    hideModal('#login-modal');
    user = firebase.auth().currentUser;
    console.log(user.uid);
    $('#username').text(user.displayName);
    $('#login-email').val('');
    $('#login-pass').val('');
    $('#signup-email').val('');
    $('#signup-pass').val('');
    fetchUserWorkspaces().then(function () {
        showModal('#join-modal');
    });
}

function logout() {
    document.cookie = "state=unlogged"
    firebase.auth().signOut();

    closeNav();
    showModal('#login-modal');
    $("#loader").fadeIn();
    $(".welcome").fadeIn();
    $(".header").fadeOut();
    $("#editor").fadeOut();
    $("#nav-open").fadeOut();
    $("#join-close").fadeOut();
    $("#join-modal").addClass("do-not-hide");

    if (editor) { editor.off("change") }
    if (docRef) { unsubscribe(); }
    $('#username').text('');

    $("#workspace-name").html("<b>Workspace:</b> "); //Display the name of the editor on the page

    document.title = "404-Editor";
}

function signup() {
    const fields = $("#signup-form").serializeArray();
    const username = fields[0]['value'];
    const email = fields[1]['value'];
    const password = fields[2]['value'];

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(function() {
            firebase.auth().signInWithEmailAndPassword(email, password).then(function() {
                hideModal('#signup-modal');
                firebase.auth().currentUser.updateProfile({displayName: username}).then(function() {
                    postLogin();
                });
            })
        })
        .catch(function(error) {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("%c" + errorCode + ": " + errorMessage, "color:red;font-weight:bold;font-style:italic;");
            $("#errmsg-signup").html(error.message).css("opacity", "1").css("height", "34px");
            setTimeout(() => { $("#errmsg-signup").css("opacity", "0"); }, 3000);
            setTimeout(() => { $("#errmsg-signup").css("height", "0"); }, 3000);
            setTimeout(() => { $("#errmsg-signup").html(""); }, 3000);
        });
}

async function fetchUserWorkspaces() {
    const workspaces = [];
    const workspaceSnap = await db.collection(user.uid).get({ source:'server' });

    workspaceSnap.forEach((doc) => {
        workspaces.push({ id: doc.id, ...doc.data() });
    });

    workspaces.sort(function(a, b) {
        return b.lastUpdated - a.lastUpdated
    });

    $('#user-workspace-list').empty();
    workspaces.forEach(workspace => {
        const workspaceLastUpdated = new Date(parseInt(workspace.lastUpdated));

        $('#user-workspace-list').append(
            $("<li>").append(
                $("<a>").text(workspace.id)
            ).append(
                $("<span>").text(modelist.modesByName[workspace.lang].caption)
            ).append(
                $("<span>").text(`${workspaceLastUpdated.toLocaleDateString()}, ${('0'  + workspaceLastUpdated.getHours()).slice(-2)+':'+('0' + workspaceLastUpdated.getMinutes()).slice(-2)}`)
            ).attr('onclick', `joinWorkspace('${workspace.id}')`)
        );
    });
}

async function createWorkspace() {
    const workspaceName = sanitize($('#id-input').val());

    const workspaceRef = db.collection(user.uid).doc(workspaceName);
    const workspaceSnap = await workspaceRef.get()

    if (workspaceSnap.exists) {
        console.log("A workspace with this name already exists.");
        $("#errmsg-create").html("A workspace with this name already exists.").css("opacity", "1").css("height", "34px");
        setTimeout(() => { $("#errmsg-create").css("opacity", "0"); }, 3000);
        setTimeout(() => { $("#errmsg-create").css("height", "0"); }, 3000);
        setTimeout(() => { $("#errmsg-create").html(""); }, 3000);
        return;
    }

    await workspaceRef.set({
        content: "",
        lang: "markdown",
        queue: {},
        lastUpdated: Date.now().toString()
    });

    fetchUserWorkspaces();
    hideModal('#create-modal');
    $('#id-input').val('');
    joinWorkspace(workspaceName);
}

async function joinWorkspace(editorId) {
    closeNav();
    aceSetup(editorId);

    let lowerBoundTimestamp = Date.now();
    
    docRef = db.collection(user.uid).doc(editorId);
    
    unsubscribe = docRef.onSnapshot((doc) => {
        if (doc.exists) {
            const lang = doc.data().lang;
            const cLang = $selectLang.val();
            if (cLang !== lang && lang !== null) {
                //Ensure the language isn't a null value. 
                //This caused problems with deleting workspaces, as the null value would trigger an update, recreating the workspace with just a lang key.
                $selectLang.val(lang).change();
                fetchUserWorkspaces();
            }

            const queue = doc.data().queue || {};

            // Iterate over each timestamp in the queue
            for (const key in queue) {
                // Get the timestamp and data
                const [timestamp, originSessionId] = key.split(":");
                const data = queue[key];

                // Convert timestamp to a number
                const timestampNum = parseInt(timestamp);

                // Do not apply changes from the past
                if (lowerBoundTimestamp >= timestampNum) {
                    // console.log('ignoring change from before session load');
                    continue; // Use continue to skip this iteration
                }

                // Ignore changes made by this client
                if (originSessionId === sessionId) {
                    // console.log('ignoring self change');
                    continue; // Use continue to skip this iteration
                }

                // Apply the data to the editor
                if (!applyingDeltas) {
                    applyingDeltas = true;
                    // console.log(data.event);

                    editor.getSession().getDocument().applyDeltas([data.event]);

                    applyingDeltas = false;
                    lowerBoundTimestamp = timestampNum;
                }
            }
        } else {
            console.log('Document does not exist');
        }
      }, (error) => {
        console.error('Error getting document:', error);
    });

    editor.on('change', function (e) {
        if (applyingDeltas) { return; }

        const timestamp = Date.now().toString();
    
        const newContent = editor.getValue();
        const key = `${timestamp}:${sessionId}`;
    
        const updateData = {};
        updateData[key] = { by: sessionId, author: user.uid, event: e };
    
        docRef.set(
            { content: newContent, queue: updateData, lastUpdated: timestamp },
            { merge: true }
        )
        .then(() => {
            console.log('Document successfully updated!');
        })
        .catch((error) => {
            console.error('Error updating document:', error);
        });
    });

    // Select the desired programming language you want to code in 
    let $selectLang = $("#select-lang").change(function() {
        const timestamp = Date.now().toString();
        // Set the language in the Firebase object
        // This is a preference per editor
        docRef.set({ lang: this.value }, { merge: true });
        // Set the editor language
        editor.getSession().setMode("ace/mode/" + this.value);
        fetchUserWorkspaces();
    });

    let doc = await docRef.get();
    initialContent = doc.data().content;
    if (initialContent == "") {
        initialContent = `# Welcome to 404-Editor v3.0.0!`;
    }
    applyingDeltas = true;
    editor.setValue(initialContent, -1);
    applyingDeltas = false;

    editor.setOption("showPrintMargin", false);
    editor.setOption("customScrollbar", true);
    editor.setOption("animatedScroll", true);
    editor.setOption("scrollPastEnd", 0.5);

    // Hide the spinner and other loading crap, show the editor and buttons
    hideModal('#join-modal');
    $("#loader").fadeOut();
    $(".welcome").fadeOut();
    $(".header").fadeIn();
    $("#editor").fadeIn();
    $("#nav-open").fadeIn();
    $("#join-close").fadeIn();
    $("#join-modal").removeClass("do-not-hide");

    // And finally, focus the editor!      
    editor.focus();
}

function aceSetup(editorId) {
    if (editor) { editor.off("change") }
    if (docRef) { unsubscribe(); }

    workspaceName = editorId;
    //Display the name of the editor on the page
    document.title = workspaceName + " | 404-Editor";
    $("#workspace-name").html("<b>Workspace:</b> " + workspaceName);

    // Select the desired theme of the editor
    $("#select-light-theme").change(function() {
        // Set the theme in the editor
        if (getThemePref() === "LIGHT" || getAutoTheme() === "LIGHT") {
            editor.setTheme(this.value);
        }

        // Update the theme in the localStorage
        // We wrap this operation in a try-catch because some browsers don't
        // support localStorage (e.g. Safari in private mode)
        try {
            localStorage.setItem(LS_LIGHT_THEME_KEY, this.value);
        } catch (e) {}
    }).val(getLightTheme());

    $("#select-dark-theme").change(function() {
        // Set the theme in the editor
        if (getThemePref() === "DARK" || getAutoTheme() === "DARK") {
            editor.setTheme(this.value);
        }

        // Update the theme in the localStorage
        // We wrap this operation in a try-catch because some browsers don't
        // support localStorage (e.g. Safari in private mode)
        try {
            localStorage.setItem(LS_DARK_THEME_KEY, this.value);
        } catch (e) {}
    }).val(getDarkTheme());

    $('input[name="theme-toggles"]').change(function () {
        const selectedValue = $('input[name="theme-toggles"]:checked').val();

        try {
            localStorage.setItem(LS_THEME_PREF_KEY, selectedValue);
            setEditorTheme();
            setUITheme();
        } catch (e) {}
    });

    $("#font-size").change(function() {
        // Update font size
        $("#editor").css("font-size", this.value + "px");

        try {
            localStorage.setItem(EDITOR_FONT_SIZE, this.value);
        } catch (e) {}
    }).val(getFontSize());

    // Initialize the ACE editor
    editor = ace.edit("editor");
    setEditorTheme();
    editor.$blockScrolling = Infinity;
    $("#editor").css("font-size", getFontSize() + "px");
    $('input.radio[name="theme-toggles"]').prop('checked', false);
    $(`input.radio[name="theme-toggles"][value="${getThemePref()}"]`).prop('checked', true);
}

// Function to calculate the diff between two strings
function stringDiff(oldStr, newStr) {
    const diff = [];
    const dmp = new diff_match_patch();
  
    const patches = dmp.patch_make(oldStr, newStr);
    patches.forEach(patch => {
        patch.diffs.forEach(part => {
            if (part[0] === 0) {
                // No change
            } else if (part[0] === 1) {
                // Insertion
                diff.push({ type: 'insert', start: patch.start1, lines: part[1].split('\n') });
            } else if (part[0] === -1) {
                // Deletion
                diff.push({ type: 'remove', start: patch.start1, end: patch.start1 + part[1].length });
            }
        });
    });
  
    return diff;
}

function sanitize(str) {
    //strip all html from string
    return str.replace(/(<([^>]+)>)/ig, "");
}

function openNav() {
    document.getElementById("navbox").style.width = "250px";
}

function closeNav() {
    document.getElementById("navbox").style.width = "0";
}

function resetActiveModal() {
    $('.modal').removeClass('active');
}

function showModal(id) {
    resetActiveModal();
    $(id).addClass('shown').addClass('active').removeClass('hidden');
    $(id).fadeIn();
    const focusTarget = $(id).find('.first-focus')[0]
    if (focusTarget){
        focusTarget.focus();
    }
}

function hideModal(id) {
    resetActiveModal();
    $(id).removeClass('shown').addClass('hidden');
    $(id).fadeOut();
}

function loadAceLangOptions() {
    const modes = modelist.modes;

    for (mode in modes) {
        $('#select-lang').append(
            $('<option>').attr('value', modes[mode].name).attr('id', modes[mode].extensions).text(modes[mode].caption)
        );
    }
}

function loadAceThemeOptions() {
    const themes = themelist.themes;

    for (theme in themes) {
        if (themes[theme].isDark) {
            $('#select-dark-theme').append(
                $('<option>').attr('value', themes[theme].theme).text(themes[theme].caption)
            );
        } else {
            $('#select-light-theme').append(
                $('<option>').attr('value', themes[theme].theme).text(themes[theme].caption)
            );
        }
    }
}

/*Function to download a workspace*/
function downloadWorkspace() {

    function save(data, filename, type) {
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

    function determineLang() {
        /*Function to determine the selected option in a <select> element. Takes the element as a parameter.*/
        function getSelectedOption(sel) {
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
    }

    let text = editor.getValue();
    var fullname = workspaceName + determineLang(); //Construct the complete filename from the name of the editor and the file extension
    save(text, fullname, "txt"); //Save the file with our save function. Type is plain text, since that's all these kind of files are
}

async function deleteWorkspace() {
    //Double check they understand what the trash can symbol means
    if (confirm("Are you sure you want to delete this workspace?\n\nThis cannot be undone.")) {
        if (editor) { editor.off("change") }
        if (docRef) { unsubscribe(); }
        await docRef.delete();
        console.log(`Deleted workspace ${workspaceName}`);
        // fetchUserWorkspaces();
        location.reload();
    }
}

function resetPassword() {
    const email = $('#passreset-email').val();
    firebase.auth().sendPasswordResetEmail(email);
    alert(`An email has been sent to ${email} with instructions on how to reset your password`);
    hideModal('#passreset-modal');
}

window.addEventListener('DOMContentLoaded', load);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (getThemePref() === "AUTO") {
        if (editor) { setEditorTheme(); }
        setUITheme();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
        if ($('.modal.active').length > 0) {
            const target = $('.modal.active')[0];
            if (!target.classList.contains('do-not-hide')){
                hideModal(`#${target.id}`);
            }
        } else {
            closeNav();
        }
    }
});