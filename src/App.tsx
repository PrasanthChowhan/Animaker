import { useState } from 'react';
import Dashboard from './components/Dashboard';
import MainEditor from './components/MainEditor';
import { AnimakerProject } from './types/project';

function App() {
  const [activeProject, setActiveProject] = useState<AnimakerProject | null>(null);

  const handleProjectSelect = (project: AnimakerProject) => {
    setActiveProject(project);
  };

  const handleBackToDashboard = () => {
    setActiveProject(null);
  };

  return (
    <div className="App">
      {activeProject ? (
        <MainEditor 
          project={activeProject} 
          onBackToDashboard={handleBackToDashboard} 
        />
      ) : (
        <Dashboard onProjectSelect={handleProjectSelect} />
      )}
    </div>
  );
}

export default App;
