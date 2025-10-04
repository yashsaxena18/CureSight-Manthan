import { useState } from 'react';
import { 
  Search, 
  Pill, 
  Leaf, 
  Beaker, 
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ShoppingCart,
  ExternalLink,
  Loader2,
  Bot
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

interface SystemDetails {
  name: string;
  dosage: string;
  mechanism: string;
  sideEffects: string[];
  effectiveness: string;
  cost: string;
  duration: string;
  pros: string[];
  cons: string[];
  purchaseLinks?: PurchaseLink[];
}

interface PurchaseLink {
  platform: string;
  category: string;
  url: string;
  directLink: string;
  price: string;
  availability: string;
}

interface MedicineComparison {
  medicine: string;
  condition: string;
  allopathic: SystemDetails;
  ayurvedic: SystemDetails;
  homeopathic: SystemDetails;
  aiInsights: {
    bestFor: string;
    warnings: string[];
    recommendations: string[];
  };
  disclaimer: string;
}

export default function MedicineComparison() {
  const [searchTerm, setSearchTerm] = useState('');
  const [comparison, setComparison] = useState<MedicineComparison | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    const toastDiv = document.createElement('div');
    toastDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
      variant === 'destructive' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
    toastDiv.innerHTML = `
      <div class="font-medium">${title}</div>
      <div class="text-sm">${description}</div>
    `;
    document.body.appendChild(toastDiv);
    
    // Add animation
    setTimeout(() => toastDiv.classList.add('translate-x-0'), 100);
    
    setTimeout(() => {
      toastDiv.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => document.body.removeChild(toastDiv), 300);
    }, 3000);
  };

  // 🤖 AI-powered medicine search
  const searchMedicine = async (medicineName?: string) => {
    const term = medicineName || searchTerm;

    if (!term.trim()) {
      showToast("Enter a medicine name", "Please enter a medicine name to get AI-powered comparison.", "destructive");
      return;
    }

    setIsSearching(true);
    setSearchError('');
    
    try {
      console.log(`🤖 AI searching for: ${term}`);
      
      const response = await fetch(`${API_BASE}/medicine-comparison/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicineName: term.trim()
        })
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setComparison(data.data);
        showToast("AI Analysis Complete! 🤖", `Found comprehensive comparison for ${term}`);
        setSearchError('');
      } else {
        throw new Error(data.message || 'Failed to get AI comparison');
      }
      
    } catch (error) {
      console.error('❌ AI search error:', error);
      setSearchError(`AI analysis failed for "${term}". Please try again or check your spelling.`);
      setComparison(null);
      showToast("AI Search Failed", `Could not analyze "${term}". Please try again.`, "destructive");
    } finally {
      setIsSearching(false);
    }
  };

  const getSystemIcon = (system: string) => {
    switch (system) {
      case 'allopathic': return <Beaker className="h-5 w-5 text-blue-600" />;
      case 'ayurvedic': return <Leaf className="h-5 w-5 text-green-600" />;
      case 'homeopathic': return <Zap className="h-5 w-5 text-purple-600" />;
      default: return <Pill className="h-5 w-5" />;
    }
  };

  const getSystemColor = (system: string) => {
    switch (system) {
      case 'allopathic': return 'from-blue-50 to-blue-25';
      case 'ayurvedic': return 'from-green-50 to-green-25';
      case 'homeopathic': return 'from-purple-50 to-purple-25';
      default: return 'from-gray-50 to-gray-25';
    }
  };

  const getEffectivenessColor = (percentage: string) => {
    const num = parseInt(percentage);
    if (num >= 80) return 'text-green-600';
    if (num >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 🛒 Purchase links component
  const PurchaseLinks = ({ links }: { links: PurchaseLink[] }) => {
    if (!links || links.length === 0) return null;

    return (
      <div className="mt-4 p-3 bg-white/80 rounded-lg border">
        <h5 className="text-sm font-semibold mb-2 flex items-center">
          <ShoppingCart className="h-4 w-4 mr-1" />
          Purchase Options
        </h5>
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="font-medium">{link.platform}</span>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">{link.price}</span>
                <a 
                  href={link.directLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  onClick={() => showToast("Redirecting", `Opening ${link.platform}...`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Buy
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 animate-pulse">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            AI Medicine <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Comparison</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            🤖 AI-powered medicine analysis across Allopathic, Ayurvedic, and Homeopathic systems with real-time purchase links.
          </p>
        </div>

        {/* AI Search Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-2 border-blue-100">
          <div className="flex items-center space-x-3 mb-4">
            <Bot className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">AI Medicine Analyzer</h2>
          </div>
          
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Enter any medicine name (e.g., Paracetamol, Aspirin, Omeprazole)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMedicine()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              disabled={isSearching}
            />
            <button 
              onClick={() => searchMedicine()}
              disabled={isSearching}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 disabled:opacity-50 font-medium transition-all duration-200 flex items-center space-x-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>AI Analyzing...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Analyze with AI</span>
                </>
              )}
            </button>
          </div>

          {searchError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium">AI Analysis Error</p>
                  <p className="text-sm">{searchError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">✨ AI can analyze any medicine:</p>
            <div className="text-xs text-gray-600">
              Try: Paracetamol, Aspirin, Omeprazole, Metformin, Atorvastatin, Lisinopril, or any other medicine name
            </div>
          </div>
        </div>

        {/* AI Comparison Results */}
        {comparison ? (
          <div className="space-y-8">
            {/* AI Insights Header */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
              <div className="flex items-center space-x-3 mb-4">
                <Bot className="h-8 w-8 text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold">
                    AI Analysis: <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">{comparison.medicine}</span>
                  </h2>
                  <p className="text-gray-600">Condition: {comparison.condition}</p>
                </div>
              </div>
              
              {/* AI Insights */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/80 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🎯 Best For</h4>
                  <p className="text-sm text-gray-700">{comparison.aiInsights.bestFor}</p>
                </div>
                <div className="bg-white/80 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">⚠️ Warnings</h4>
                  <ul className="text-sm text-gray-700">
                    {comparison.aiInsights.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/80 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">💡 AI Recommendations</h4>
                  <ul className="text-sm text-gray-700">
                    {comparison.aiInsights.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Three Systems Comparison */}
            <div className="grid lg:grid-cols-3 gap-6">
              {(['allopathic', 'ayurvedic', 'homeopathic'] as const).map((system) => {
                const details = comparison[system];
                return (
                  <div key={system} className={`bg-gradient-to-br ${getSystemColor(system)} rounded-lg shadow-lg border-2 p-6 transform transition-all duration-300 hover:scale-105`}>
                    <div className="flex items-center space-x-3 mb-4">
                      {getSystemIcon(system)}
                      <h3 className="capitalize text-xl font-bold">{system}</h3>
                    </div>
                    
                    <p className="font-medium text-gray-700 mb-4">{details.name}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-white/70 rounded-lg">
                        <p className={`text-2xl font-bold ${getEffectivenessColor(details.effectiveness)}`}>
                          {details.effectiveness}
                        </p>
                        <p className="text-xs text-gray-600">Effectiveness</p>
                      </div>
                      <div className="text-center p-3 bg-white/70 rounded-lg">
                        <p className="text-2xl font-bold text-gray-800">{details.cost}</p>
                        <p className="text-xs text-gray-600">Cost Range</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <p><strong>Dosage:</strong> {details.dosage}</p>
                      <p><strong>Duration:</strong> {details.duration}</p>
                      <p><strong>How it works:</strong> {details.mechanism}</p>
                    </div>

                    {/* Pros */}
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-green-700 mb-1">Pros:</h4>
                      {details.pros.map((pro, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5" />
                          <p>{pro}</p>
                        </div>
                      ))}
                    </div>

                    {/* Cons */}
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-red-700 mb-1">Cons:</h4>
                      {details.cons.map((con, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs">
                          <XCircle className="h-3 w-3 text-red-600 mt-0.5" />
                          <p>{con}</p>
                        </div>
                      ))}
                    </div>

                    {/* Side Effects */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">Side Effects:</h4>
                      {details.sideEffects.map((effect, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs">
                          <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5" />
                          <p>{effect}</p>
                        </div>
                      ))}
                    </div>

                    {/* 🛒 Purchase Links */}
                    <PurchaseLinks links={details.purchaseLinks || []} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Bot className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Ready for AI Analysis</h3>
            <p className="text-gray-600">Enter any medicine name above and get instant AI-powered comparison across all medical systems.</p>
            <p className="text-sm text-blue-500 mt-2">🤖 Powered by Advanced AI • Real-time Analysis • Purchase Links Included</p>
          </div>
        )}

        {/* Enhanced Disclaimer */}
        <div className="mt-12 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">🤖 AI-Generated Medical Information</p>
              <p className="text-sm text-yellow-700 mt-1">
                This comparison is generated by AI for informational purposes only. Always consult qualified healthcare providers before starting, stopping, or changing medications. AI analysis should supplement, not replace, professional medical advice.
              </p>
              {comparison && (
                <p className="text-xs text-yellow-600 mt-2">
                  {comparison.disclaimer}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
