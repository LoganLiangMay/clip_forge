import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Save, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [serpApiKey, setSerpApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showSerpApiKey, setShowSerpApiKey] = useState(false);

  // Load existing API keys when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings.openai_api_key) setOpenaiKey(settings.openai_api_key);
      if (settings.serpapi_key) setSerpApiKey(settings.serpapi_key);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveMessage('');

    try {
      await window.electronAPI.saveSettings({
        openai_api_key: openaiKey,
        serpapi_key: serpApiKey,
      });

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => {
        setSaveMessage('');
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-2xl shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Section Header */}
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
              <Key className="w-5 h-5" />
              AI B-roll API Keys
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure your API keys to enable AI-powered B-roll generation
            </p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showOpenaiKey ? "text" : "password"}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const pastedText = e.clipboardData.getData('text');
                  setOpenaiKey(pastedText);
                }}
                onKeyDown={(e) => {
                  // Handle Cmd+V / Ctrl+V manually
                  if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                    e.preventDefault();
                    navigator.clipboard.readText().then(text => {
                      setOpenaiKey(text);
                    }).catch(err => {
                      console.error('Failed to read clipboard:', err);
                    });
                  }
                }}
                placeholder="sk-..."
                className="w-full px-4 py-2 pr-10 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded transition-colors"
                tabIndex={-1}
              >
                {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Get your key at{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400 inline-flex items-center gap-1"
              >
                platform.openai.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* SerpAPI Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              SerpAPI Key
            </label>
            <div className="relative">
              <input
                type={showSerpApiKey ? "text" : "password"}
                value={serpApiKey}
                onChange={(e) => setSerpApiKey(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const pastedText = e.clipboardData.getData('text');
                  setSerpApiKey(pastedText);
                }}
                onKeyDown={(e) => {
                  // Handle Cmd+V / Ctrl+V manually
                  if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                    e.preventDefault();
                    navigator.clipboard.readText().then(text => {
                      setSerpApiKey(text);
                    }).catch(err => {
                      console.error('Failed to read clipboard:', err);
                    });
                  }
                }}
                placeholder="..."
                className="w-full px-4 py-2 pr-10 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={() => setShowSerpApiKey(!showSerpApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded transition-colors"
                tabIndex={-1}
              >
                {showSerpApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Get your key at{' '}
              <a
                href="https://serpapi.com/manage-api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400 inline-flex items-center gap-1"
              >
                serpapi.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              saveMessage.includes('success')
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            )}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-secondary rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || (!openaiKey && !serpApiKey)}
            className={cn(
              "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2",
              "disabled:bg-gray-600 disabled:cursor-not-allowed"
            )}
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
