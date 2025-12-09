import "./style.css";
import { DialogController } from "./core/dialogs-controller.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <button id="btn">Click me</button>
  </div>
`;

const dialogs = new DialogController();

dialogs.info({
  title: "the title",
});

document.querySelector<HTMLButtonElement>("#btn")!.onclick = () => {
  const dialogs = new DialogController();

  dialogs.info({
    title: "the title",
  });
};
