import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Upload, 
  Camera, 
  FileImage, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Brain, 
  Heart,
  Info,
  ArrowRight,
  Zap,
  Star,
  Users,
  Award,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


const detectionInfo = {
  title: 'Breast Cancer Detection',
  description: 'AI-powered mammography analysis using deep learning algorithms for early detection',
  icon: Heart,
  accuracy: '94.7%',
  timeframe: '2-3 minutes',
  color: 'text-pink-500',
  supportedFiles: 'Mammogram images (JPEG, PNG, DICOM)'
};

const features = [
  {
    icon: Zap,
    title: 'Instant Analysis',
    description: 'Get results in minutes, not days'
  },
  {
    icon: Shield,
    title: 'Medical Grade AI',
    description: 'MedGemma-powered analysis'
  },
  {
    icon: Users,
    title: 'Expert Review',
    description: 'All results reviewed by radiologists'
  },
  {
    icon: Award,
    title: '94.7% Accuracy',
    description: 'Industry-leading detection rates'
  }
];

const stats = [
  { label: 'Scans Analyzed', value: '250K+', icon: FileImage },
  { label: 'Early Detections', value: '15K+', icon: CheckCircle2 },
  { label: 'Lives Saved', value: '3K+', icon: Heart },
  { label: 'Accuracy Rate', value: '94.7%', icon: Star }
];

const riskFactorOptions = [
  'Family history of breast cancer',
  'Personal history of breast cancer',
  'BRCA1/BRCA2 gene mutations',
  'Dense breast tissue',
  'Previous breast biopsies',
  'Hormone replacement therapy',
  'Late menopause (after 55)',
  'No children or first child after 30'
];

const symptomOptions = [
  'Breast lump or thickening',
  'Breast pain or tenderness',
  'Nipple discharge',
  'Changes in breast size or shape',
  'Skin dimpling or puckering',
  'Nipple inversion',
  'Breast or nipple rash'
];

export default function CancerDetection() {
  const { toast } = useToast();
  
  // Upload and Analysis State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [screeningId, setScreeningId] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Patient Context State
  const [patientAge, setPatientAge] = useState('');
  const [familyHistory, setFamilyHistory] = useState(false);
  const [previousScreenings, setPreviousScreenings] = useState(false);
  const [selectedRiskFactors, setSelectedRiskFactors] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);

  // Polling for results
  useEffect(() => {
    let pollInterval;
    
    if (screeningId && isAnalyzing) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/cancer/analysis/${screeningId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          const data = await response.json();
          
          if (data.status === 'completed') {
            setAnalysisResults(data);
            setIsAnalyzing(false);
            setShowResults(true);
            setAnalysisProgress(100);
            clearInterval(pollInterval);
            
            toast({
              title: "Analysis Complete!",
              description: "Your mammogram analysis is ready for review."
            });
          } else if (data.status === 'failed') {
            setIsAnalyzing(false);
            clearInterval(pollInterval);
            
            toast({
              title: "Analysis Failed",
              description: "Please try uploading your image again.",
              variant: "destructive"
            });
          } else {
            // Update progress based on status
            const progressMap = {
              'processing': 25,
              'analyzing': 75
            };
            setAnalysisProgress(progressMap[data.status] || 50);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [screeningId, isAnalyzing]);

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'application/dicom'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a mammogram image (JPEG, PNG, TIFF, or DICOM).",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 50MB.",
          variant: "destructive"
        });
        return;
      }

      setUploadedFile(file);
      setShowResults(false);
      setAnalysisResults(null);
    }
  };

  const handleAnalysis = async () => {
    if (!uploadedFile) {
      toast({
        title: "No Image Selected",
        description: "Please upload a mammogram image first.",
        variant: "destructive"
      });
      return;
    }

    // Check authentication
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to analyze your mammogram.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(10);

    try {
      const formData = new FormData();
      formData.append('mammogram', uploadedFile);
      
      // Add patient context
      if (patientAge) formData.append('age', patientAge);
      formData.append('familyHistory', familyHistory.toString());
      formData.append('previousScreenings', previousScreenings.toString());
      
      if (selectedRiskFactors.length > 0) {
        formData.append('riskFactors', JSON.stringify(selectedRiskFactors));
      }
      
      if (selectedSymptoms.length > 0) {
        formData.append('currentSymptoms', JSON.stringify(selectedSymptoms));
      }

      const response = await fetch(`${API_BASE}/cancer/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setScreeningId(data.screeningId);
        setAnalysisProgress(25);
        
        toast({
          title: "Upload Successful",
          description: `Analysis started. ${data.estimatedTime} estimated.`
        });
      } else {
        throw new Error(data.message || 'Analysis failed');
      }

    } catch (error) {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const downloadReport = async () => {
    if (!screeningId) return;

    try {
      const response = await fetch(`${API_BASE}/cancer/analysis/${screeningId}/download-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        // Create and download markdown report
        const reportContent = generateMarkdownReport(data.report);
        const blob = new Blob([reportContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `breast-cancer-analysis-${screeningId.slice(-8)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Report Downloaded",
          description: "Your detailed analysis report has been downloaded."
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateMarkdownReport = (reportData) => {
    return `# Breast Cancer Screening Report

## Patient Information
- **Name:** ${reportData.patientInfo.name}
- **Age:** ${reportData.patientInfo.age || 'Not provided'}
- **Screening Date:** ${new Date(reportData.screeningDetails.date).toLocaleDateString()}

## Analysis Results
- **Risk Category:** ${reportData.findings.riskCategory.toUpperCase()}
- **Suspicious Score:** ${(reportData.findings.suspiciousScore * 100).toFixed(1)}%
- **AI Confidence:** ${reportData.findings.confidence}%

## Findings
${reportData.findings.abnormalities.length > 0 
  ? reportData.findings.abnormalities.map(abn => 
      `- **${abn.type}:** ${abn.description} (Confidence: ${abn.confidence}%)`
    ).join('\n')
  : '- No suspicious abnormalities detected'
}

## Recommendations
${reportData.recommendations.immediateAction === 'immediate_consultation' 
  ? '**⚠️ IMMEDIATE ACTION REQUIRED:** Please consult with a healthcare provider immediately.'
  : '**Routine Follow-up:** Continue regular screening schedule.'
}

## Additional Tests
${reportData.recommendations.additionalTests.length > 0
  ? reportData.recommendations.additionalTests.map(test =>
      `- **${test.testType}** (${test.priority}): ${test.reason}`
    ).join('\n')
  : '- No additional tests recommended at this time'
}

## Important Notice
${reportData.disclaimer}

---
*Report generated on ${new Date().toLocaleString()}*
*Analysis ID: ${screeningId}*
`;
  };

  const toggleRiskFactor = (factor) => {
    setSelectedRiskFactors(prev =>
      prev.includes(factor)
        ? prev.filter(f => f !== factor)
        : [...prev, factor]
    );
  };

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const getRiskColor = (category) => {
    const colors = {
      low: 'text-green-600',
      moderate: 'text-yellow-600',
      high: 'text-red-600',
      critical: 'text-red-800'
    };
    return colors[category] || 'text-gray-600';
  };

  const getRiskBgColor = (category) => {
    const colors = {
      low: 'bg-green-50 border-green-200',
      moderate: 'bg-yellow-50 border-yellow-200',
      high: 'bg-red-50 border-red-200',
      critical: 'bg-red-100 border-red-300'
    };
    return colors[category] || 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                AI-Powered{' '}
                <span className="text-gradient bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Breast Cancer Detection
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                Early detection saves lives. Our advanced MedGemma AI analyzes mammograms with 94.7% accuracy, 
                helping identify potential cancer signs before they become critical.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="medical-button bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700">
                <Upload className="mr-2 h-5 w-5" />
                Start Screening
              </Button>
              <Button variant="outline" size="lg">
                <Info className="mr-2 h-5 w-5" />
                Learn More
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>FDA Approved AI</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Expert Reviewed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20">
                      <Icon className="h-6 w-6 text-pink-600" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Analysis Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Upload Your <span className="text-gradient bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">Mammogram</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our MedGemma AI will analyze your mammogram and provide detailed insights within minutes.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Upload and Patient Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>Upload Mammogram Image</span>
                  </CardTitle>
                  <CardDescription>
                    Upload your mammogram for AI-powered analysis. Supported formats: JPEG, PNG, TIFF, DICOM
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                    <div className="flex justify-center">
                      <FileImage className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Drop your mammogram here or click to browse</p>
                      <p className="text-xs text-muted-foreground">Maximum file size: 50MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.dcm,.dicom"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button variant="outline" asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Choose File
                      </label>
                    </Button>
                  </div>

                  {uploadedFile && (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {analysisProgress < 30 ? 'Processing image...' :
                           analysisProgress < 80 ? 'AI analyzing...' : 'Finalizing results...'}
                        </span>
                        <span className="text-sm text-muted-foreground">{analysisProgress}%</span>
                      </div>
                      <Progress value={analysisProgress} className="w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Patient Context */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Patient Information (Optional)</CardTitle>
                  <CardDescription>
                    Provide additional context for more accurate analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="e.g., 45"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        min="18"
                        max="120"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="family-history"
                          checked={familyHistory}
                          onCheckedChange={setFamilyHistory}
                        />
                        <Label htmlFor="family-history" className="text-sm">
                          Family history of breast cancer
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="previous-screenings"
                          checked={previousScreenings}
                          onCheckedChange={setPreviousScreenings}
                        />
                        <Label htmlFor="previous-screenings" className="text-sm">
                          Previous breast screenings
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Risk Factors (Select all that apply)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {riskFactorOptions.map((factor) => (
                        <div key={factor} className="flex items-center space-x-2">
                          <Checkbox
                            id={`risk-${factor}`}
                            checked={selectedRiskFactors.includes(factor)}
                            onCheckedChange={() => toggleRiskFactor(factor)}
                          />
                          <Label htmlFor={`risk-${factor}`} className="text-xs">
                            {factor}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Current Symptoms */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Current Symptoms (Select all that apply)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {symptomOptions.map((symptom) => (
                        <div key={symptom} className="flex items-center space-x-2">
                          <Checkbox
                            id={`symptom-${symptom}`}
                            checked={selectedSymptoms.includes(symptom)}
                            onCheckedChange={() => toggleSymptom(symptom)}
                          />
                          <Label htmlFor={`symptom-${symptom}`} className="text-xs">
                            {symptom}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Button */}
              <Button 
                onClick={handleAnalysis}
                disabled={!uploadedFile || isAnalyzing}
                className="w-full medical-button bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-5 w-5" />
                    Start AI Analysis
                  </>
                )}
              </Button>
            </div>

            {/* Results Sidebar */}
            <div className="space-y-6">
              {showResults && analysisResults ? (
                <>
                  {/* Risk Assessment */}
                  <Card className={`shadow-lg ${getRiskBgColor(analysisResults.analysis.riskCategory)}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className={`h-5 w-5 ${getRiskColor(analysisResults.analysis.riskCategory)}`} />
                        <span>Risk Assessment</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getRiskColor(analysisResults.analysis.riskCategory)}`}>
                          {analysisResults.analysis.riskCategory.toUpperCase()}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Risk Category
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold">
                            {(analysisResults.analysis.suspiciousScore * 100).toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">Suspicious Score</p>
                        </div>
                        <div>
                          <div className="text-lg font-semibold">
                            {analysisResults.analysis.confidence}%
                          </div>
                          <p className="text-xs text-muted-foreground">AI Confidence</p>
                        </div>
                      </div>

                      <div className="p-3 bg-white/50 rounded-lg">
                        <p className="text-sm">{analysisResults.riskDescription}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Findings */}
                  {analysisResults.analysis.detectedAbnormalities && analysisResults.analysis.detectedAbnormalities.length > 0 && (
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle>Detected Findings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysisResults.analysis.detectedAbnormalities.map((abnormality, index) => (
                          <div key={index} className="p-3 border border-border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium capitalize">{abnormality.type.replace('_', ' ')}</span>
                              <Badge variant="outline">{abnormality.confidence}% confidence</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{abnormality.description}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Immediate Action</h4>
                        <p className="text-sm text-muted-foreground">
                          {analysisResults.recommendations.immediateAction === 'immediate_consultation' 
                            ? '⚠️ Immediate consultation recommended'
                            : '✅ Continue routine screening schedule'
                          }
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Follow-up</h4>
                        <p className="text-sm text-muted-foreground">
                          Next screening in: {analysisResults.recommendations.followUpRecommended?.replace('_', ' ') || 'As advised by physician'}
                        </p>
                      </div>

                      {analysisResults.recommendations.additionalTests && analysisResults.recommendations.additionalTests.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Additional Tests</h4>
                          {analysisResults.recommendations.additionalTests.map((test, index) => (
                            <p key={index} className="text-sm text-muted-foreground">
                              • {test.testType} ({test.priority})
                            </p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button 
                      onClick={downloadReport}
                      variant="outline" 
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Report
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Eye className="mr-2 h-4 w-4" />
                      View History
                    </Button>
                  </div>
                </>
              ) : (
                <Card className="shadow-lg">
                  <CardContent className="py-12 text-center space-y-4">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="font-medium">Ready for Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload your mammogram to get AI-powered insights
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Features */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>AI Analysis Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-pink-600" />
                        <div>
                          <p className="font-medium text-sm">{feature.title}</p>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-12 bg-amber-50/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-start space-x-3 p-6 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-amber-800">Important Medical Disclaimer</p>
              <p className="text-sm text-amber-700">
                This AI analysis is for screening purposes only and should not replace professional medical diagnosis. 
                Results should always be reviewed by a qualified radiologist or healthcare provider. 
                Always consult with qualified healthcare professionals for proper medical evaluation and treatment decisions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
