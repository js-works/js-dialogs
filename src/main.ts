import "./style.css";
import { html, DialogController } from "./core/dialogs-controller.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div id="column-1">
    <button id="btn-info">Info dialog</button>
    <button id="btn-success">Success dialog</button>
    <button id="btn-warn">Warn dialog</button>
    <button id="btn-error">Error dialog</button>
    <button id="btn-confirm">Confirm dialog</button>
    <button id="btn-approve">Approve dialog</button>
    <button id="btn-prompt">Prompt dialog</button>
  </div>
`;

const dialogs = new DialogController({});

document.querySelector<HTMLButtonElement>("#btn-info")!.onclick = async () => {
  const result = await dialogs.info({
    title: "Welcome",
    content: "Hello, Jane Doe!",
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>("#btn-success")!.onclick =
  async () => {
    const result = await dialogs.success({
      title: "Success",
      content: "Hello, Jane Doe!",
    });

    console.log(result);
  };

document.querySelector<HTMLButtonElement>("#btn-warn")!.onclick = async () => {
  const result = await dialogs.warn({
    title: "Warning",
    content: "Hello, Jane Doe!",
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>("#btn-error")!.onclick = async () => {
  const result = await dialogs.error({
    title: "Error",
    content: "Hello, Jane Doe!",
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>("#btn-confirm")!.onclick =
  async () => {
    const result = await dialogs.confirm({
      title: "Welcome",
      content: "Hello, Jane Doe!",
    });

    console.log(result);
  };

document.querySelector<HTMLButtonElement>("#btn-approve")!.onclick =
  async () => {
    const result = await dialogs.approve({
      title: "Welcome",
      content: "Hello, Jane Doe!",
    });

    console.log(result);
  };

document.querySelector<HTMLButtonElement>("#btn-prompt")!.onclick =
  async () => {
    const result = await dialogs.prompt({
      title: "Welcome",
      content: "Hello, Jane Doe!",
      label: "Please enter your name",
    });

    console.log(result);
  };
