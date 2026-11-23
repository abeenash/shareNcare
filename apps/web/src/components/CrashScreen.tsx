import Koinonia from "./Koinonia";

const CrashScreen = () => (
  <main className="grid min-h-screen place-items-center bg-base-200 p-6">
    <div className="card max-w-sm bg-base-100 shadow-xl">
      <div className="card-body items-center text-center">
        <Koinonia className="w-20" sparks={false} />
        <h1 className="card-title font-serif text-2xl">Something broke on this page</h1>
        <p>Your saved letters are safe. Reloading the page usually fixes it.</p>
        <button
          type="button"
          className="btn btn-primary mt-2"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    </div>
  </main>
);

export default CrashScreen;
