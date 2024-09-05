import React, { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';

const AudioWindow = ({ onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [audioUrls, setAudioUrls] = useState({});
  const [loadingTTS, setLoadingTTS] = useState({});
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const openai = new OpenAI({ apiKey: 'your-api-key', dangerouslyAllowBrowser: true });

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      setError(null);
      setSuccess(false);
    } catch (err) {
      setError('Error accessing microphone. Please check your permissions.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');

      const response = await openai.audio.transcriptions.create({
        file: formData.get('file'),
        model: 'whisper-1',
      });

      if (response.text) {
        setTranscription(response.text);
        setSuccess(true);
        setError(null);
      } else {
        throw new Error('No transcription text found.');
      }
    } catch (err) {
      setError(`Error transcribing audio: ${err.message}`);
      setSuccess(false);
    }
  };

  const handleSendMessage = async () => {
    if (transcription.trim() !== '') {
      const userMessage = { sender: 'You', message: transcription };
      setMessages(prevMessages => [...prevMessages, userMessage]);
      
      const completion = await openaicall(transcription);
      const aiMessage = { sender: 'AI', message: completion.choices[0].message.content };
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      
      handleTextToSpeech(aiMessage.message, messages.length);
      setTranscription('');
      setSuccess(true);
    }
  };

  const formatLine = (line) => {
    const boldPattern = /\*\*(.*?)\*\*/g;
    const parts = line.split(boldPattern);
    return parts.map((part, index) => 
      index % 2 === 0 ? part : <strong key={index}>{part}</strong>
    );
  };
  
  const formatSectionTitle = (line) => {
    if (line.trim().startsWith('###') && !line.trim().startsWith('####')) {
      return <h3 className="section-title">{line.replace('###', '').trim()}</h3>;
    }
    return null;
  };
  
  const formatSubsectionTitle = (line) => {
    if (line.trim().startsWith('####')) {
      return <h4 className="subsection-title">{line.replace('####', '').trim()}</h4>;
    }
    return null;
  };
  
  const FormattedMessage = ({ message }) => {
    const lines = message.split(/(\n.*|\d+\.\s*\*\*.*?\*\*)/).filter(Boolean);
    
    return (
      <div className="formatted-message">
        {lines.map((line, index) => {
          const sectionTitle = formatSectionTitle(line);
          const subsectionTitle = formatSubsectionTitle(line);
          if (sectionTitle) {
            return <React.Fragment key={index}>{sectionTitle}</React.Fragment>;
          } else if (subsectionTitle) {
            return <React.Fragment key={index}>{subsectionTitle}</React.Fragment>;
          } else if (/^\d+\.\s*\*\*.*?\*\*$/.test(line)) {
            const [number, content] = line.split(/\s*(\*\*.*?\*\*)$/);
            return (
              <React.Fragment key={index}>
                <span className="list-number">{number}</span>
                <span className="list-content">{formatLine(content)}</span>
              </React.Fragment>
            );
          } else {
            return <span key={index} className="list-content">{formatLine(line)}</span>;
          }
        })}
      </div>
    );
  };

  const openaicall = async (message) => {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are Mecha Assist on a Mecha Comet M which is an embedded device but very modern. It has a screen, mic, speaker and camera all built-in, so help people according to this. Keep in mind you are on a Mecha Comet M and you are Mecha Assist." },
        { role: 'user', content: message },
      ],
      model: "gpt-4o-mini",
    });
    return completion;
  };

  const handleTextToSpeech = async (text, messageIndex) => {
    setLoadingTTS(prev => ({ ...prev, [messageIndex]: true }));
    try {
      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
      });
      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioUrl = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mp3' }));
      setAudioUrls(prev => ({ ...prev, [messageIndex]: audioUrl }));
      console.log(`Audio URL for message ${messageIndex}: ${audioUrl}`);
    } catch (error) {
      console.error('Error generating TTS audio:', error);
    } finally {
      setLoadingTTS(prev => ({ ...prev, [messageIndex]: false }));
    }
  };

  const playAudio = (url) => {
    if (url) {
      const audio = new Audio(url);
      audio.onerror = (e) => {
        console.error('Failed to play audio:', e);
        alert('Failed to play audio. Please check the console for more details.');
      };
      audio.play();
    } else {
      alert('No audio available to play.');
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isListening]);

  return (
    <div className="camera-window">
      <div className="camera-header">
        <span>Speech to Text</span>
        <button className="close-audio" onClick={onClose}>&times;</button>
      </div>
      <div className="camera-body">
        <button 
          className={`mic-button ${isListening ? 'listening' : ''}`} 
          onClick={isListening ? stopListening : startListening}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
        <p>{isListening ? 'Listening...' : 'Click the microphone to start'}</p>
        {error && <p className="error-message">{error}</p>}
        {success && !error && <p className="success-message">Transcription successful!</p>}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender === 'You' ? 'sent' : 'received'}`}>
              <strong>{msg.sender}:</strong>
              {msg.sender === 'AI' ? (
                <>
                  <FormattedMessage message={msg.message} />
                  {loadingTTS[index] ? (
                  <span className="loading-tts">Loading TTS...</span>
                ) : audioUrls[index] ? (
                  <button className="tts-btn" onClick={() => playAudio(audioUrls[index])}>🔊</button>
                ) : (
                  <button className="tts-btn" onClick={() => handleTextToSpeech(msg.message, index)}>Generate TTS</button>
                ) }
                </>
              ) : (
                <span>{msg.message}</span>
              )}
            </div>
          ))}
        </div>
        <div className="transcription">
          <input
            type="text"
            placeholder="Transcription will appear here..."
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
          />
          <button className="send-btn" onClick={handleSendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioWindow;
