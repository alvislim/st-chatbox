import React from 'react';
import './App.css';
import ChatWidget from './components/ChatWidget';

const App: React.FC = () => {
  return (
    <div className="App">
      <div className="landing-page">
        <h1>OWASP Security Knowledge Base</h1>
        <p>Your AI-powered assistant for API security and OWASP best practices.</p>
        <div className="features">
          <div className="feature-card">
            <h3>OWASP Top 10</h3>
            <p>Learn about the top API security risks identified by OWASP in 2023.</p>
          </div>
          <div className="feature-card">
            <h3>AI-Powered</h3>
            <p>Powered by Google Gemini for intelligent, context-aware responses.</p>
          </div>
          <div className="feature-card">
            <h3>RAG Enhanced</h3>
            <p>Retrieval-Augmented Generation for accurate, source-backed answers.</p>
          </div>
        </div>
        <p className="cta">Click the chat button in the bottom-right to get started →</p>
      </div>
      <ChatWidget />
    </div>
  );
};

export default App;
