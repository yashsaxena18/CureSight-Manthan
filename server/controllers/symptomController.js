const SymptomAnalysis = require('../models/Symptom');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize MedGemma AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'your-api-key');

const symptomController = {
  // POST /api/symptoms/analyze - Main symptom analysis
  async analyzeSymptoms(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.userId;
      const { symptoms, patientContext } = req.body;

      // Create new analysis session
      const analysis = new SymptomAnalysis({
        userId,
        symptoms,
        patientContext: patientContext || {},
        status: 'analyzing'
      });

      await analysis.save();

      // Send immediate response
      res.status(202).json({
        message: 'Symptom analysis started',
        sessionId: analysis.sessionId,
        status: 'analyzing',
        estimatedTime: '30-60 seconds'
      });

      // Start background AI analysis
      analyzeWithMedGemma(analysis._id, symptoms, patientContext || {})
        .catch(err => {
          console.error('Background analysis error:', err);
          // Update analysis with error status
          SymptomAnalysis.findByIdAndUpdate(analysis._id, {
            status: 'completed',
            'aiAnalysis.urgency.level': 'medium',
            'aiAnalysis.possibleConditions': [{
              name: 'Analysis Unavailable',
              probability: 0,
              description: 'Unable to complete AI analysis. Please consult healthcare provider.',
              category: 'moderate'
            }]
          }).catch(console.error);
        });

    } catch (error) {
      console.error('Symptom analysis error:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: 'Unable to process symptom analysis. Please try again.'
      });
    }
  },

  // GET /api/symptoms/analysis/:sessionId - Get analysis results
  async getAnalysisResults(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.userId;

      const analysis = await SymptomAnalysis.findOne({
        sessionId,
        userId
      });

      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: 'No analysis found with this session ID'
        });
      }

      res.json({
        sessionId: analysis.sessionId,
        status: analysis.status,
        symptoms: analysis.symptoms,
        aiAnalysis: analysis.aiAnalysis,
        recommendations: analysis.recommendations,
        urgencyDescription: analysis.getUrgencyDescription(),
        primaryCondition: analysis.getPrimaryCondition(),
        analysisDate: analysis.createdAt
      });

    } catch (error) {
      console.error('Get analysis results error:', error);
      res.status(500).json({
        error: 'Unable to retrieve results',
        message: 'Please try again later'
      });
    }
  },

  // GET /api/symptoms/history - Get user's symptom history
  async getSymptomHistory(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;

      const analyses = await SymptomAnalysis.find({ userId })
        .select('sessionId createdAt symptoms.selected aiAnalysis.urgency.level aiAnalysis.possibleConditions status')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await SymptomAnalysis.countDocuments({ userId });

      // Format for frontend
      const formattedHistory = analyses.map(analysis => ({
        sessionId: analysis.sessionId,
        date: analysis.createdAt,
        symptoms: analysis.symptoms.selected.map(s => s.name),
        urgencyLevel: analysis.aiAnalysis?.urgency?.level || 'unknown',
        primaryCondition: analysis.aiAnalysis?.possibleConditions?.[0]?.name || 'Analysis pending',
        status: analysis.status
      }));

      res.json({
        history: formattedHistory,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: formattedHistory.length,
          hasNext: page * limit < total
        }
      });

    } catch (error) {
      console.error('Get symptom history error:', error);
      res.status(500).json({
        error: 'Unable to retrieve history',
        message: 'Please try again later'
      });
    }
  },

  // GET /api/symptoms/patterns - Get symptom patterns
  async getSymptomPatterns(req, res) {
    try {
      const userId = req.user.userId;
      const days = parseInt(req.query.days) || 30;

      const patterns = await SymptomAnalysis.analyzeSymptomPatterns(userId, days);

      res.json({
        patterns: patterns.map(pattern => ({
          symptom: pattern._id,
          frequency: pattern.frequency,
          averageSeverity: Math.round(pattern.avgSeverity || 0),
          lastOccurrence: pattern.lastOccurrence
        })),
        period: `${days} days`,
        totalAnalyses: patterns.reduce((sum, p) => sum + p.frequency, 0)
      });

    } catch (error) {
      console.error('Get symptom patterns error:', error);
      res.status(500).json({
        error: 'Pattern analysis failed',
        message: 'Unable to analyze symptom patterns'
      });
    }
  },

  // POST /api/symptoms/feedback - Submit feedback
  async submitFeedback(req, res) {
    try {
      const { sessionId, helpful, accuracy, comments, actualDiagnosis } = req.body;
      const userId = req.user.userId;

      const analysis = await SymptomAnalysis.findOne({ sessionId, userId });

      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found'
        });
      }

      analysis.feedback = {
        helpful,
        accuracy,
        comments,
        actualDiagnosis,
        submittedAt: new Date()
      };

      await analysis.save();

      res.json({
        message: 'Feedback submitted successfully',
        thankyou: 'Your feedback helps improve our AI analysis'
      });

    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({
        error: 'Feedback submission failed'
      });
    }
  },

  // GET /api/symptoms/common - Get common symptoms
  async getCommonSymptoms(req, res) {
    try {
      const commonSymptoms = [
        // General symptoms
        'Headache', 'Fever', 'Fatigue', 'Nausea', 'Dizziness', 'Weakness',
        
        // Respiratory
        'Cough', 'Shortness of breath', 'Sore throat', 'Runny nose', 'Sneezing',
        
        // Gastrointestinal  
        'Abdominal pain', 'Vomiting', 'Diarrhea', 'Loss of appetite', 'Heartburn',
        
        // Musculoskeletal
        'Back pain', 'Joint pain', 'Muscle pain', 'Stiffness', 'Swelling',
        
        // Neurological
        'Memory problems', 'Confusion', 'Numbness', 'Tingling', 'Vision problems',
        
        // Skin
        'Rash', 'Itching', 'Dry skin', 'Bruising', 'Skin discoloration',
        
        // Cardiovascular
        'Chest pain', 'Palpitations', 'Rapid heartbeat', 'Leg swelling',
        
        // Other
        'Sleep problems', 'Anxiety', 'Depression', 'Weight loss', 'Weight gain'
      ];

      res.json({
        symptoms: commonSymptoms.map((symptom, index) => ({
          id: index + 1,
          name: symptom,
          category: categorizeSymptom(symptom)
        }))
      });

    } catch (error) {
      res.status(500).json({
        error: 'Unable to retrieve symptoms'
      });
    }
  },

  // GET /api/symptoms/emergency-signs - Get emergency warning signs
  async getEmergencySigns(req, res) {
    try {
      const emergencySigns = {
        immediate: [
          'Difficulty breathing or shortness of breath',
          'Chest pain or pressure',
          'Sudden severe headache',
          'Loss of consciousness',
          'Severe allergic reaction',
          'Severe bleeding',
          'Signs of stroke (face drooping, arm weakness, speech difficulty)',
          'High fever with stiff neck',
          'Severe abdominal pain',
          'Sudden vision loss'
        ],
        urgent: [
          'Persistent high fever (over 103°F)',
          'Severe dehydration',
          'Persistent vomiting',
          'Signs of infection (fever, chills, rapid heartbeat)',
          'Severe pain that doesn\'t improve',
          'Difficulty swallowing',
          'Severe dizziness or fainting',
          'Blood in urine or stool',
          'Severe mood changes or suicidal thoughts'
        ],
        warning: [
          'Symptoms that worsen rapidly',
          'New or unusual symptoms',
          'Symptoms that interfere with daily activities',
          'Persistent symptoms lasting more than a week',
          'Symptoms in high-risk individuals (elderly, immunocompromised)'
        ]
      };

      res.json({
        emergencySigns,
        disclaimer: 'If you are experiencing any emergency symptoms, call 911 or go to the nearest emergency room immediately.'
      });

    } catch (error) {
      res.status(500).json({
        error: 'Unable to retrieve emergency signs'
      });
    }
  },

  // POST /api/symptoms/quick-check - Quick symptom assessment
  async quickSymptomCheck(req, res) {
    try {
      const { symptoms, urgencyOnly } = req.body;
      
      // Simple rule-based urgency assessment
      const urgencyScore = calculateQuickUrgencyScore(symptoms);
      const urgencyLevel = getUrgencyLevel(urgencyScore);
      
      const quickAssessment = {
        urgencyLevel,
        urgencyScore,
        recommendation: getQuickRecommendation(urgencyLevel),
        symptoms: symptoms.length,
        needsFullAnalysis: urgencyScore > 60 || symptoms.length > 3
      };

      res.json({
        quickAssessment,
        message: urgencyLevel === 'high' || urgencyLevel === 'critical' 
          ? 'Consider seeking immediate medical attention'
          : 'For detailed analysis, please use the full symptom checker'
      });

    } catch (error) {
      console.error('Quick check error:', error);
      res.status(500).json({
        error: 'Quick assessment failed'
      });
    }
  },

  // GET /api/symptoms/recommendations/:sessionId - Get detailed recommendations
  async getDetailedRecommendations(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.userId;

      const analysis = await SymptomAnalysis.findOne({ sessionId, userId });

      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found'
        });
      }

      const detailedRecommendations = {
        immediate: analysis.recommendations?.immediateActions || [],
        selfCare: analysis.recommendations?.selfCare || [],
        followUp: analysis.recommendations?.followUp || {},
        lifestyle: generateLifestyleRecommendations(analysis.symptoms),
        monitoring: generateMonitoringPlan(analysis.aiAnalysis?.urgency?.level)
      };

      res.json({
        sessionId,
        recommendations: detailedRecommendations,
        urgencyLevel: analysis.aiAnalysis?.urgency?.level,
        lastUpdated: analysis.updatedAt
      });

    } catch (error) {
      console.error('Get detailed recommendations error:', error);
      res.status(500).json({
        error: 'Unable to retrieve recommendations'
      });
    }
  }
};

// Background AI analysis function
async function analyzeWithMedGemma(analysisId, symptoms, patientContext) {
  try {
    const analysis = await SymptomAnalysis.findById(analysisId);
    if (!analysis) return;

    // Prepare MedGemma model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", // Using available Gemini model as MedGemma proxy
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048
      }
    });

    // Build medical prompt
    const prompt = buildMedicalPrompt(symptoms, patientContext);
    
    // Get AI response
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse AI response
    const aiAnalysis = parseMedicalResponse(responseText);
    
    // Update analysis with results
    analysis.aiAnalysis = aiAnalysis.aiAnalysis;
    analysis.recommendations = aiAnalysis.recommendations;
    analysis.analysisMetadata = {
      modelVersion: 'gemini-1.5-flash',
      processingTime: Date.now() - analysis.createdAt.getTime(),
      dataSource: 'Google Gemini',
      analysisDate: new Date(),
      inputQuality: {
        symptomClarity: calculateSymptomClarity(symptoms),
        contextCompleteness: calculateContextCompleteness(patientContext),
        overall: 85
      }
    };
    analysis.status = 'completed';
    
    await analysis.save();

  } catch (error) {
    console.error('MedGemma analysis error:', error);
    
    // Fallback to rule-based analysis
    await fallbackAnalysis(analysisId, symptoms, patientContext);
  }
}

// Build medical prompt for AI
function buildMedicalPrompt(symptoms, context) {
  return `You are a medical AI assistant specialized in symptom analysis. Analyze the following symptoms and provide a structured medical assessment.

PATIENT CONTEXT:
- Age: ${context.age || 'Not provided'}
- Gender: ${context.gender || 'Not provided'}  
- Medical History: ${context.medicalHistory?.join(', ') || 'None provided'}
- Current Medications: ${context.currentMedications?.join(', ') || 'None provided'}
- Allergies: ${context.allergies?.join(', ') || 'None provided'}

SYMPTOMS:
${symptoms.selected.map(s => `- ${s.name} (Severity: ${s.severity || 5}/10)`).join('\n')}
Duration: ${symptoms.duration?.value || 'Unknown'} ${symptoms.duration?.unit || ''}
Overall Severity: ${symptoms.severity}/10
Additional Information: ${symptoms.additionalInfo || 'None'}

Please provide a JSON response with the following structure:
{
  "aiAnalysis": {
    "possibleConditions": [
      {
        "name": "Condition name",
        "probability": 85,
        "description": "Brief medical description",
        "icd10Code": "A00.0",
        "category": "common"
      }
    ],
    "urgency": {
      "level": "medium",
      "score": 65,
      "reasoning": "Clear explanation of urgency assessment"
    },
    "confidence": {
      "overall": 82,
      "dataQuality": 90
    }
  },
  "recommendations": {
    "immediateActions": [
      {
        "action": "Rest and monitor symptoms",
        "priority": "medium",
        "description": "Detailed explanation and rationale"
      }
    ],
    "seekHelp": {
      "timeframe": "within_days",
      "reasons": ["Persistent symptoms", "Risk factors"],
      "redFlags": ["Warning signs to watch for"]
    },
    "selfCare": [
      {
        "category": "rest",
        "suggestion": "Get adequate sleep and rest",
        "duration": "Until symptoms improve"
      }
    ],
    "followUp": {
      "recommended": true,
      "timeframe": "1-2 weeks",
      "reason": "Monitor symptom progression"
    }
  }
}

IMPORTANT GUIDELINES:
- Base analysis on medical evidence and best practices
- Consider patient age, gender, and medical history
- Prioritize patient safety and appropriate medical care
- Avoid definitive diagnoses - suggest possibilities only
- Include appropriate urgency levels and safety warnings
- Provide actionable, evidence-based recommendations`;
}

// Parse AI response
function parseMedicalResponse(responseText) {
  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback parsing if JSON extraction fails
    return parseTextResponse(responseText);
    
  } catch (error) {
    console.error('Response parsing error:', error);
    return getFallbackResponse();
  }
}

// Fallback analysis using rule-based approach
async function fallbackAnalysis(analysisId, symptoms, patientContext) {
  try {
    const analysis = await SymptomAnalysis.findById(analysisId);
    if (!analysis) return;

    // Simple rule-based analysis
    const urgencyScore = calculateQuickUrgencyScore(symptoms.selected);
    const urgencyLevel = getUrgencyLevel(urgencyScore);
    
    analysis.aiAnalysis = {
      possibleConditions: [{
        name: 'General Medical Condition',
        probability: 60,
        description: 'Based on reported symptoms, medical evaluation recommended',
        category: 'moderate'
      }],
      urgency: {
        level: urgencyLevel,
        score: urgencyScore,
        reasoning: 'Rule-based assessment based on symptom severity and duration'
      },
      confidence: {
        overall: 70,
        dataQuality: 80
      }
    };

    analysis.recommendations = {
      immediateActions: [{
        action: 'Monitor symptoms closely',
        priority: 'medium',
        description: 'Keep track of symptom changes and overall condition'
      }],
      seekHelp: {
        timeframe: urgencyLevel === 'high' ? 'immediate' : 'within_days',
        reasons: ['Symptom evaluation', 'Professional medical assessment'],
        redFlags: ['Worsening symptoms', 'New concerning symptoms']
      },
      selfCare: [{
        category: 'rest',
        suggestion: 'Get adequate rest and stay hydrated',
        duration: 'Until symptoms improve'
      }]
    };

    analysis.status = 'completed';
    await analysis.save();

  } catch (error) {
    console.error('Fallback analysis error:', error);
  }
}

// Helper functions
function categorizeSymptom(symptom) {
  const categories = {
    'respiratory': ['Cough', 'Shortness of breath', 'Sore throat'],
    'gastrointestinal': ['Nausea', 'Abdominal pain', 'Vomiting'],
    'neurological': ['Headache', 'Dizziness', 'Memory problems'],
    'general': ['Fever', 'Fatigue', 'Weakness']
  };
  
  for (const [category, symptoms] of Object.entries(categories)) {
    if (symptoms.some(s => symptom.includes(s))) {
      return category;
    }
  }
  return 'general';
}

function calculateQuickUrgencyScore(symptoms) {
  const emergencySymptoms = [
    'chest pain', 'difficulty breathing', 'severe headache', 
    'loss of consciousness', 'severe bleeding'
  ];
  
  let score = 0;
  symptoms.forEach(symptom => {
    score += (symptom.severity || 5) * 10;
    if (emergencySymptoms.some(es => symptom.name.toLowerCase().includes(es))) {
      score += 30;
    }
  });
  
  return Math.min(score, 100);
}

function getUrgencyLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';  
  if (score >= 40) return 'medium';
  return 'low';
}

function getQuickRecommendation(urgencyLevel) {
  const recommendations = {
    'critical': 'Seek immediate emergency medical care',
    'high': 'Contact healthcare provider urgently or visit urgent care',
    'medium': 'Schedule appointment with healthcare provider within 24-48 hours',
    'low': 'Monitor symptoms and consider routine healthcare consultation'
  };
  
  return recommendations[urgencyLevel] || 'Consult healthcare provider if symptoms persist';
}

function calculateSymptomClarity(symptoms) {
  const clarity = symptoms.selected.reduce((acc, symptom) => {
    return acc + (symptom.name.length > 5 ? 20 : 10);
  }, 0);
  
  return Math.min(clarity, 100);
}

function calculateContextCompleteness(context) {
  let completeness = 0;
  if (context.age) completeness += 25;
  if (context.gender) completeness += 25;
  if (context.medicalHistory?.length > 0) completeness += 25;
  if (context.currentMedications?.length > 0) completeness += 25;
  
  return completeness;
}

function generateLifestyleRecommendations(symptoms) {
  return [
    'Maintain a balanced diet rich in nutrients',
    'Stay adequately hydrated',
    'Get sufficient rest and sleep',
    'Avoid excessive stress',
    'Follow prescribed medications as directed'
  ];
}

function generateMonitoringPlan(urgencyLevel) {
  const plans = {
    'critical': 'Monitor continuously and seek immediate medical attention',
    'high': 'Monitor every few hours and maintain contact with healthcare provider',
    'medium': 'Monitor daily and track symptom changes',
    'low': 'Monitor symptoms and note any changes or improvements'
  };
  
  return plans[urgencyLevel] || 'Monitor symptoms as needed';
}

function getFallbackResponse() {
  return {
    aiAnalysis: {
      possibleConditions: [{
        name: 'Medical Evaluation Needed',
        probability: 50,
        description: 'Unable to complete analysis. Please consult healthcare provider.',
        category: 'moderate'
      }],
      urgency: {
        level: 'medium',
        score: 50,
        reasoning: 'Unable to complete full analysis'
      },
      confidence: {
        overall: 30,
        dataQuality: 50
      }
    },
    recommendations: {
      immediateActions: [{
        action: 'Consult healthcare provider',
        priority: 'medium',
        description: 'Professional medical evaluation recommended'
      }]
    }
  };
}

function parseTextResponse(text) {
  // Basic text parsing fallback
  return {
    aiAnalysis: {
      possibleConditions: [{
        name: 'Medical Condition',
        probability: 60,
        description: text.substring(0, 100) + '...',
        category: 'moderate'
      }],
      urgency: {
        level: 'medium',
        score: 60,
        reasoning: 'Based on symptom analysis'
      },
      confidence: {
        overall: 70,
        dataQuality: 75
      }
    },
    recommendations: {
      immediateActions: [{
        action: 'Monitor symptoms',
        priority: 'medium',
        description: 'Keep track of symptom progression'
      }]
    }
  };
}

module.exports = symptomController;
