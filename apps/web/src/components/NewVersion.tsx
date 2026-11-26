import { useRegisterSW } from "virtual:pwa-register/react";

const NewVersion = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-box border border-primary/30 bg-base-200 p-4 shadow-lg"
    >
      <p className="min-w-0 flex-1 text-sm">A new version of ShareNCare is ready.</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => updateServiceWorker(true)}
        >
          Reload
        </button>
      </div>
    </div>
  );
};

export default NewVersion;
