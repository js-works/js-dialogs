dialogs.flow(async (dialog, abortSignal) => {
  const userId = 123; // dynamic ID

  // --- Step 1: Confirm editing (expected user flow) ---
  const confirmResult = await dialog.confirm({
    content: "Do you really want to edit your profile?"
  });

  if (!confirmResult.confirmed) {
    // Expected user cancellation
    return;
  }

  // --- Step 2: Load user profile ---
  let userProfile;
  try {
    const userProfileResult = await dialog.prepare((signal) =>
      loadUserProfile(userId, signal) // signal passed internally
    );

    if (!userProfileResult.ok) {
      // Expected error: profile could not be loaded
      await dialog.error({ content: "Could not load user profile." });
      return;
    }

    userProfile = userProfileResult.value;

  } catch (e) {
    // Unexpected error: network failure or other exception
    console.error("Unexpected error loading profile:", e);
    await dialog.error({ content: "Unexpected error occurred while loading profile." });
    return;
  }

  // --- Step 3: Input dialog with autotrim ---
  let result;
  try {
    result = await dialog.input({
      title: "Edit User",
      content: html`
        <ui-text-field
          name="username"
          label="Username"
          value=${userProfile.username}
          required
          autotrim
        ></ui-text-field>
        <ui-password-field
          name="password"
          label="Password"
          value=${userProfile.password}
          required
          autotrim
        ></ui-password-field>
      `
    });
  } catch (e) {
    // Unexpected error opening input dialog
    console.error("Unexpected error opening input dialog:", e);
    await dialog.error({ content: "Unexpected error occurred while opening input form." });
    return;
  }

  if (!result.confirmed) {
    // Expected user cancellation
    return;
  }

  // --- Step 4: Save changes ---
  try {
    await dialog.action(async (signal) => {
      await saveUserProfile(
        { id: userId, username: result.data.username, password: result.data.password },
        signal // signal passed internally
      );
    });

    // --- Step 5: Success feedback ---
    await dialog.success({ content: "User profile has been updated." });

  } catch (e) {
    // Unexpected error during save (network/server failure)
    console.error("Unexpected error saving profile:", e);
    await dialog.error({ content: "Could not save user profile due to an unexpected error." });
  }
});















/*
  Facts:
  - That `dialog` object make sure that only onle dialog triggered by one of its methods
    is open at the same time. Several `dialog` objects in other `run` flows can open
    additional dialogs, but that is usally a programming error then.
  - Inside of that run async closure the dialogs will be open and closed automatically.
  - Also spinners will be shown automatically.
  - The return type of `run` is Promise<void> and possible AbortErrors will be swollowed
    silently by design.
  - That `run` method is only a convenience method build on top of a similar `flow`
    method which does basically the same, but has a return type of Promise<T> and will
    not swallow AbortErrors.
  - `prepare` is basically for loading. `action` is basically for saving/updating.
    Both can return a valud (`action` for example could return the id of a newly
    created recordset).

  Open questions:
  - Are prepare and action dual. Means, should they behave basically the same regarding
    error handling and return types?
  - Should prepare and action return possible errors in their return value (result) or
    should they always throw on errors.
  - If prepare and action return possible error in their return value (result), shall
    this also be true for AbortErrors, or shall AbortErrors be thrown as an exception.
*/
function defineEditUserUseCase({ dialogs, userService }) {
  return async (userId) => dialogs.run(async (dialog, abortSignal) => {
    const confirmResult = await dialog.confirm({
      content: "Do you really want to edit your profile"
    })

    if (!confirmResult.confirmed) {
      return;
    }

    const userProfileResult = await dialog.prepare(() => {
      return userService.loadUserProfile(userId, abortSignal);
    });

    if (!userProfileResult.ok) {
      dialog.error({ content: 'Could not load user profile.' })
      return;
    }

    const userProfile = userProfileResult.value;

    const result = await dialog.input({
      title: "Edit user",

      content: html`
        <ui-text-field
          name="username"
          label="Username"
          value=${userProfile.username}
          required
        ></ui-text-field>
        <ui-password-field
          name="password"
          label="Password"
          value=${userProfile.password}
          required
        ></ui-password-field>
      `
    });

    if (result.confirmed) {
      try {
        await dialog.action(async () => {
          await userService.saveUserProfile(result.data);      
        });
        await dialog.success({
          content: "User data profile has been updated."
        })
      } catch (e) {
        await dialog.error({
          content: "Could not save user profile."
        });
      }
    }
  });
}














async function whatever() { // AbortErrors my be thrown
  const dialog = dialogs.createScope();
  const confirmResult = await dialog.confirm("Are you really sure that the file shall be deleted?");
  
  if (confirmResult.action === ConfirmAction.confirm) {
    const  actionResult = await dialog.action(() => {
      ....
    });
    
    if (actionResult.ok) {
      await dialog.success("File has been deleted successfully");   
    } else {
      await dialog.error("Could not delete file");
    }
  }
}


// basically sugar
const deleteFileUsecase = () => dialogs.run(dialog => { // AbortErrors will be ignored here in this closure - for cases where abortion is expected an fine - little flows
  const confirmResult = await dialog.confirm("Are you really sure that the file shall be deleted?");
  
  if (confirmResult.confirmed) {
    const  actionResult = await dialog.action(() => {
      ....
    });
  
    if (actionResult.ok) {
      await dialog.success("File has been deleted successfully");   
    } else {
      await dialog.error("Could not delete file");
    }
  }
});