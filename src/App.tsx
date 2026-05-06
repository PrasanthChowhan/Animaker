import { useState } from "react";
import { ProjectManager } from "./components/ProjectManager/ProjectManager";
import { Editor } from "./components/Editor/Editor";
import { Project } from "./types/project";
import { FeedbackButton } from "./components/Feedback/FeedbackButton";
import "./App.css";

function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  return (
    <div className="app-container">
      {currentProject ? (
        <Editor
          project={currentProject}
          onBack={() => setCurrentProject(null)}
        />
      ) : (
        <ProjectManager
          onOpenProject={(project) => setCurrentProject(project)}
        />
      )}
      <FeedbackButton />
    </div>
  );
}

export default App;
