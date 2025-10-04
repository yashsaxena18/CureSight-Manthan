import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Stethoscope, 
  Clock, 
  User, 
  Search,
  Brain,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Download,
  History,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const commonSymptoms = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Dizziness',
  'Chest Pain', 'Shortness of Breath', 'Abdominal Pain', 'Back Pain',
  'Joint Pain', 'Skin Rash', 'Sore Throat', 'Loss of Appetite',
  'Muscle Pain', 'Vomiting', 'Diarrhea', 'Constipation', 'Bloating',
  'Heartburn', 'Difficulty Sleeping', 'Memory Problems', 'Anxiety',
  'Depression', 'Vision Problems', 'Hearing Problems', 'Tingling',
  'Numbness', 'Weakness', 'Palpitations', 'Swelling', 'Weight Loss',
  'Weight Gain', 'Hair Loss', 'Dry Skin', 'Itching', 'Bruising'
];

const urgencyLevels = {
  low: { 
    color: 'bg-green-50 border-green-200 text-green-800', 
    icon: CheckCircle2,
    description: 'Monitor symptoms, consider seeing a doctor if they persist' 
  },
  medium: { 
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800', 
    icon: Clock,
    description: 'Schedule an appointment with your doctor within a few days' 
  },
  high: { 
    color: 'bg-red-50 border-red-200 text-red-800', 
    icon: AlertTriangle,
    description: 'Seek medical attention within 24 hours' 
  },
  critical: { 
    color: 'bg-red-100 border-red-300 text-red-900', 
    icon: XCircle,
    description: 'Seek immediate emergency medical care' 
  }
};

export default function SymptomChecker() {
  const { toast } = useToast();
  
  // Form state
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [duration, setDuration] = useState({ value: '', unit: 'days' });
  const [severity, setSeverity] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  // Patient context
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // History state
  const [symptomHistory, setSymptomHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load symptom history on mount
  useEffect(() => {
    loadSymptomHistory();
  }, []);

  // Polling for analysis results
  useEffect(() => {
    let pollInterval;
    
    if (sessionId && isAnalyzing) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/symptoms/analysis/${sessionId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          const data = await response.json();
          
          if (data.status === 'completed') {
            setAnalysis(data);
            setIsAnalyzing(false);
            setShowResults(true);
            setAnalysisProgress(100);
            clearInterval(pollInterval);
            
            toast({
              title: "Analysis Complete!",
              description: "Your symptom analysis is ready for review."
            });

            // Refresh history
            loadSymptomHistory();
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, isAnalyzing]);

  const loadSymptomHistory = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;

      const response = await fetch(`${API_BASE}/symptoms/history?limit=5`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSymptomHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load symptom history:', error);
    }
  };

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev => {
      const isSelected = prev.some(s => s.name === symptom);
      if (isSelected) {
        return prev.filter(s => s.name !== symptom);
      } else {
        return [...prev, { name: symptom, severity: 5 }];
      }
    });
  };

  const updateSymptomSeverity = (symptomName, severity) => {
    setSelectedSymptoms(prev =>
      prev.map(s => s.name === symptomName ? { ...s, severity: parseInt(severity) } : s)
    );
  };

  const analyzeSymptoms = async () => {
    if (selectedSymptoms.length === 0) {
      toast({
        title: "No symptoms selected",
        description: "Please select at least one symptom to analyze.",
        variant: "destructive"
      });
      return;
    }

    if (!severity) {
      toast({
        title: "Missing severity",
        description: "Please rate your overall symptom severity.",
        variant: "destructive"
      });
      return;
    }

    // Check authentication
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to analyze your symptoms.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setShowResults(false);

    try {
      // Prepare analysis data
      const analysisData = {
        symptoms: {
          selected: selectedSymptoms,
          duration: {
            value: duration.value ? parseInt(duration.value) : undefined,
            unit: duration.unit
          },
          severity: parseInt(severity),
          additionalInfo
        },
        patientContext: {
          ...(patientAge && { age: parseInt(patientAge) }),
          ...(patientGender && { gender: patientGender }),
          ...(medicalHistory && { 
            medicalHistory: medicalHistory.split(',').map(h => h.trim()).filter(h => h) 
          }),
          ...(currentMedications && { 
            currentMedications: currentMedications.split(',').map(m => m.trim()).filter(m => m) 
          })
        }
      };

      setAnalysisProgress(30);

      const response = await fetch(`${API_BASE}/symptoms/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      });

      const result = await response.json();

      if (response.ok) {
        setSessionId(result.sessionId);
        setAnalysisProgress(50);
        
        toast({
          title: "Analysis Started",
          description: `AI analysis in progress. ${result.estimatedTime} estimated.`
        });
      } else {
        throw new Error(result.message || 'Analysis failed');
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

  const submitFeedback = async (helpful, accuracy = null, comments = '') => {
    try {
      const authToken = localStorage.getItem('authToken');
      await fetch(`${API_BASE}/symptoms/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          helpful,
          accuracy,
          comments
        })
      });

      toast({
        title: "Feedback Submitted",
        description: "Thank you for helping improve our AI analysis!"
      });
    } catch (error) {
      console.error('Feedback submission error:', error);
    }
  };

  const clearForm = () => {
    setSelectedSymptoms([]);
    setDuration({ value: '', unit: 'days' });
    setSeverity('');
    setAdditionalInfo('');
    setPatientAge('');
    setPatientGender('');
    setMedicalHistory('');
    setCurrentMedications('');
    setAnalysis(null);
    setShowResults(false);
    setSessionId(null);
  };

  const getUrgencyConfig = (level) => {
    return urgencyLevels[level] || urgencyLevels.medium;
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-secondary">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            AI-Powered <span className="text-gradient">Symptom Checker</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Describe your symptoms and get instant AI predictions with personalized recommendations powered by medical AI.
          </p>
          
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
              <History className="mr-2 h-4 w-4" />
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
            <Button variant="outline" onClick={clearForm}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Clear Form
            </Button>
          </div>
        </div>

        {/* History Section */}
        {showHistory && symptomHistory.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Recent Symptom Analyses</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {symptomHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{new Date(item.date).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.symptoms.slice(0, 3).join(', ')}
                        {item.symptoms.length > 3 && ` +${item.symptoms.length - 3} more`}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getUrgencyConfig(item.urgencyLevel).color}>
                        {item.urgencyLevel.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{item.primaryCondition}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Symptom Selection */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Select Your Symptoms</span>
                </CardTitle>
                <CardDescription>
                  Choose all symptoms you're currently experiencing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {commonSymptoms.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox
                        id={symptom}
                        checked={selectedSymptoms.some(s => s.name === symptom)}
                        onCheckedChange={() => toggleSymptom(symptom)}
                      />
                      <Label htmlFor={symptom} className="text-sm font-medium cursor-pointer">
                        {symptom}
                      </Label>
                    </div>
                  ))}
                </div>
                
                {selectedSymptoms.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Selected Symptoms with Severity:</Label>
                    <div className="space-y-2">
                      {selectedSymptoms.map((symptom, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-sm font-medium">{symptom.name}</span>
                          <div className="flex items-center space-x-2">
                            <Label className="text-xs">Severity:</Label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={symptom.severity}
                              onChange={(e) => updateSymptomSeverity(symptom.name, e.target.value)}
                              className="w-16 h-8"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSymptom(symptom.name)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Symptom Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration-value">How long have you had these symptoms?</Label>
                    <Input
                      id="duration-value"
                      type="number"
                      placeholder="e.g., 3"
                      value={duration.value}
                      onChange={(e) => setDuration(prev => ({ ...prev, value: e.target.value }))}
                      className="medical-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Unit</Label>
                    <select 
                      value={duration.unit}
                      onChange={(e) => setDuration(prev => ({ ...prev, unit: e.target.value }))}
                      className="medical-input w-full p-2 border rounded-md"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="severity">Overall Severity (1-10 scale)</Label>
                  <Input
                    id="severity"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="5"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="medical-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="additional">Additional Details</Label>
                  <Textarea
                    id="additional"
                    placeholder="Describe any triggers, patterns, or additional symptoms..."
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    className="medical-input min-h-[100px]"
                    maxLength={1000}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Patient Context */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Patient Information (Optional)</span>
                </CardTitle>
                <CardDescription>
                  Help improve analysis accuracy with additional context
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="e.g., 35"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="medical-input"
                      min="1"
                      max="120"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select 
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="medical-input w-full p-2 border rounded-md"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical-history">Medical History</Label>
                  <Input
                    id="medical-history"
                    placeholder="e.g., diabetes, hypertension (comma-separated)"
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="medical-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Current Medications</Label>
                  <Input
                    id="medications"
                    placeholder="e.g., aspirin, lisinopril (comma-separated)"
                    value={currentMedications}
                    onChange={(e) => setCurrentMedications(e.target.value)}
                    className="medical-input"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Analysis Progress */}
            {isAnalyzing && (
              <Card className="medical-card">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {analysisProgress < 40 ? 'Processing symptoms...' :
                         analysisProgress < 80 ? 'AI analyzing patterns...' : 'Generating recommendations...'}
                      </span>
                      <span className="text-sm text-muted-foreground">{analysisProgress}%</span>
                    </div>
                    <Progress value={analysisProgress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={analyzeSymptoms}
              disabled={selectedSymptoms.length === 0 || !severity || isAnalyzing}
              className="medical-button w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Analyze Symptoms
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {showResults && analysis ? (
              <>
                {/* Urgency Assessment */}
                <Card className={`medical-card ${getUrgencyConfig(analysis.aiAnalysis?.urgency?.level).color}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {React.createElement(getUrgencyConfig(analysis.aiAnalysis?.urgency?.level).icon, { className: "h-5 w-5" })}
                      <span>Urgency Level: {analysis.aiAnalysis?.urgency?.level?.toUpperCase()}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {analysis.aiAnalysis?.urgency?.score || 0}/100
                        </div>
                        <p className="text-sm">Urgency Score</p>
                      </div>
                      
                      <div className="p-3 bg-white/50 rounded-lg">
                        <p className="text-sm font-medium">{analysis.urgencyDescription}</p>
                        {analysis.aiAnalysis?.urgency?.reasoning && (
                          <p className="text-xs mt-2 opacity-90">{analysis.aiAnalysis.urgency.reasoning}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Possible Conditions */}
                <Card className="medical-card">
                  <CardHeader>
                    <CardTitle>Possible Conditions</CardTitle>
                    <CardDescription>AI analysis of your symptoms</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.aiAnalysis?.possibleConditions?.map((condition, index) => (
                      <div key={index} className="p-4 border border-border rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{condition.name}</h4>
                          <Badge variant="outline">{condition.probability}% match</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{condition.description}</p>
                        {condition.category && (
                          <Badge className={
                            condition.category === 'emergency' ? 'bg-red-100 text-red-800' :
                            condition.category === 'serious' ? 'bg-orange-100 text-orange-800' :
                            condition.category === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {condition.category}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="medical-card">
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Immediate Actions */}
                    {analysis.recommendations?.immediateActions && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Immediate Actions</h4>
                        {analysis.recommendations.immediateActions.map((action, index) => (
                          <div key={index} className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium">{action.action}</span>
                              <Badge variant="outline">{action.priority}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* When to Seek Help */}
                    {analysis.recommendations?.seekHelp && (
                      <div className="space-y-2">
                        <h4 className="font-medium">When to Seek Medical Help</h4>
                        <div className="p-3 bg-amber-50 rounded-lg">
                          <p className="font-medium text-sm mb-2">
                            Timeframe: {analysis.recommendations.seekHelp.timeframe?.replace('_', ' ')}
                          </p>
                          {analysis.recommendations.seekHelp.reasons && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium">Reasons:</p>
                              {analysis.recommendations.seekHelp.reasons.map((reason, idx) => (
                                <p key={idx} className="text-xs">• {reason}</p>
                              ))}
                            </div>
                          )}
                          {analysis.recommendations.seekHelp.redFlags && (
                            <div className="space-y-1 mt-2">
                              <p className="text-xs font-medium text-red-700">Red Flags to Watch:</p>
                              {analysis.recommendations.seekHelp.redFlags.map((flag, idx) => (
                                <p key={idx} className="text-xs text-red-600">⚠️ {flag}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Self-Care */}
                    {analysis.recommendations?.selfCare && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Self-Care Suggestions</h4>
                        {analysis.recommendations.selfCare.map((care, index) => (
                          <div key={index} className="p-3 bg-green-50 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium capitalize">{care.category}</span>
                                <p className="text-sm text-muted-foreground">{care.suggestion}</p>
                              </div>
                              {care.duration && (
                                <Badge variant="outline" className="text-xs">{care.duration}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Analysis Confidence */}
                <Card className="medical-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Analysis Quality</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {analysis.aiAnalysis?.confidence?.overall || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">AI Confidence</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {analysis.aiAnalysis?.confidence?.dataQuality || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Data Quality</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Was this analysis helpful?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => submitFeedback(true)}>
                          👍 Yes
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => submitFeedback(false)}>
                          👎 No
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="medical-card">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <Brain className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Ready for AI Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Select your symptoms and click "Analyze" to get AI-powered health insights
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medical Disclaimer */}
            <Card className="medical-card bg-amber-50/50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Important Medical Disclaimer</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-700">
                  This AI analysis is for informational purposes only and should not replace professional medical advice. 
                  Always consult with qualified healthcare providers for proper diagnosis and treatment. 
                  In case of emergency, call 911 immediately.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
