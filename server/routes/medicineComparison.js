const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Medicine comparison endpoint
router.post('/compare', async (req, res) => {
  try {
    const { medicineName } = req.body;
    
    console.log(`🔍 AI Medicine Comparison for: ${medicineName}`);
    
    // Step 1: Get medicine data from multiple sources
    const medicineData = await getMedicineData(medicineName);
    
    // Step 2: AI-powered analysis
    const aiAnalysis = await generateAIComparison(medicineName, medicineData);
    
    // Step 3: Get purchase links
    const purchaseLinks = await getPurchaseLinks(medicineName);
    
    // Step 4: Format response
    const response = {
      medicine: medicineName,
      condition: aiAnalysis.condition,
      allopathic: {
        ...aiAnalysis.allopathic,
        purchaseLinks: purchaseLinks.allopathic
      },
      ayurvedic: {
        ...aiAnalysis.ayurvedic,
        purchaseLinks: purchaseLinks.ayurvedic
      },
      homeopathic: {
        ...aiAnalysis.homeopathic,
        purchaseLinks: purchaseLinks.homeopathic
      },
      aiInsights: aiAnalysis.insights,
      disclaimer: "This is AI-generated comparison. Always consult healthcare professionals."
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('❌ Medicine comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate medicine comparison',
      message: error.message
    });
  }
});

// Get medicine data from APIs
async function getMedicineData(medicineName) {
  try {
    console.log(`📊 Fetching medicine data for: ${medicineName}`);
    
    // Multiple data sources
    const dataSources = await Promise.allSettled([
      // 1. FDA API (if available)
      fetchFDAData(medicineName),
      
      // 2. Medicine.com scraping
      fetchMedicineComData(medicineName),
      
      // 3. WebMD API
      fetchWebMDData(medicineName),
      
      // 4. RxList data
      fetchRxListData(medicineName)
    ]);
    
    // Combine successful responses
    const validData = dataSources
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(data => data !== null);
    
    return {
      medicineInfo: validData,
      searchedMedicine: medicineName,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error fetching medicine data:', error);
    return {
      medicineInfo: [],
      searchedMedicine: medicineName,
      error: error.message
    };
  }
}

// AI-powered comparison generation
async function generateAIComparison(medicineName, medicineData) {
  try {
    console.log(`🤖 Generating AI comparison for: ${medicineName}`);
    
    const prompt = `
As a medical AI expert, provide a comprehensive comparison of "${medicineName}" across three medical systems:

Medicine Data Available: ${JSON.stringify(medicineData, null, 2)}

Please provide detailed comparison in this exact JSON format:
{
  "condition": "Primary condition treated",
  "allopathic": {
    "name": "Generic + Brand names",
    "dosage": "Recommended dosage",
    "mechanism": "How it works scientifically",
    "sideEffects": ["List", "of", "side", "effects"],
    "effectiveness": "Percentage like 85%",
    "cost": "Price range in Rs",
    "duration": "How long effects last",
    "pros": ["Advantages"],
    "cons": ["Disadvantages"]
  },
  "ayurvedic": {
    "name": "Natural alternatives",
    "dosage": "Traditional dosage",
    "mechanism": "Natural action mechanism",
    "sideEffects": ["Natural side effects"],
    "effectiveness": "Effectiveness percentage",
    "cost": "Price range in Rs",
    "duration": "Duration of effects",
    "pros": ["Natural advantages"],
    "cons": ["Limitations"]
  },
  "homeopathic": {
    "name": "Homeopathic alternatives",
    "dosage": "Homeopathic dosage",
    "mechanism": "Homeopathic principle",
    "sideEffects": ["Side effects if any"],
    "effectiveness": "Effectiveness percentage",
    "cost": "Price range in Rs", 
    "duration": "Duration",
    "pros": ["Homeopathic benefits"],
    "cons": ["Limitations"]
  },
  "insights": {
    "bestFor": "Which system is best for what",
    "warnings": ["Important warnings"],
    "recommendations": ["AI recommendations"]
  }
}

Focus on accuracy, safety, and providing realistic alternatives.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a medical AI expert specializing in comparative medicine across Allopathic, Ayurvedic, and Homeopathic systems. Provide accurate, balanced, and safe medical information."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    try {
      const parsedResponse = JSON.parse(aiResponse);
      console.log('✅ AI comparison generated successfully');
      return parsedResponse;
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      return getDefaultComparison(medicineName);
    }
    
  } catch (error) {
    console.error('❌ AI comparison error:', error);
    return getDefaultComparison(medicineName);
  }
}

// Get purchase links from e-commerce platforms
async function getPurchaseLinks(medicineName) {
  try {
    console.log(`🛒 Fetching purchase links for: ${medicineName}`);
    
    const links = await Promise.allSettled([
      // Amazon search
      searchAmazon(medicineName),
      
      // Flipkart search  
      searchFlipkart(medicineName),
      
      // 1mg search
      search1mg(medicineName),
      
      // Netmeds search
      searchNetmeds(medicineName)
    ]);
    
    const validLinks = links
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    return {
      allopathic: validLinks.filter(link => link.category === 'allopathic'),
      ayurvedic: validLinks.filter(link => link.category === 'ayurvedic'),
      homeopathic: validLinks.filter(link => link.category === 'homeopathic')
    };
    
  } catch (error) {
    console.error('❌ Error fetching purchase links:', error);
    return {
      allopathic: [],
      ayurvedic: [],
      homeopathic: []
    };
  }
}

// Amazon product search
async function searchAmazon(medicineName) {
  try {
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(medicineName + ' medicine')}`;
    
    // Using Amazon API or scraping (be careful with terms of service)
    return {
      platform: 'Amazon',
      category: 'allopathic',
      url: searchUrl,
      directLink: `https://www.amazon.in/s?k=${encodeURIComponent(medicineName)}`,
      price: 'Varies',
      availability: 'Check on site'
    };
  } catch (error) {
    console.error('Amazon search error:', error);
    return null;
  }
}

// Flipkart product search
async function searchFlipkart(medicineName) {
  try {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(medicineName)}`;
    
    return {
      platform: 'Flipkart',
      category: 'allopathic',
      url: searchUrl,
      directLink: searchUrl,
      price: 'Varies',
      availability: 'Check on site'
    };
  } catch (error) {
    console.error('Flipkart search error:', error);
    return null;
  }
}

// 1mg API search
async function search1mg(medicineName) {
  try {
    const searchUrl = `https://www.1mg.com/search/all?name=${encodeURIComponent(medicineName)}`;
    
    return {
      platform: '1mg',
      category: 'allopathic',
      url: searchUrl,
      directLink: searchUrl,
      price: 'Varies',
      availability: 'Prescription required'
    };
  } catch (error) {
    console.error('1mg search error:', error);
    return null;
  }
}

// External API functions (mock implementations)
async function fetchFDAData(medicineName) {
  // Mock FDA API call
  return { source: 'FDA', medicine: medicineName, data: 'Sample FDA data' };
}

async function fetchMedicineComData(medicineName) {
  // Mock Medicine.com scraping
  return { source: 'Medicine.com', medicine: medicineName, data: 'Sample medicine data' };
}

async function fetchWebMDData(medicineName) {
  // Mock WebMD API
  return { source: 'WebMD', medicine: medicineName, data: 'Sample WebMD data' };
}

async function fetchRxListData(medicineName) {
  // Mock RxList data
  return { source: 'RxList', medicine: medicineName, data: 'Sample RxList data' };
}

async function searchNetmeds(medicineName) {
  try {
    const searchUrl = `https://www.netmeds.com/catalogsearch/result?q=${encodeURIComponent(medicineName)}`;
    
    return {
      platform: 'Netmeds',
      category: 'allopathic',
      url: searchUrl,
      directLink: searchUrl,
      price: 'Varies',
      availability: 'Available'
    };
  } catch (error) {
    console.error('Netmeds search error:', error);
    return null;
  }
}

// Default comparison fallback
function getDefaultComparison(medicineName) {
  return {
    condition: `Treatment for ${medicineName} related conditions`,
    allopathic: {
      name: `${medicineName} (Generic)`,
      dosage: "As prescribed by doctor",
      mechanism: "Modern pharmaceutical action",
      sideEffects: ["Consult doctor for side effects"],
      effectiveness: "70%",
      cost: "Rs 50-200",
      duration: "4-8 hours",
      pros: ["Fast acting", "Well researched"],
      cons: ["May have side effects", "Prescription required"]
    },
    ayurvedic: {
      name: "Natural herbal alternatives",
      dosage: "As per Ayurvedic practitioner",
      mechanism: "Natural healing principles",
      sideEffects: ["Generally safe", "Rare allergic reactions"],
      effectiveness: "60%",
      cost: "Rs 100-500",
      duration: "6-12 hours",
      pros: ["Natural ingredients", "Holistic healing"],
      cons: ["Slower action", "Variable quality"]
    },
    homeopathic: {
      name: "Homeopathic potency medicines",
      dosage: "As per homeopath",
      mechanism: "Micro-dose healing stimulation",
      sideEffects: ["No known side effects"],
      effectiveness: "40%",
      cost: "Rs 200-800",
      duration: "Variable",
      pros: ["No side effects", "Safe for all ages"],
      cons: ["Limited scientific evidence", "Individual variation"]
    },
    insights: {
      bestFor: "Consult healthcare professional for best option",
      warnings: ["Always consult qualified practitioners"],
      recommendations: ["Get proper medical advice", "Consider your medical history"]
    }
  };
}

module.exports = router;
