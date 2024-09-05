import React, { useState } from 'react';
import ChatWindow from './ChatWindow';
import CameraWindow from './CameraWindow';
import AudioWindow from './AudioWindow';
import './App.css';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showAudio, setShowAudio] = useState(false);

  const handleSendChatMessage = async (message, sender) => {
    setMessages([...messages, { sender, message }]);
  };

  return (
    <div className="app">
      <div className="container">
        <div className="buttons">
          <button className="button mic" onClick={()=> setShowAudio(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-mic">
              <path d="M12 1a4 4 0 0 1 4 4v8a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <button className="button camera" onClick={() => setShowCamera(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-camera">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </button>
          <button className="button chat" onClick={() => setShowChat(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-message-square">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      </div>
      {showChat && (
        <ChatWindow
          messages={messages}
          onClose={() => setShowChat(false)}
          onSend={handleSendChatMessage}
        />
      )}
      {showCamera && (
        <CameraWindow
          onClose={() => setShowCamera(false)}
          setMessages={setMessages}
        />
      )}
      {showAudio && (
        <AudioWindow
        onClose={()=> setShowAudio(false)}
        setMessages={setMessages}
        />
      )}
    </div>
  );
};

export default App;
