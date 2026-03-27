export function India3DModelPanel() {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="panel-heading">3D India Network View</div>
        <div className="text-sm text-slate-400">
          National view of linked bank states using the provided India 3D model
        </div>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-line/70 bg-[radial-gradient(circle_at_top,rgba(89,167,255,0.16),transparent_38%),linear-gradient(180deg,rgba(3,11,25,0.4),rgba(3,11,25,0.92))] p-2">
        <model-viewer
          src="/models/india.glb"
          camera-controls
          auto-rotate
          rotation-per-second="8deg"
          shadow-intensity="1"
          exposure="1.05"
          environment-image="neutral"
          style={{ width: "100%", height: "460px", background: "transparent" }}
        ></model-viewer>
      </div>
      <div className="mt-4 text-sm text-slate-400">
        Rotate the model to present national fraud spread while the state and bank panels below explain anomaly ownership.
      </div>
    </div>
  );
}

