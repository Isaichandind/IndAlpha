import { useState, useEffect } from 'react';
import { X, Key, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [model, setModel] = useState('gemini-3.1-pro-preview');
  const [apiKey, setApiKey] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [theme, setTheme] = useState('oled');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedModel = localStorage.getItem('gemini_model');
      if (savedModel) {
        setModel(savedModel);
      }
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) {
        setApiKey(savedKey);
      }
      const savedBackend = localStorage.getItem('backend_url');
      if (savedBackend) {
        setBackendUrl(savedBackend);
      }
      const savedTheme = localStorage.getItem('app_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('gemini_model', model);
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    if (backendUrl.trim()) {
      localStorage.setItem('backend_url', backendUrl.trim());
    } else {
      localStorage.removeItem('backend_url');
    }
    localStorage.setItem('app_theme', theme);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-indalpha-card rounded-2xl border border-indalpha-border shadow-2xl max-w-md w-full overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-indalpha-border bg-indalpha-card">
          <h3 className="font-bold text-indalpha-text flex items-center gap-2">
            <Key className="w-5 h-5 text-indalpha-green" />
            Application Settings
          </h3>
          <button 
            onClick={onClose}
            className="text-indalpha-muted hover:text-indalpha-text transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-indalpha-text flex items-center gap-2">
              Gemini Model
              <ExternalLink className="w-4 h-4 text-emerald-500" />
            </label>
            <p className="text-xs text-indalpha-muted leading-relaxed">
              Select the AI model for the analysis engine.
            </p>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); setIsSaved(false); }}
                className="w-full bg-indalpha-dark border border-indalpha-border rounded-lg px-4 py-2.5 text-indalpha-text focus:outline-none focus:border-indalpha-green focus:ring-1 focus:ring-indalpha-green text-sm appearance-none"
              >
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Latest & Recommended)</option>
                <option value="gemini-3.1-flash-preview">Gemini 3.1 Flash Preview (Faster)</option>
                <option value="gemini-3.0-pro">Gemini 3.0 Pro</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-indalpha-text flex items-center gap-2">
              Gemini API Key
              <ExternalLink className="w-4 h-4 text-emerald-500" />
            </label>
            <p className="text-xs text-indalpha-muted leading-relaxed">
              Your API key is stored locally in your browser and is never sent to our servers. 
              Get one from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indalpha-green hover:underline">Google AI Studio</a>.
            </p>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setIsSaved(false); }}
                placeholder="AIzaSy..."
                className="w-full bg-indalpha-dark border border-indalpha-border rounded-lg px-4 py-2.5 text-indalpha-text focus:outline-none focus:border-indalpha-green focus:ring-1 focus:ring-indalpha-green text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-indalpha-text flex items-center gap-2">
              Backend API URL
              <ExternalLink className="w-4 h-4 text-emerald-500" />
            </label>
            <p className="text-xs text-indalpha-muted leading-relaxed">
              If your app is deployed to GitHub Pages without a backend, paste your deployed Render/Vercel URL here to connect it. (e.g., https://indalpha.onrender.com/api)
            </p>
            <div className="relative">
              <input
                type="url"
                value={backendUrl}
                onChange={(e) => { setBackendUrl(e.target.value); setIsSaved(false); }}
                placeholder="https://your-backend-url.onrender.com/api"
                className="w-full bg-indalpha-dark border border-indalpha-border rounded-lg px-4 py-2.5 text-indalpha-text focus:outline-none focus:border-indalpha-green focus:ring-1 focus:ring-indalpha-green text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-indalpha-text flex items-center gap-2">
              Appearance Theme
            </label>
            <p className="text-xs text-indalpha-muted leading-relaxed">
              Select a professional theme.
            </p>
            <div className="relative">
              <select
                value={theme}
                onChange={(e) => { 
                  setTheme(e.target.value); 
                  document.documentElement.setAttribute('data-theme', e.target.value);
                  setIsSaved(false); 
                }}
                className="w-full bg-indalpha-dark border border-indalpha-border rounded-lg px-4 py-2.5 text-indalpha-text focus:outline-none focus:border-indalpha-green focus:ring-1 focus:ring-indalpha-green text-sm appearance-none"
              >
                <option value="oled">OLED Black (Zero Carbon / Power Saving)</option>
                <option value="forest">Forest Green (Eco Friendly)</option>
                <option value="ocean">Deep Ocean (Dark Professional)</option>
                <option value="light">Soft Light (Eye Friendly)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-indalpha-border">
            <button
              onClick={handleSave}
              className={`flex-1 py-2.5 rounded-lg font-bold transition-all ${
                isSaved 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-indalpha-green text-black hover:bg-emerald-400'
              }`}
            >
              {isSaved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
