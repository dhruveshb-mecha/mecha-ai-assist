import React, { useState, useEffect } from 'react';
import OpenAI from 'openai';

const ChatWindow = ({ messages, onClose, onSend }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [audioUrls, setAudioUrls] = useState({});
  const [loadingTTS, setLoadingTTS] = useState({});
  const openai = new OpenAI({ apiKey: 'your-api-key', dangerouslyAllowBrowser: true });

  const handleSendMessage = async () => {
    if (inputMessage.trim() !== '') {
      onSend(inputMessage, 'You');
      const completion = await openaicall(inputMessage);
      const aiMessage = completion.choices[0].message.content;
      onSend(aiMessage, 'AI');
      setInputMessage('');
      handleTextToSpeech(aiMessage, messages.length);  
    }
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

  const formatCode = (content) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    const result = [];
  
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      
      if (match.index > lastIndex) {
        result.push(content.slice(lastIndex, match.index));
      }
  
      const language = match[1] || '';
      const code = match[2].trim();
      result.push(
        <div key={match.index} className="code-block">
          {language && <div className="code-language">{language}</div>}
          <pre>
            <code>{code}</code>
          </pre>
          <button className="copy-btn" onClick={() => navigator.clipboard.writeText(code)}>
            Copy
          </button>
        </div>
      );
  
      lastIndex = codeBlockRegex.lastIndex;
    }
  
    if (lastIndex < content.length) {
      result.push(content.slice(lastIndex));
    }
  
    return result;
  };
  
  const FormattedMessage = ({ message }) => {
    const formattedContent = formatCode(message);
    
    return (
      <div className="formatted-message">
        {formattedContent.map((item, index) => {
          if (typeof item === 'string') {
            const lines = item.split(/(\n.*|\d+\.\s*\*\*.*?\*\*)/).filter(Boolean);
            return lines.map((line, lineIndex) => {
              const sectionTitle = formatSectionTitle(line);
              const subsectionTitle = formatSubsectionTitle(line);
              if (sectionTitle) {
                return <React.Fragment key={`${index}-${lineIndex}`}>{sectionTitle}</React.Fragment>;
              } else if (subsectionTitle) {
                return <React.Fragment key={`${index}-${lineIndex}`}>{subsectionTitle}</React.Fragment>;
              } else if (/^\d+\.\s*\*\*.*?\*\*$/.test(line)) {
                const [number, content] = line.split(/\s*(\*\*.*?\*\*)$/);
                return (
                  <React.Fragment key={`${index}-${lineIndex}`}>
                    <span className="list-number">{number}</span>
                    <span className="list-content">{formatLine(content)}</span>
                  </React.Fragment>
                );
              } else {
                return <span key={`${index}-${lineIndex}`} className="list-content">{formatLine(line)}</span>;
              }
            });
          } else {
            return item; 
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
    console.log(completion.choices[0]);
    console.log(completion);
    console.log(completion.choices[0].message.content);
    return completion;
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <span>AI Chat</span>
        <button className="close-chat" onClick={onClose}>&times;</button>
      </div>
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
                )}
              </>
            ) : (
              msg.message
            )}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type your message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="send-btn" onClick={handleSendMessage}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-send">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;