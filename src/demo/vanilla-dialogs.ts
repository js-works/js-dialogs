import { createDialogsController } from '../main/core/dialog-controller.js';
import { DefaultIconsPlugin } from '../main/plugins/default-icons.js';

export { dialogs };

const dialogs = createDialogsController({
    plugins: [new DefaultIconsPlugin()]
});


