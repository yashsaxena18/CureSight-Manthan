const { GoogleGenerativeAI } = require('@google/generative-ai');

class MedGemmaService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "medgemma-27b-text" // Medical-specific model
    });
  }

  async analyzeSymptoms(symptoms, patientContext) {
    const prompt = this.buildMedicalPrompt(symptoms, patientContext);
    
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temperature for medical accuracy
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048
      }
    });

    return this.parseMedicalResponse(result.response.text());
  }

  buildMedicalPrompt(symptoms, context) {
    return `
You are MedGemma, a specialized medical AI assistant. Analyze these symptoms and provide a structured medical assessment.

PATIENT CONTEXT:
- Age: ${context.age || 'Not provided'}
- Gender: ${context.gender || 'Not provided'}
- Medical History: ${context.medicalHistory?.join(', ') || 'None provided'}
- Current Medications: ${context.currentMedications?.join(', ') || 'None provided'}

SYMPTOMS:
${symptoms.selected.map(s => `- ${s.name} (Severity: ${s.severity}/10)`).join('\n')}
Duration: ${symptoms.duration?.value} ${symptoms.duration?.unit}
Overall Severity: ${symptoms.severity}/10
Additional Info: ${symptoms.additionalInfo || 'None'}

Please provide a JSON response with:
{
  "possibleConditions": [
    {
      "name": "Condition name",
      "probability": 85,
      "description": "Brief description",
      "category": "common|moderate|serious|emergency"
    }
  ],
  "urgency": {
    "level": "low|medium|high|critical",
    "score": 75,
    "reasoning": "Explanation of urgency level"
  },
  "confidence": {
    "overall": 82,
    "dataQuality": 90
  },
  "recommendations": {
    "immediateActions": [
      {
        "action": "Rest and hydration",
        "priority": "medium",
        "description": "Detailed explanation"
      }
    ],
    "seekHelp": {
      "timeframe": "within_days",
      "reasons": ["Persistent symptoms", "Risk of complications"],
      "redFlags": ["Difficulty breathing", "Severe pain"]
    },
    "selfCare": [
      {
        "category": "rest",
        "suggestion": "Get adequate sleep",
        "duration": "Until symptoms improve"
      }
    ]
  }
}

IMPORTANT: 
- Base analysis on medical evidence
- Consider patient age/context
- Prioritize safety and appropriate care
- Include relevant medical disclaimers
- Avoid definitive diagnoses
`;
  }
}
