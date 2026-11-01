import { Route, Routes } from "react-router";
import AppLayout from "./components/AppLayout";
import RequireAuth from "./components/RequireAuth";
import AuthPage from "./pages/AuthPage";
import CreatePage from "./pages/CreatePage";
import HomePage from "./pages/HomePage";
import NoteDetailPage from "./pages/NoteDetailPage";
import PrivacyPage from "./pages/PrivacyPage";
import TrashPage from "./pages/TrashPage";

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
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/note/:id" element={<NoteDetailPage />} />
            <Route path="/trash" element={<TrashPage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
};

export default App;
