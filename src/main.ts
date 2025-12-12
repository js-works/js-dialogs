import "./style.css";
import { html, DialogController } from "./core/dialogs-controller.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <button id="btn">Click me</button>
  </div>
`;

const dialogs = new DialogController();

document.querySelector<HTMLButtonElement>("#btn")!.onclick = () => {
  const dialogs = new DialogController();

  dialogs.info({
    title: "the title",
  });
};

dialogs.approve({
  title: "Warning",
  subtitle: "Deleting project",
  intro: html`<b>The following information is very important:</b>`,
  content: "Deleting the project cannot be undone!",
  outro: "Do you still want to delte the project?",
});
