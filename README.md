# 404-Editor
<img align=left height="200" src="https://github.com/the404devs/404-editor/blob/master/icon_white_1024.png">
An online code editor written in JS, making use of Firebase.

Originally written on May 15, 2018 during class because I didn't want to work on our Java assignment.

Rewritten August 19-20, 2020.

Rewritten once more, September 8-9, 2023.

*Protip: Never type on the same line as someone else, bad things happen.*

https://editor.the404.nl

**Archived Versions:**
- 1.0.2
- 1.1.0
- 1.2.1
- 1.2.2
- 2.0.5


*TODO:*
- add password-change form to profile settings


### *3.2.0 (06/17/2025)*
------------------------
- Finally got around to making an icon for this project
- New feature: cursor markers for remote users (see where people are typing)
- Made editor `deltas` get stored in a subcollection in the backend rather than a field
    - This prevents the field-size limits I was encountering, while still preserving full edit history.
- Editor content is only updated on the backend every 20 deltas, and when joining a workspace the editor will load the last content snapshot, followed by all deltas since then.
- Added a *Refresh* button to the Shared Workspace list.
- Fixed an issue regarding the file extension of a downloaded workspace.

### *3.1.3 (06/16/2025)*
------------------------
- Fixed some issues around sharing workspaces
     - Can also unshare a workspace with someone from the share menu

### *3.1.2 (06/13/2025)*
------------------------
- Editor now purges old `queue` entries rather than letting them build up in Firebase, causing errors once a few thousand edits happen

### *3.1.1 (09/20/2023)*
------------------------
- Added user profile pictures!
    - Profile settings have moved to a new menu on the right-hand side, click the profile picture display in the top-right corner to access it.
    - Can set your username and profile picture from this menu.

### *3.1.0 (09/15/2023)*
------------------------
- Added ability to share workspaces with other users
    - Only the owner of a workspace can:
        - Add collaborators
        - Delete the workspace
    - All collaborators can:
        - Edit the content of the workspace
        - Change the workspace's language
- Shared workspaces are listed under a separate tab in the 'Join Workspace' menu.
- The 'Share Workspace' and 'Delete Workspace' menu options will only appear for the owner of the workspace.

### *3.0.1 (09/14/2023)*
------------------------
- We do a little bit of documentation.
- Can now toggle word wrap in the preferences window.
- Fixed some issues regarding text fields not being cleared after use.
- Properly handle a remote user deleting the current workspace.
- Can now set the language during workspace creation, instead of opening the preferences window and changing it after.

### *3.0.0 (09/09/2023)*
------------------------
- The major rewrite I intended for 2.0.0 to be.
- Migrated to using Cloud Firestore.
- Accounts are now a thing. Sign up with email/password.
    - Workspaces are tied to your account. Nobody else can touch them, in theory.
- Separated Join/Create Workspace UI
    - 'Join Workspace' modal shows a list of all your workspaces, sorted by most recently modified.
    - 'Create Workspace' modal is identical to the old UI.
- New theme functionality:
    - Toggle UI between light & dark themes
    - Set preferred colour schemes for light/dark modes.
    - Ability to match system light/dark mode.

### *2.0.5 (08/17/2023)*
------------------------
- Show workspace name in window title

### *2.0.4 (05/25/2023)*
------------------------
- Enable shell script support

### *2.0.3 (09/05/2022)*
------------------------
- Font size is configurable
- Bump Ace to 1.10.0
- Bug fixes
    - Checks for invalid characters in workspace id

### *2.0.2 (06/02/2022)*
------------------------
- Fixed missing font

### *2.0.1 (11/02/2020)*
------------------------
- Change my name to reflect the one I'm currently using.

### *2.0.0 (08/20/2020)*
------------------------
- Major rewrite of the editor.
- UI completely redesigned, with some retro elements.
- Password system removed. The code for that physically hurt to look at.
    - Might make a new password system in the future.
- Code cleaned up a whole lot. Still needs work.
- Name changed to "404-Editor" from "404Editor"

### *1.2.2 (08/14/2020)*
------------------------
- Fixed internal redirects to use the new subdomain *editor.the404.nl* instead of *the404.nl/editor*

### *1.2.1 (11/28/2018)*
------------------------
- Code has been documented (woohoo)
- Added ability to choose a new random key.
- Changed editor font style to suit my own personal preference.
- Removed various inefficiencies.

### *1.2.0 (11/20/2018)*
------------------------
- Separate buttons and popups for joining and creating workspaces.
- New workspaces generate with a random key, which is required when joining a workspace.
    - This can be changed under 'Preferences'
    - Share this key with people you want to access your workspace.
- Various under-the-hood updates.

### *1.1.0 (08/28/2018)*
------------------------
- UI completely redesigned to match new 404 colourscheme.
- Added modal boxes for various things.

### *1.0.2 (05/21/2018)*
------------------------
- Added ability to save file to local machine.

### *1.0.1 (05/17/2018)*
------------------------
- Added ability to delete workspaces.
- CSS fixes.

### *1.0.0 (05/15/2018)*
------------------------
- Initial release!
