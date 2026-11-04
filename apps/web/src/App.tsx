import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import AppLayout from "./components/AppLayout";
import Loader from "./components/Loader";
import RequireAuth from "./components/RequireAuth";
import AuthPage from "./pages/AuthPage";
import CreatePage from "./pages/CreatePage";
import HomePage from "./pages/HomePage";
import NoteEditPage from "./pages/NoteEditPage";
import NoteReadPage from "./pages/NoteReadPage";
import PrivacyPage from "./pages/PrivacyPage";
import TrashPage from "./pages/TrashPage";

const SharedLetterPage = lazy(() => import("./pages/SharedLetterPage"));

const App = () => {
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24
      [background:radial-gradient(125%_125%_at_50%_10%,#000_60%,#023E8A_100%)]"
      />
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route
          path="/s/:token"
          element={
            <Suspense fallback={<Loader />}>
              <SharedLetterPage />
            </Suspense>
          }
        />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/note/:id" element={<NoteReadPage />} />
            <Route path="/note/:id/edit" element={<NoteEditPage />} />
            <Route path="/trash" element={<TrashPage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
};

export default App;
