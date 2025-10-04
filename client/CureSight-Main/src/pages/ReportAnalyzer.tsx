import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Brain, 
  Download, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Heart,
  Activity,
  Zap,
  Shield,
  FileImage,
  File,
  X
} from 'lucide-react';

export default function ReportAnalyzer() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  
  // Backend proxy status (Groq runs on server). We assume backend handles the key.
  const isApiKeyPresent = true;

  const reportTypes = [
    { id: 'blood', name: 'Blood Test Report', icon: Heart, color: 'text-red-500' },
    { id: 'urine', name: 'Urine Test Report', icon: Activity, color: 'text-yellow-500' },
    { id: 'ecg', name: 'ECG Report', icon: TrendingUp, color: 'text-green-500' },
    { id: 'xray', name: 'X-Ray Report', icon: FileImage, color: 'text-blue-500' },
    { id: 'mri', name: 'MRI Report', icon: Brain, color: 'text-purple-500' },
    { id: 'ct', name: 'CT Scan Report', icon: Shield, color: 'text-indigo-500' },
    { id: 'general', name: 'General Health Report', icon: FileText, color: 'text-gray-500' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'text/plain'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Function to read file content based on type
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          resolve(`File: ${file.name} (${file.type}) - ${(file.size / 1024).toFixed(2)} KB`);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        // For PDF, we'll just include file info since we can't extract text easily in browser
        resolve(`PDF Report: ${file.name} - Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      } else if (file.type.startsWith('image/')) {
        // For images, include file info
        resolve(`Medical Image: ${file.name} - Type: ${file.type} - Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const analyzeReports = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one report file.');
      return;
    }

    setIsAnalyzing(true);
    setShowResults(false);
    setAnalysisProgress(0);

    try {
      // Progress simulation for UX
      setAnalysisProgress(15);

      // Send files to backend for OCR + Groq analysis
      const form = new FormData();
      uploadedFiles.forEach((file) => form.append('files', file));

      setAnalysisProgress(40);

      let response = await fetch('/api/analyze', { method: 'POST', body: form });

      setAnalysisProgress(80);

      console.log('Backend Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few minutes.');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key on server.');
        } else if (response.status === 400) {
          throw new Error('Bad request. Please upload valid files.');
        } else if (response.status === 503) {
          // brief client-side retry once for temporary outages
          await new Promise(r => setTimeout(r, 500));
          response = await fetch('/api/analyze', { method: 'POST', body: form });
          if (!response.ok) {
            throw new Error('Service temporarily unavailable. Model may be overloaded.');
          }
        }
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      setAnalysisProgress(100);
      
      console.log('Backend analysis Response:', data);
      
      const analysisMarkdown = data.markdown || data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis could not be completed. Please try again.';
      
      setAnalysisResults({ 
        markdown: analysisMarkdown,
        timestamp: new Date().toISOString(),
        filesAnalyzed: uploadedFiles.map(f => f.name)
      });
      setShowResults(true);

    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisProgress(100);
      
      // Show error message and fallback to demo
      let errorMessage = 'Analysis failed. ';
      if (error instanceof Error) {
        errorMessage += error.message;
      }
      
      alert(errorMessage + ' Showing demo analysis instead.');
      
      // Fallback demo analysis
      const demoAnalysis = `# Medical Report Analysis

## Executive Summary
Based on the uploaded medical reports, here is a comprehensive analysis of your health status.

**Overall Health Status:** Under Review  
**Risk Level:** To be determined based on actual report values  
**Key Areas:** Detailed analysis requires report content review

## Key Findings

### Uploaded Reports Analysis
${uploadedFiles.map(file => `- **${file.name}**: ${file.type} (${(file.size / 1024 / 1024).toFixed(2)} MB)`).join('\n')}

### Important Notes
- Real-time analysis requires successful API connection
- Report content analysis depends on file format and readability
- Multiple report types provide comprehensive health overview

## Health Parameters Analysis

### Blood Work (if applicable)
- Parameters to monitor: CBC, lipid profile, glucose levels
- Reference ranges comparison needed
- Trend analysis over time recommended

### Diagnostic Imaging (if applicable)  
- Structural assessment from imaging reports
- Comparison with previous studies important
- Radiologist recommendations to follow

## Risk Assessment

**Current Status:** Pending detailed analysis
- **Low Risk:** Routine monitoring parameters
- **Moderate Risk:** Values requiring attention
- **High Risk:** Immediate medical consultation needed

## Recommendations

### Immediate Actions
- 📋 **Consult Healthcare Provider**: Discuss all reports with your doctor
- 🔄 **Follow-up Tests**: Schedule as recommended by physician
- 📊 **Track Trends**: Monitor key parameters over time

### Lifestyle Modifications
- 🥗 **Nutrition**: Balanced diet rich in nutrients
- 🏃‍♂️ **Exercise**: Regular physical activity as appropriate
- 😴 **Sleep**: Maintain consistent sleep schedule
- 💧 **Hydration**: Adequate daily water intake

### Medical Follow-up
- 📅 **Regular Checkups**: As per healthcare provider schedule
- 🩺 **Specialist Consultations**: If referred by primary physician
- 📈 **Health Monitoring**: Keep track of vital signs and symptoms

## Conclusion

This analysis serves as a preliminary review. The uploaded reports require detailed medical interpretation by qualified healthcare professionals. 

**⚠️ Important:** 
- This AI analysis is for informational purposes only
- Always consult qualified healthcare providers for medical decisions
- Do not use this analysis as a substitute for professional medical advice
- Seek immediate medical attention for any concerning symptoms

---

*Analysis generated on ${new Date().toLocaleString()}*  
*Files analyzed: ${uploadedFiles.length} report(s)*`;

      setAnalysisResults({ 
        markdown: demoAnalysis,
        timestamp: new Date().toISOString(),
        filesAnalyzed: uploadedFiles.map(f => f.name),
        isDemo: true
      });
      setShowResults(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadReport = () => {
    if (!analysisResults) return;
    
    const reportData = {
      analysis: analysisResults.markdown,
      metadata: {
        generatedAt: analysisResults.timestamp || new Date().toISOString(),
        filesAnalyzed: analysisResults.filesAnalyzed || [],
        isDemo: analysisResults.isDemo || false,
        version: '1.0'
      }
    };
    
    // Download as markdown file
    const blob = new Blob([analysisResults.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-analysis-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                <ArrowLeft className="h-5 w-5" />
                Back to Home
              </Button>
              <h1 className="text-2xl font-bold text-slate-900">AI Health Report Analyzer</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Brain className="w-4 h-4" />
              Powered by Google Gemini
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Upload className="w-6 h-6 text-blue-600" />
                  Upload Your Medical Reports
                </CardTitle>
                <CardDescription>
                  Upload your medical reports for AI-powered analysis and personalized health insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Drop your medical files here</h3>
                  <p className="text-slate-600 mb-4">
                    Supported formats: PDF, JPG, PNG, TXT (Max 10MB per file)
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload">
                    <Button asChild>
                      <span>Choose Files</span>
                    </Button>
                  </Label>
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900">Uploaded Files ({uploadedFiles.length})</h4>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <File className="w-5 h-5 text-slate-600" />
                            <div>
                              <p className="font-medium text-slate-900">{file.name}</p>
                              <p className="text-sm text-slate-600">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={isAnalyzing}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis Progress */}
                {isAnalyzing && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-900">
                        {analysisProgress < 30 ? 'Reading files...' :
                         analysisProgress < 50 ? 'Preparing analysis...' :
                         analysisProgress < 80 ? 'AI processing...' : 'Finalizing results...'}
                      </span>
                      <span className="text-sm text-slate-600">{analysisProgress}%</span>
                    </div>
                    <Progress value={analysisProgress} className="w-full" />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={analyzeReports}
                    disabled={uploadedFiles.length === 0 || isAnalyzing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isAnalyzing ? (
                      <>
                        <Brain className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                  {analysisResults && (
                    <Button 
                      variant="outline" 
                      onClick={downloadReport}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {showResults && analysisResults && (
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Brain className="w-6 h-6 text-green-600" />
                      AI Analysis Results
                      {analysisResults.isDemo && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Demo</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(analysisResults.timestamp).toLocaleString()}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Comprehensive AI-powered analysis of your medical reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700">
                    <ReactMarkdown>{analysisResults.markdown}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* API Status */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-500" />
                  AI Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex items-center gap-2 ${isApiKeyPresent ? 'text-green-600' : 'text-red-600'}`}>
                  {isApiKeyPresent ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span className="text-sm">
                    {isApiKeyPresent ? 'Google Gemini Ready' : 'API Key Missing'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Model: gemini-1.5-flash-latest
                </p>
                {!isApiKeyPresent && (
                  <p className="text-xs text-red-600 mt-1">
                    Please check your .env file
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Report Types */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">Supported Report Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div key={type.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Icon className={`w-5 h-5 ${type.color}`} />
                      <span className="text-sm font-medium text-slate-900">{type.name}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* AI Features */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">AI Analysis Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-700">Parameter Analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-700">Risk Assessment</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-700">Health Recommendations</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-700">Lifestyle Guidance</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-700">Follow-up Suggestions</span>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="shadow-lg border-0 bg-blue-50/90 backdrop-blur-sm border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700">
                  Your medical data is processed securely and is not stored permanently. Analysis is performed in real-time.
                </p>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="shadow-lg border-0 bg-amber-50/90 backdrop-blur-sm border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Medical Disclaimer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-700">
                  This AI analysis is for informational purposes only and should not replace professional medical advice. Always consult qualified healthcare providers for medical decisions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}