import markUrl from "../theme/sketchbench-mark.svg?url";

import "./SketchbenchLogo.scss";

/** Welcome-screen logo: the pencil set-square mark and a draughtsman wordmark. */
export const SketchbenchLogo = () => (
  <div className="sketchbench-logo">
    <img className="sketchbench-logo__mark" src={markUrl} alt="" />
    <div className="sketchbench-logo__text">
      <span className="sketchbench-logo__name">Sketchbench</span>
      <span className="sketchbench-logo__credit">built on Excalidraw</span>
    </div>
  </div>
);
