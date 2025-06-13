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

const VER = '3.1.2';
const DATE = '06/13/2025';
const NAME = '404-Editor';
const AUTHOR = 'Owen Bowden';

//Global state vars
const db = firebase.firestore();
let user;
let docRef;
let editor;
let unsubscribe;
let workspaceName;
let isOwner = false;
let applyingDeltas = false;
const sessionId = Math.random().toString().slice(2);
const modelist = ace.require("ace/ext/modelist");
const themelist = ace.require("ace/ext/themelist");
const storage = firebase.storage().ref();

// Local storage keys for preferences
const LS_DARK_THEME_KEY = "editor-dark-theme";
const LS_LIGHT_THEME_KEY = "editor-light-theme";
const LS_THEME_PREF_KEY = "editor-theme-pref";
const EDITOR_FONT_SIZE = "editor-font-size";
const EDITOR_WORD_WRAP = "editor-word-wrap";

// Initial text to populate new editors with
const initialContent = `# Welcome to 404-Editor v${VER}!`;
const initialLang = 'markdown';

// Function to grab the user's preferred light theme from local storage
function getLightTheme() {
    return localStorage.getItem(LS_LIGHT_THEME_KEY) || "ace/theme/tomorrow";
}

// Function to grab the user's preferred dark theme from local storage
function getDarkTheme() {
    return localStorage.getItem(LS_DARK_THEME_KEY) || "ace/theme/tomorrow_night";
}

// Function to grab the user's preferred theme from local storage (LIGHT / DARK / AUTO)
function getThemePref() {
    let LS_THEME_PREF_KEY = "editor-theme-pref";
    return localStorage.getItem(LS_THEME_PREF_KEY) || "LIGHT";
}

// Function to determine whether the user's system is in light or dark mode.
function getAutoTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "DARK" : "LIGHT";
}

// Function to set the color scheme of the editor.
function setEditorTheme() {
    if (getThemePref() === "DARK") {
        editor.setTheme(getDarkTheme());
    } else if (getThemePref() === "AUTO") {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            editor.setTheme(getDarkTheme());
        } else {
            editor.setTheme(getLightTheme());
        }
    } else {
        // Light theme as default
        editor.setTheme(getLightTheme());
    }
}

// Function to set the color scheme of the webpage UI.
function setUITheme() {
    if (getThemePref() === "DARK") {
        darkUI();
    } else if (getThemePref() === "AUTO") {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            darkUI();
        } else {
            lightUI();
        }
    } else {
        // Light theme as default
        lightUI();
    }
}

// Function to set the page to light mode.
function lightUI() {
    $('body').removeClass('theme-dark').addClass('theme-light');
}

// Function to set the page to dark mode.
function darkUI() {
    $('body').removeClass('theme-light').addClass('theme-dark');
}

// Function to get the user's preferred font size from local storage
function getFontSize() {
    return localStorage.getItem(EDITOR_FONT_SIZE) || 12;
}

// Function to get the user's word wrap preference from local storage
function getWordWrap() {
    return localStorage.getItem(EDITOR_WORD_WRAP) === 'true' || false;
}

// Function that initializes 404-Editor on page load.
function init() {
    // Set the UI to the user's preferred theme.
    setUITheme();

    // Display the version info in the sidebar.
    displayVersionInfo();
    // Load all of the supported languages and available color schemes into the preferences window
    loadAceLangOptions();
    loadAceThemeOptions();

    showOwnWorkspaces();

    // Determine whether a user is already logged in.
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in.
            console.log('User is logged in:', user.email);
            // Proceed to post-login setup.
            postLogin();
        } else {
            // No user is signed in.
            console.log('No user is logged in');
            // Show the login modal.
            showModal('#login-modal');
        }
    });
}

// Function to log a user in and validate their credentials
function login() {
    const fields = $("#login-form").serializeArray();
    const email = fields[0]['value'];
    const password = fields[1]['value'];

    // Attempt to sign in by passing the provided credentials to the server.
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(function() {
            // On a successful login, proceed to post-login setup.
            // postLogin();
        })
        .catch(function(error) {
            // On an unsuccessful login, display an error message to the user.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("%c" + errorCode + ": " + errorMessage, "color:red;font-weight:bold;font-style:italic;");
            $("#errmsg-login").html(error.message).css("opacity", "1").css("height", "34px");
            setTimeout(() => { $("#errmsg-login").css("opacity", "0"); }, 3000);
            setTimeout(() => { $("#errmsg-login").css("height", "0"); }, 3000);
            setTimeout(() => { $("#errmsg-login").html(""); }, 3000);
        });
    
}

// Function that runs further initialization after the user has logged in.
function postLogin() {
    // Hide the login modal and clear it's fields
    hideModal('#login-modal');
    $('#login-email').val('');
    $('#login-pass').val('');

    // Update the global user variable
    user = firebase.auth().currentUser;
    console.log(user.uid);

    // fillPFP(user.uid, document.getElementById('user-pfp'));
    fetchUserPFP();

    // Display their username in the sidebar.
    fetchUserDisplayName();

    // Fetch all of the user's workspaces, and display the list to the user.
    fetchUserWorkspaces().then(function () {
        showModal('#join-modal');
    });
}

// Function to log out a user
function logout() {
    // Log them out of Firebase
    firebase.auth().signOut();

    // Close the nav menus
    closeNav('#navbox');
    closeNav('#userbox');
    
    // Show the login modal, the welcome text, and the loader icon
    showModal('#login-modal');
    $("#loader").fadeIn();
    $(".welcome").fadeIn();

    // Hide the header, editor, and menu button
    $(".header").fadeOut();
    $("#editor").fadeOut();

    // Hide the join modal and set it to do-not-hide mode.
    $("#join-close").fadeOut();
    $("#join-modal").addClass("do-not-hide");

    // Clear event listener on the editor (local changes)
    if (editor) { editor.off("change") }
    // Clear event listener on the Firebase document (remote changes)
    if (docRef) { unsubscribe(); }

    $('#user-pfp').attr('src', '');
    $('#user-pfp-menu').attr('src', '');

    // Clear the username display on the sidebar
    $('#username').text('');
    $('#user-displayname').val('');

    // Clear the workspace name in the header and page title
    $("#workspace-name").html("<b>Workspace:</b> "); 
    document.title = "404-Editor";
}

// Function to register a new user.
function signup() {
    const fields = $("#signup-form").serializeArray();
    const username = fields[0]['value'];
    const email = fields[1]['value'];
    const password = fields[2]['value'];

    // Create the user with the provided email and password.
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(function() {
            // If user creation is successful, log the user in.
            firebase.auth().signInWithEmailAndPassword(email, password).then(function() {
                // After logging in, hide the registration modal and clear its fields
                hideModal('#signup-modal');
                $('#signup-username').val('');
                $('#signup-email').val('');
                $('#signup-pass').val('');

                // Assign the username the user provided to their profile.
                firebase.auth().currentUser.updateProfile({displayName: username}).then(async function() {
                    
                    const usersSnap = await db.collection('users').doc(user.uid);

                    usersSnap.set({
                        email: user.email,
                        name: user.displayName,
                        creationDate: Date.now().toString()
                    });

                    // Finally, continue with post-login initialization.
                    postLogin();
                });
            })
        })
        .catch(function(error) {
            // If there is an issue registering the user, flash an error message onscreen.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("%c" + errorCode + ": " + errorMessage, "color:red;font-weight:bold;font-style:italic;");
            $("#errmsg-signup").html(error.message).css("opacity", "1").css("height", "34px");
            setTimeout(() => { $("#errmsg-signup").css("opacity", "0"); }, 3000);
            setTimeout(() => { $("#errmsg-signup").css("height", "0"); }, 3000);
            setTimeout(() => { $("#errmsg-signup").html(""); }, 3000);
        });
}

async function getUsernameFromId(id) {
    const targetUserSnapshot = await db.collection('users').doc(id).get();
    return targetUserSnapshot.data().name;
}

async function shareWorkspace() {
    const targetUserEmail = $('#share-email').val();
    try {
        // Get the UID of the target user based on their email
        const targetUserSnapshot = await db.collection('users').where('email', '==', targetUserEmail).get();

        if (targetUserSnapshot.empty) {
            throw Error('User with provided email not found.');
        }

        if (targetUserEmail == user.email) {
            throw Error("You can't share a workspace with yourself!");
        }

        const targetUserUid = targetUserSnapshot.docs[0].id;

        // Check if the workspace exists
        const workspaceRef = db.collection(user.uid).doc(workspaceName);
        let workspaceSnapshot = await workspaceRef.get();

        if (!workspaceSnapshot.exists) {
            console.log('Workspace does not exist');
            return;
        }

        // Add the target user's UID to the workspace's 'sharedWith' field
        await workspaceRef.set({
            sharedWith: firebase.firestore.FieldValue.arrayUnion(targetUserUid)
        }, { merge: true }).then(async function () {
            workspaceSnapshot = await workspaceRef.get();
            getCollaborators(workspaceSnapshot.data().sharedWith);
        });

        await db.collection('users').doc(targetUserUid).collection('public').doc('sharing').set({
            sharedOn: firebase.firestore.FieldValue.arrayUnion(`${user.uid}::${workspaceName}`)
        });

        console.log(`Workspace "${workspaceName}" shared with ${targetUserEmail}`);        
    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log("%c" + errorCode + ": " + errorMessage, "color:red;font-weight:bold;font-style:italic;");
        $("#errmsg-share").html(error.message).css("opacity", "1").css("height", "34px");
        setTimeout(() => { $("#errmsg-share").css("opacity", "0"); }, 3000);
        setTimeout(() => { $("#errmsg-share").css("height", "0"); }, 3000);
        setTimeout(() => { $("#errmsg-share").html(""); }, 3000);
    }
    $('#share-email').val('');
}

// Function to pull a list of the user's workspaces and display them
async function fetchUserWorkspaces() {
    const workspaces = [];
    // Grab a snapshot of the current user's collection.
    const workspaceSnap = await db.collection(user.uid).get({ source:'server' });

    // Push each document (workspace) to an array.
    workspaceSnap.forEach((doc) => {
        workspaces.push({ id: doc.id, ...doc.data() });
    });

    // Sort the array based on the time the workspaces were last modified (most recent first)
    workspaces.sort(function(a, b) {
        return b.lastUpdated - a.lastUpdated;
    });

    // Clear the workspace list UI
    $('#user-workspace-list').empty();

    // Iterate over each workspace, populating the modal with html content
    workspaces.forEach(workspace => {
        // Get the timestamp of when this workspace was last modified.
        const workspaceLastUpdated = new Date(parseInt(workspace.lastUpdated));

        // Generate the HTML list items to append to the list.
        /*
            WORKSPACE_NAME
            > WORKSPACE_LANGUAGE
            > WORKSPACE_LAST_MODIFIED
        */
        // When clicked, each list item is set to call joinWorkspace(id) to then join that particular workspace.
        $('#user-workspace-list').append(
            $("<li>").append(
                $("<a>").text(workspace.id)
            ).append(
                $("<span>").addClass('details').text(modelist.modesByName[workspace.lang].caption)
            ).append(
                // I love working with dates in JS
                $("<span>").addClass('details').text(`${workspaceLastUpdated.toLocaleDateString()}, ${('0'  + workspaceLastUpdated.getHours()).slice(-2)+':'+('0' + workspaceLastUpdated.getMinutes()).slice(-2)}`)
            ).attr('onclick', `joinWorkspace('${workspace.id}')`)
        );
    });
    if (workspaces.length == 0) {
        $('#user-workspace-list').append(
            $('<span>').text('Nothing to show here...')   
        );    
    }

    fetchSharedWorkspaces();
}

async function fetchSharedWorkspaces() {
    $('#shared-workspace-list').empty();
    try {
        // Query all workspaces where the current user's UID is in the 'sharedWith' array
        const querySnapshot = await db.collection('users').doc(user.uid).collection('public').doc('sharing').get();

        if (!querySnapshot.exists) {
            $('#shared-workspace-list').append(
                $('<span>').text('Nothing to show here...')   
            );
        }

        const sharedWorkspacesIds = querySnapshot.data().sharedOn || [];
        // console.log(sharedWorkspacesIds);

        sharedWorkspacesIds.forEach(async (workspaceId) => {
            [sharedOwner, sharedName] = workspaceId.split('::', 2);
            
            try {
                const sharedWorkspaceSnap = await db.collection(sharedOwner).doc(sharedName).get();
                const workspace = sharedWorkspaceSnap.data();
    
                // Get the timestamp of when this workspace was last modified.
                const workspaceLastUpdated = new Date(parseInt(workspace.lastUpdated));
    
                // Generate the HTML list items to append to the list.
                /*
                    WORKSPACE_NAME
                    > WORKSPACE_LANGUAGE
                    > WORKSPACE_LAST_MODIFIED
                */
                // When clicked, each list item is set to call joinWorkspace(id) to then join that particular workspace.
                $('#shared-workspace-list').append(
                    $("<li>").append(
                        $("<a>").text(sharedWorkspaceSnap.id)
                    ).append(
                        $("<span>").addClass('details').text(`Owned by: ${await getUsernameFromId(sharedOwner)}`).addClass('bold')
                    ).append(
                        $("<span>").addClass('details').text(modelist.modesByName[workspace.lang].caption)
                    ).append(
                        // I love working with dates in JS
                        $("<span>").addClass('details').text(`${workspaceLastUpdated.toLocaleDateString()}, ${('0'  + workspaceLastUpdated.getHours()).slice(-2)+':'+('0' + workspaceLastUpdated.getMinutes()).slice(-2)}`)
                    ).attr('onclick', `joinWorkspace('${sharedWorkspaceSnap.id}', '${sharedOwner}')`)
                );
            } catch (error) {
                console.log(`Couldn't access: ${workspaceId}, removing from list.`);
            }
            
        });

        // console.log($('#shared-workspace-list').children().length);
        if (sharedWorkspacesIds.length == 0) {
            $('#shared-workspace-list').append(
                $('<span>').text('Nothing to show here...')   
            );
        }
        
    } catch (error) {
        console.error('Error getting shared workspaces:', error);
        // Handle errors (e.g., display an error message to the user)
        return [];
    }
}

function getCollaborators(uidArray) {
    $('#collaborator-list').empty();

    uidArray.forEach(async uid => {
        const userSnap = await db.collection('users').doc(uid);
        const userData = await userSnap.get();
        // console.log(userData.data().name, userData.data().email);

        const pfpURL = await fetchOtherUserPFP(uid);
        // console.log(pfpURL);

        $('#collaborator-list').append(
            $("<li>").append(
                $("<span>").addClass('pfp-container').append(
                    $("<i>").addClass('fas fa-user')
                ).append(
                    $("<img>").addClass('pfp').attr('src', pfpURL)
                )
            ).append(
                $("<div>").addClass('info').append(
                    $("<p>").text(userData.data().name)
                ).append(
                    $("<span>").addClass('details').text(userData.data().email)
                )
            )
        );
    });
}

// Function to create a new workspace.
async function createWorkspace() {
    // Grab the given name of the new workspace
    // Sanitize to prevent HTML injection.
    workspaceName = sanitize($('#create-id').val());
    
    // Grab the language for the preferred workspace.
    const workspaceLang = $('#create-lang').val();

    // Get a reference to the document (workspace) with the provided name.
    // If it doesn't exist yet, there's nothing to worry about, it will just magically appear.
    const workspaceRef = db.collection(user.uid).doc(workspaceName);
    const workspaceSnap = await workspaceRef.get();

    // Easy check to see if the workspace already exists (name already taken).
    if (workspaceSnap.exists) {
        // Display an error message if so, and stop the execution of this function.
        console.log("A workspace with this name already exists.");
        $("#errmsg-create").html("A workspace with this name already exists.").css("opacity", "1").css("height", "34px");
        setTimeout(() => { $("#errmsg-create").css("opacity", "0"); }, 3000);
        setTimeout(() => { $("#errmsg-create").css("height", "0"); }, 3000);
        setTimeout(() => { $("#errmsg-create").html(""); }, 3000);
        return;
    }

    // Set the initial content of the workspace.
    await workspaceRef.set({
        content: initialContent,
        lang: workspaceLang,
        queue: {},
        lastUpdated: Date.now().toString()
    });

    // Refresh the workspace list now that a new workspace has been created.
    fetchUserWorkspaces();
    
    // Hide the workspace creation modal, and clear its fields.
    hideModal('#create-modal');
    $('#create-id').val('');
    $('#create-lang').val(initialLang);

    // Join the newly created workspace.
    joinWorkspace(workspaceName);
}

// Function to join a specified workspace.
async function joinWorkspace(editorId, owner = user.uid) {
    workspaceName = editorId;

    if(owner === user.uid) {
        console.log("User owns this workspace.");
        isOwner = true;
        $('#share-button').show();
        $('#delete-button').show();
    } else {
        console.log("User was shared this workspace.");
        isOwner = false;
        $('#share-button').hide();
        $('#delete-button').hide();
    }

    // Hide the join modal and close the navbar,
    hideModal('#join-modal');
    closeNav('#navbox');

    // Perform initial setup of the Ace editor.
    aceSetup(editorId);

    // Save the current time. We will use it when listening for changes.
    let lowerBoundTimestamp = Date.now();
    
    // Get a reference to the current document (workspace)
    docRef = db.collection(owner).doc(editorId);
    
    // Start up the event listener to listen for remote changes and apply them to our local editor.
    unsubscribe = docRef.onSnapshot((doc) => {
        // Verify our workspace still exists. Our friend could pull the rug out from under us and delete it.
        if (doc.exists) {
            // Get remote language setting
            const rLang = doc.data().lang;
            // Get local language setting
            const cLang = $selectLang.val();
            // Compare if the remote and client languages match
            // Ensure the language isn't a null value. 
            // This caused problems with deleting workspaces, as the null value would trigger an update, recreating the workspace with just a lang key.
            if (cLang !== rLang && rLang !== null) {
                // The language has changed, so we need to apply the new language to our local editor.
                $selectLang.val(rLang).change();
                // Refresh the workspace list to reflect the language change there, too.
                fetchUserWorkspaces();
            }

            // Get the queue of edits
            const queue = doc.data().queue || {};

            console.log("Queue length before purge:" + Object.keys(queue).length);

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
                    // continue; // Use continue to skip this iteration

                    // Attempt at purging old queue entries.
                    
                    docRef.update({[`queue.${key}`]: firebase.firestore.FieldValue.delete()});
                    continue;
                }

                // Ignore changes made by this client
                if (originSessionId === sessionId) {
                    // console.log('ignoring self change');
                    continue; // Use continue to skip this iteration
                }

                // Apply the data to the editor. 
                // Set applyingDeltas=true while modifying the local editor. This flag tells the local event listener to ignore these changes.
                if (!applyingDeltas) {
                    applyingDeltas = true;
                    editor.session.doc.applyDeltas([data.event]);
                    applyingDeltas = false;

                    // Update the lowerBoundTimestamp, so no changes before this one are applied again.
                    lowerBoundTimestamp = timestampNum;
                }
            }
        } else {
            console.log('Document does not exist');
            alert('The workspace you are currently viewing has been deleted by another user.');
            location.reload();
        }
      }, (error) => {
        console.error('Error getting document:', error);
    });

    // Start up the event listener on the local editor, to push changes to the server
    editor.on('change', function (e) {
        // If the applyingDeltas flag is set, we ignore the changes as they are simply remote changes being applied to our local editor.
        if (applyingDeltas) { return; }

        // Store the current timestamp.
        const timestamp = Date.now().toString();
    
        // Get the current text content of the editor.
        const newContent = editor.getValue();

        // Create a unique identifying key for this edit using the current timestamp and the local session ID.
        const key = `${timestamp}:${sessionId}`;
    
        // Create an object to store the data for this edit.
        const updateData = {};
        // We store the following:
        /*
            by: sessionId -> ID unique to this session (browser window)
            author: user.uid -> The unique ID of the user who made the change
            event: e -> The event emitted by the editor, describing the actual changes made.
        */
        updateData[key] = { by: sessionId, author: user.uid, event: e };
    
        // Merge the updateData object into the editor's queue,
        // set the editor's last modified time,
        // and set the content of the editor to the new content.
        docRef.set(
            { content: newContent, queue: updateData, lastUpdated: timestamp },
            { merge: true }
        )
        // .then(() => {
        //     console.log('Document successfully updated!');
        // })
        .catch((error) => {
            console.error('Error updating document:', error);
        });

        // Note that, even though we set the editor's content with this change, it isn't read by other currently connected clients.
        // They only listen on the `queue` object.
        // The editor's content is only read by clients when initially loading and setting the content of the local editor
    });

    // Event listener for the language selector. 
    let $selectLang = $("#select-lang").change(function() {
        // Set the language in the Firebase object
        // This is a preference per editor
        docRef.set({ lang: this.value }, { merge: true });
        // Set the editor language
        editor.session.setMode("ace/mode/" + this.value);
        // Refresh the workspace list
        // fetchUserWorkspaces();
    });

    // Grab the workspace object
    let doc = await docRef.get();

    if (isOwner) {
        const collaborators = doc.data().sharedWith || [];
        getCollaborators(collaborators);
    }


    // Get the text content of the workspace
    remoteContent = doc.data().content;

    // Fill our editor with it's initial content
    applyingDeltas = true;
    editor.setValue(remoteContent, -1);
    applyingDeltas = false;

    // Hide the spinner and other loading crap, show the editor and buttons
    $("#loader").fadeOut();
    $(".welcome").fadeOut();
    $(".header").fadeIn();
    $("#editor").fadeIn();
    $("#join-close").fadeIn();
    $("#join-modal").removeClass("do-not-hide");

    // And finally, focus the editor!      
    editor.focus();
}

// Function to perform initial setup of the Ace editor.
function aceSetup(workspaceName) {
    // Disable the local and remote event listeners.
    if (editor) { editor.off("change") }
    if (docRef) { unsubscribe(); }

    //Display the name of the editor on the page
    document.title = workspaceName + " | 404-Editor";
    $("#workspace-name").html("<b>Workspace:</b> " + workspaceName);

    // Set an event listener for when the user changes their preferred light theme, 
    // and set it's initial value in the preferences window.
    $("#select-light-theme").change(function() {
        // Set the theme in the editor
        if (getThemePref() === "LIGHT" || getAutoTheme() === "LIGHT") {
            editor.setTheme(this.value);
        }

        // Update the light theme in the localStorage
        try {
            localStorage.setItem(LS_LIGHT_THEME_KEY, this.value);
        } catch (e) {}
    }).val(getLightTheme());


    // Set an event listener for when the user changes their preferred dark theme, 
    // and set it's initial value in the preferences window.
    $("#select-dark-theme").change(function() {
        // Set the theme in the editor
        if (getThemePref() === "DARK" || getAutoTheme() === "DARK") {
            editor.setTheme(this.value);
        }

        // Update the dark theme in the localStorage
        try {
            localStorage.setItem(LS_DARK_THEME_KEY, this.value);
        } catch (e) {}
    }).val(getDarkTheme());

    // Set an event listener for when the user changes their preferred theme mode (LIGHT / DARK / AUTO)
    $('input[name="theme-toggles"]').change(function () {
        const selectedValue = $('input[name="theme-toggles"]:checked').val();

        try {
            localStorage.setItem(LS_THEME_PREF_KEY, selectedValue);
            setEditorTheme();
            setUITheme();
        } catch (e) {}
    });
    // Ensure the correct radio button is selected
    $('input.radio[name="theme-toggles"]').prop('checked', false);
    $(`input.radio[name="theme-toggles"][value="${getThemePref()}"]`).prop('checked', true);

    // Set an event listener for when the user changes their preferred font size, 
    // and set it's initial value in the preferences window.
    $("#font-size").change(function() {
        // Update font size
        $("#editor").css("font-size", this.value + "px");

        try {
            localStorage.setItem(EDITOR_FONT_SIZE, this.value);
        } catch (e) {}
    }).val(getFontSize());

    // Set an event listener for when the user changes their word wrap preference,
    // and set it's initial value in the preferences window.
    $('#word-wrap-toggle').change(function () {
        const wrapEnabled = $('#word-wrap-toggle').prop('checked');
        editor.setOption("wrap", wrapEnabled);

        try {
            localStorage.setItem(EDITOR_WORD_WRAP, wrapEnabled);
        } catch (e) {}
    }).prop('checked', getWordWrap());

    // Initialize the ACE editor
    editor = ace.edit("editor");
    setEditorTheme();
    // Set some basic Ace preferences.
    editor.setOption("showPrintMargin", false);
    editor.setOption("customScrollbar", true);
    editor.setOption("animatedScroll", true);
    editor.setOption("wrap", getWordWrap());
    editor.setOption("scrollPastEnd", 1.0);
    editor.$blockScrolling = Infinity;
    $("#editor").css("font-size", getFontSize() + "px");
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

// Function to strip all HTML tags from a string
function sanitize(str) {
    return str.replace(/(<([^>]+)>)/ig, "");
}

// Function to open the navigation menu
function openNav(id) {
    $(id).addClass('shown');
}

// Function to close the navigation menu
function closeNav(id) {
    $(id).removeClass('shown');
}

// Function to mark any currently 'active' modals as 'inactive'
function resetActiveModal() {
    $('.modal').removeClass('active');
}

// Function to bring a modal dialog into view
function showModal(id) {
    resetActiveModal();
    // 'shown' class -> this modal is currently visible on-screen
    // 'active' class -> this modal is the one currently focussed by the user.
    $(id).addClass('shown').addClass('active').removeClass('hidden');
    $(id).fadeIn();

    // Give focus to any input field in this modal that should be granted it.
    const focusTarget = $(id).find('.first-focus')[0];
    if (focusTarget){
        focusTarget.focus();
    }
}

// Function to hide a modal dialog
function hideModal(id) {
    resetActiveModal();
    $(id).removeClass('shown').addClass('hidden');
    $(id).fadeOut();
}

// Function to load in all of the languages supported by the Ace editor.
function loadAceLangOptions() {
    const modes = modelist.modes;

    for (mode in modes) {
        $('#select-lang').append(
            $('<option>').attr('value', modes[mode].name).attr('id', modes[mode].extensions).text(modes[mode].caption)
        );

        $('#create-lang').append(
            $('<option>').attr('value', modes[mode].name).attr('id', modes[mode].extensions).text(modes[mode].caption)
        );
    }

    $('#create-lang').val(initialLang);
}

// Function to load in all of the built-in color schemes in the Ace editor.
function loadAceThemeOptions() {
    const themes = themelist.themes;

    for (theme in themes) {
        // Separate them by light/dark
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

// Function to download a workspace
function downloadWorkspace() {

    function save(data, filename, type) {
            const file = new Blob([data], { type: type }); //New file variable (blob?) with the contents and type
            if (window.navigator.msSaveOrOpenBlob) // IE10+
                window.navigator.msSaveOrOpenBlob(file, filename);
            else { // Others
                const a = document.createElement("a"); //Creating an a element
                const url = URL.createObjectURL(file); //Get url to our newly made file
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
                let opt; //To hold the option
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

    const text = editor.getValue();
    const fullname = workspaceName + determineLang(); //Construct the complete filename from the name of the editor and the file extension
    save(text, fullname, "txt"); //Save the file with our save function. Type is plain text, since that's all these kind of files are
}

// Function to delete a workspace
async function deleteWorkspace() {
    //Double check they understand what the trash can symbol means
    if (confirm("Are you sure you want to delete this workspace?\n\nThis cannot be undone.")) {
        if (editor) { editor.off("change") }
        if (docRef) { unsubscribe(); }
        await docRef.delete();
        console.log(`Deleted workspace ${workspaceName}`);
        location.reload();
    }
}

// Function to send a password reset email
function resetPassword() {
    // Get the provided email.
    const email = $('#passreset-email').val();
    firebase.auth().sendPasswordResetEmail(email);
    alert(`An email has been sent to ${email} with instructions on how to reset your password`);

    // Hide modal and clear fields.
    hideModal('#passreset-modal');
    $('#passreset-email').val('');
}

// Function to show the version info in the sidebar
function displayVersionInfo() {
    $('#version-info').html(`${NAME}<br>v${VER} (${DATE})<br>${AUTHOR}`);
}

function showOwnWorkspaces() {
    $('#tab-owned').addClass('active');
    $('#tab-shared').removeClass('active');
    $('#shared-workspace-list').hide();
    $('#user-workspace-list').show();
}

function showSharedWorkspaces() {
    $('#tab-shared').addClass('active');
    $('#tab-owned').removeClass('active');
    $('#user-workspace-list').hide();
    $('#shared-workspace-list').show();
}

function fetchUserDisplayName() {
    $('#username').text(user.displayName);
    $('#user-displayname').val(user.displayName);
}

async function setUserDisplayName(){
    const newName = sanitize($('#user-displayname').val());
    if (newName !== user.displayName && newName){
        user.updateProfile({displayName: newName}).then(() => {
            fetchUserDisplayName();
        });

        const usersSnap = await db.collection('users').doc(user.uid);

        usersSnap.update({
            name: newName,
        });
    }
}

async function setUserPFP(){
    const pfpFile = document.getElementById('pfp-upload').files[0];
    if (pfpFile) {
        const userPicRef = storage.child(`user-profile-images/${user.uid}`);
        console.log(pfpFile);
        console.log(userPicRef);
    
        userPicRef.put(pfpFile).then(() => {
            userPicRef.getDownloadURL().then((url) => {
                user.updateProfile({photoURL: url}).then(() => {
                    fetchUserPFP();
                });
            });
        });
    }
}

async function fetchOtherUserPFP(uid) {
    const userPicRef = storage.child(`user-profile-images/${uid}`);
    const url = await userPicRef.getDownloadURL().catch(function(error) {
        // console.log("User has no profile picture.");
    });

    if (url) {
        const tokenlessURL = url.split('&token')[0];
        return tokenlessURL;
    } else {
        return '';
    }
}

function fetchUserPFP() {
    $('#user-pfp').attr('src', user.photoURL);
    $('#user-pfp-menu').attr('src', user.photoURL);
}

function updateProfile() {
    setUserPFP();
    setUserDisplayName();
    hideModal('#profile-modal');
}

// Run initialization on page load.
window.addEventListener('DOMContentLoaded', init);

// Detect system light/dark mode change and apply them to the UI, if the user is set to AUTO theme mode.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (getThemePref() === "AUTO") {
        if (editor) { setEditorTheme(); }
        setUITheme();
    }
});

// Detect press of the Escape key, and hide the active modal or the navbar, whichever is relevant.
document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
        if ($('.modal.active').length > 0) {
            const target = $('.modal.active')[0];
            if (!target.classList.contains('do-not-hide')) {
                hideModal(target);
            }
        } else {
            const target = $('.sidenav.shown')[0];
            closeNav(target);
        }
    }
});
