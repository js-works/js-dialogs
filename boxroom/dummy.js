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





async function editUser({ dialogs, userService, userId }) {
  using scope = dialogs.createScope();

  const confirmResult = await scope.confirm({
    content: "Edit user profile?"
  });

  if (confirmResult.canceled) return;

  const profile = await scope.query(() =>
    userService.loadUserProfile(userId)
  );

  if (!profile.ok) {
    await scope.error({ content: "Could not load user." });
    return;
  }

  const form = await scope.form({
    title: "Edit user",
    initialValue: profile.value,

    render: (state) => html`
      <ui-text-field
        name="username"
        value=${state.values.username}
        error=${state.fieldErrors.username}
      />

      <ui-password-field
        name="password"
        value=${state.values.password}
        error=${state.fieldErrors.password}
      />

      ${state.errorMessage
      ? html`<ui-alert>${state.errorMessage}</ui-alert>`
      : ""
    }
    `
  });

  // no break, no continue
  for await (const submission of form) {

    if (submission.cancelled) {
      return; // user exited interaction
    }

    const result = await scope.command(() =>
      userService.saveUserProfile({
        userId,
        ...submission.value
      })
    );

    // SUCCESS → terminal state
    if (result.ok) {
      await scope.success({
        content: "User updated."
      });

      return;
    }

    // FAILURE → feed errors back into form, loop continues automatically
    form.setErrors(mapErrors(result.error));
  }
}









export type CancelReason =
| "user"        // explicit cancel button (confirm/prompt only)
| "escape"      // ESC key
| "backdrop"    // clicked outside dialog
| "timeout"     // time-based expiration
| "abort";      // scope/route/unmount/lifecycle teardown


// -----------------------------
// Confirm (binary gate)
// -----------------------------
export type ConfirmResult =
| {
  canceled: false;
}
| {
  canceled: true;
  reason: CancelReason;
};


// -----------------------------
// Choose (multi-action decision)
// -----------------------------
export type ChooseResult<TAction extends string> =
| {
  canceled: false;
  action: TAction;
}
| {
  canceled: true;
  reason: CancelReason;
};









type InteractionResult<T> =
| {
  canceled: false;
  value: T;
}
| {
  canceled: true;
  reason: CancelReason;
};




type ConfirmResult = InteractionResult<void>;

type ChooseResult<TAction extends string> =
  InteractionResult<TAction>;






//////////////////////////////
// Cancellation semantics
//////////////////////////////

export type CancelReason =
| "user"        // explicit cancel button
| "escape"      // ESC key
| "backdrop"    // click outside
| "timeout"     // time-based expiry
//  no "aboort" !!!! | "abort";      // scope/route/unmount teardown


//////////////////////////////
// Core result primitive
//////////////////////////////

export type InteractionResult<T> =
| {
  canceled: false;
  value: T;
}
| {
  canceled: true;
  reason: CancelReason;
};


//////////////////////////////
// Confirm (binary gate, no payload)
//////////////////////////////

export type ConfirmResult =
| {
  canceled: false;
}
| {
  canceled: true;
  reason: CancelReason;
};


//////////////////////////////
// Info (acknowledgement only)
//////////////////////////////

export type InfoResult = ConfirmResult;


//////////////////////////////
// Choose (multi-action decision)
//////////////////////////////

export type ChooseResult<TAction extends string> = InteractionResult<TAction>;


//////////////////////////////
// Prompt (single value input)
//////////////////////////////

export type PromptResult<T = string> = InteractionResult<T>;


//////////////////////////////
// Generic dialog (action + optional data)
//////////////////////////////

export type DialogResult<
TAction extends string,
  TData = void
  > =
| {
  canceled: false;
  action: TAction;
  data: TData;
}
| {
  canceled: true;
  reason: CancelReason;
};


//////////////////////////////
// Optional convenience alias
//////////////////////////////

export type YesNoCancelResult = ChooseResult<"yes" | "no">;





//////////////////////////////
// 1. Scope lifecycle (NOT part of dialog results)
//////////////////////////////

export type CancelReason =
| "user"
| "escape"
| "backdrop"
| "timeout";


//////////////////////////////
// 2. Core primitive (single-value interactions)
//////////////////////////////

export type InteractionResult<T> =
| {
  canceled: false;
  value: T;
}
| {
  canceled: true;
  reason: CancelReason;
};


//////////////////////////////
// 3. Confirm (no payload)
//////////////////////////////

export type ConfirmResult =
| {
  canceled: false;
}
| {
  canceled: true;
  reason: CancelReason;
};


//////////////////////////////
// 4. Choose (action selection)
//////////////////////////////

export type ChooseResult<TAction extends string> =
  InteractionResult<TAction>;


//////////////////////////////
// 5. Prompt (input value)
//////////////////////////////

export type PromptResult<T = string> =
  InteractionResult<T>;


//////////////////////////////
// 6. Composite dialog (action + data)
//////////////////////////////

export type DialogResult<
TAction extends string,
  TData
  > =
| {
  canceled: false;
  action: TAction;
  data: TData;
}
| {
  canceled: true;
  reason: CancelReason;
};


//////////////////////////////
// 7. Info (side effect only)
//////////////////////////////

export type InfoResult = void;


//////////////////////////////
// 8. Convenience alias example
//////////////////////////////

export type YesNoResult = ChooseResult<"yes" | "no">;







































type State =
  | { kind: "BUSY" }
  | { kind: "DIALOG_IDLE"; dialog: DialogController }
  | { kind: "DIALOG_BUSY"; dialog: DialogController };

type ConfirmOptions = {
  title: string;
  content: string;
};

interface DialogController {
  open(): void;
  close(): void;
  setBusy(busy: boolean): void;
  onConfirm(cb: () => void): void;
  onCancel(cb: () => void): void;
}

interface DialogRuntime {
  showSpinner(): void;
  hideSpinner(): void;
  createDialog(opts: ConfirmOptions): DialogController;
}

/**
 * Single-dialog serialized execution scope
 */
class DialogScope {
  private state: State = { kind: "BUSY" };

  private queue: Promise<void> = Promise.resolve();

  constructor(private runtime: DialogRuntime) {}

  // ----------------------------
  // Public API
  // ----------------------------

  run<T>(fn: () => Promise<T>): Promise<T> {
    return this.enqueue(fn);
  }

  confirm(opts: ConfirmOptions): Promise<boolean> {
    return this.enqueue(() => this._confirm(opts));
  }

  // ----------------------------
  // Core serialization
  // ----------------------------

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn);
    this.queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  // ----------------------------
  // Confirm implementation
  // ----------------------------

  private async _confirm(opts: ConfirmOptions): Promise<boolean> {
    this.setState({ kind: "BUSY" });

    const dialog = this.runtime.createDialog(opts);

    this.setState({ kind: "DIALOG_IDLE", dialog });

    return new Promise<boolean>((resolve) => {
      dialog.onCancel(() => {
        dialog.close();
        this.setState({ kind: "BUSY" });
        resolve(false);
      });

      dialog.onConfirm(async () => {
        this.setState({ kind: "DIALOG_BUSY", dialog });

        // here is where async “commit work” would run if needed
        // (kept minimal: just simulate lifecycle)

        try {
          resolve(true);
        } finally {
          dialog.close();
          this.setState({ kind: "BUSY" });
        }
      });

      dialog.open();
    });
  }

  // ----------------------------
  // State machine transitions
  // ----------------------------

  private setState(next: State) {
    this.state = next;

    switch (next.kind) {
      case "BUSY":
        this.runtime.showSpinner();
        break;

      case "DIALOG_IDLE":
        this.runtime.hideSpinner();
        next.dialog.setBusy(false);
        break;

      case "DIALOG_BUSY":
        this.runtime.hideSpinner();
        next.dialog.setBusy(true);
        break;
    }
  }
}

// ----------------------------
// Public entry (using-style helper)
// ----------------------------

export async function usingScope<T>(
  runtime: DialogRuntime,
  fn: (scope: DialogScope) => Promise<T>
): Promise<T> {
  const scope = new DialogScope(runtime);

  try {
    return await fn(scope);
  } finally {
    // hard cleanup guarantee
    scope["setState"]?.({ kind: "BUSY" } as any);
  }
}




























type DialogResult<T> = {
  canceled: boolean;
  value?: T;
  meta: {
    closedBy: 'confirm' | 'escape' | 'backdrop' | 'programmatic' | 'timeout';
    openedAt: number;
    closedAt: number;
    cancelReason?: string;
  };
};