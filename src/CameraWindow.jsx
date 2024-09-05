import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
 
import OpenAI from 'openai';
import Webcam from 'react-webcam';
import imageCompression from 'browser-image-compression';

const CameraWindow = ({ onClose }) => {
  const [imageFile, setImageFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [question, setQuestion] = useState('what is this?');
  const [response, setResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);
  const openai = new OpenAI({ apiKey: 'your-api-key',dangerouslyAllowBrowser:true});

  const handleAskQuestion = async () => {
    if (!imageFile || question.trim() === '') {
      console.error('Image not uploaded or question is empty.');
      return;
    }
  
    try {
      setLoading(true);
      console.log('Compressing image...',imageFile);
      const compressedImage = await compressImage(imageFile);
      const imageBase64 = await toBase64(compressedImage);
      const imageU = `data:image/jpeg;base64,${imageBase64}`;
      console.log("imb64",imageBase64)
      console.log("IMUrl",imageU)  
      console.log('Asking question...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
      {
        role: "user",
        content: [
          { type: "text", text: question },
          {
            type: "image_url",
            image_url:
              {url:imageU},
          },
        ],
      },
    ],
      });
      await handleTextToSpeech(response.choices[0].message.content);
      // console.log(imageURL)
      console.log(response.choices[0]);
      console.log('Question result:', response.choices[0].message.content);
      setResponse(response.choices[0].message.content);
      setError(null);
  
      
      
    } catch (error) {
      console.error('Error asking question:', error);
      setError(error.message || 'Failed to ask question');
    } finally {
      setLoading(false);
    }
  };


  const compressImage = useMemo(() => async (imageFile) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 300,
      useWebWorker: true,
    };
    return await imageCompression(imageFile, options);
  }, []);

  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'captured.jpg', { type: 'image/jpeg' });
        setImageFile(file);
        setImageSrc(imageSrc);
        setUseCamera(false);
      });
  }, [webcamRef]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setImageSrc(URL.createObjectURL(file));
    console.log(URL.createObjectURL(file))
    return setImageSrc
  };

  const handleTextToSpeech = async (text) => {
    try {
      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
      });
      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioUrl = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mp3' }));
      setAudioUrl(audioUrl);
      console.log(`Audio URL: ${audioUrl}`);
    } catch (error) {
      console.error('Error generating TTS audio:', error);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onerror = (e) => {
        console.error('Failed to play audio:', e);
        alert('Failed to play audio. Please check the console for more details.');
      };
      audio.play();
    } else {
      alert('No audio available to play.');
    }
  };

  return (
    <div className="camera-window">
      <div className="camera-header">
        <span>Vision LLM</span>
        <button className="close-camera" onClick={onClose}>&times;</button>
      </div>
      <div className="camera-body">
        <button onClick={() => setUseCamera(!useCamera)}>
          {useCamera ? 'Cancel' : 'Use Camera'}
        </button>
        {useCamera && (
          <div className="webcam-container">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
            />
            <button onClick={capture}>Capture</button>
          </div>
        )}
        {imageSrc && (
          <div className="image-preview">
            <img src={imageSrc} alt="Preview" />
          </div>
        )}
        <input
          type="text"
          placeholder="Ask a question about the image..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="ask-btn" onClick={handleAskQuestion} disabled={loading}>
          {loading ? 'Loading...' : <><i className="fas fa-paper-plane"></i> Ask</>}
        </button>
        {error && (
          <div className="error-message">{error}</div>
        )}
        <div className="vision-response">
          {response && (
            <p>{response}</p>
          )}
          {audioUrl && (
            <button className="ask-btn" onClick={playAudio}>🔊</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraWindow;