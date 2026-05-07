const dialog = dialogs.single();

const userProfileResult = await dialog.prepare(()) => {
  return loadUserProfile(...);
});

if (!userProfileResult.ok) {
  dialog.error({ content: 'Could not load user profile.' })
  return;
}

const result = await dialog.input({
  .... useProfile ...
});

if (result.ok) {
  try {
    await dialog.action(async () => {
      await saveUserProfile(result.data);      
    });
    await dialog.success({ content: "User data profile has been updated." })
  } catch (e) {
    await dialog.error({ content: "Could not save user profile."});
  }
}
