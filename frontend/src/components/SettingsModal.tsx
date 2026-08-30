import { useState, useEffect } from 'react';
import { X, Key, Shield, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.1-pro-preview');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('gemini_api_key');
      const savedModel = localStorage.getItem('gemini_model');
      if (savedKey) {
        setApiKey(savedKey);
      }
      if (savedModel) {
        setModel(savedModel);
      }
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('gemini_model', model);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setIsSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#1c2236] rounded-2xl border border-[#2d3748] shadow-2xl max-w-md w-full overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-[#2d3748] bg-[#161b2b]">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indalpha-green" />
            Application Settings
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              Gemini API Key
              <Shield className="w-4 h-4 text-emerald-500" />
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Required for the AI Engine (Level 2 Analysis). Your key is stored locally in your browser and is only sent directly to the AI service. We never store it on our servers.
            </p>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setIsSaved(false); }}
                placeholder="AIzaSy..."
                className="w-full bg-[#111520] border border-[#2d3748] rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indalpha-green focus:ring-1 focus:ring-indalpha-green font-mono text-sm"
              />
            </div>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indalpha-green hover:underline"
            >
              Get a free API key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              Gemini Model
              <ExternalLink className="w-4 h-4 text-emerald-500" />
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select the AI model for the analysis engine.
            </p>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); setIsSaved(false); }}
                className="w-full bg-[#111520] border border-[#2d3748] rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indalpha-green focus:ring-1 focus:ring-indalpha-green text-sm appearance-none"
              >
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Latest & Recommended)</option>
                <option value="gemini-3.1-flash-preview">Gemini 3.1 Flash Preview (Faster)</option>
                <option value="gemini-3.0-pro">Gemini 3.0 Pro</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-[#2d3748]">
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
            {apiKey && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 rounded-lg font-semibold text-slate-400 bg-[#252d43] hover:bg-[#2d3748] hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
