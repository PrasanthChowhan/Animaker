import { useState } from 'react';
import Dashboard from './components/Dashboard';
import MainEditor from './components/MainEditor';
import { AnimakerProject } from './types/project';
import { FeedbackButton } from './components/Feedback/FeedbackButton';

function App() {
  const [activeProject, setActiveProject] = useState<AnimakerProject | null>(null);

  const handleProjectSelect = (project: AnimakerProject) => {
    setActiveProject(project);
  };

  const handleBackToDashboard = () => {
    setActiveProject(null);
  };

  return (
    <div className="app-container">
      {activeProject ? (
        <MainEditor 
          project={activeProject} 
          onBackToDashboard={handleBackToDashboard} 
        />
      ) : (
        <Dashboard onProjectSelect={handleProjectSelect} />
      )}
      <FeedbackButton projectState={activeProject} />
    </div>
  );
}

export default App;
