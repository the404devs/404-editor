# 404-Editor

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


- TODO:
    - Create icon
    - Password reset UI

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
