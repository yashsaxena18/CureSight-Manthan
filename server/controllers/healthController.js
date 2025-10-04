const DailyLog = require('../models/DailyLog');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const healthController = {
  // POST /api/health/daily-log - Save or update daily log
  async saveDailyLog(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.userId;
      const { sleep, exercise, diet, mood } = req.body;
      
      // Get today's date (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find existing log for today or create new one
      let dailyLog = await DailyLog.findOne({
        userId,
        date: today
      });

      if (dailyLog) {
        // Update existing log
        if (sleep) {
          dailyLog.sleep = { ...dailyLog.sleep.toObject(), ...sleep };
        }
        if (exercise) {
          dailyLog.exercise = { ...dailyLog.exercise.toObject(), ...exercise };
        }
        if (diet) {
          dailyLog.diet = { ...dailyLog.diet.toObject(), ...diet };
        }
        if (mood) {
          dailyLog.mood = { ...dailyLog.mood.toObject(), ...mood };
        }
        
        await dailyLog.save(); // This will trigger pre-save scoring
        
        res.json({
          message: 'Daily log updated successfully',
          log: dailyLog,
          completeness: dailyLog.metrics.completenessScore,
          overallScore: dailyLog.metrics.overallScore
        });
      } else {
        // Create new log
        dailyLog = new DailyLog({
          userId,
          date: today,
          sleep: sleep || {},
          exercise: exercise || {},
          diet: diet || {},
          mood: mood || {}
        });

        await dailyLog.save(); // This will trigger pre-save scoring

        res.status(201).json({
          message: 'Daily log created successfully',
          log: dailyLog,
          completeness: dailyLog.metrics.completenessScore,
          overallScore: dailyLog.metrics.overallScore
        });
      }

    } catch (error) {
      console.error('Save daily log error:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          error: 'Duplicate log',
          message: 'Daily log for today already exists'
        });
      }
      
      res.status(500).json({
        error: 'Save failed',
        message: 'Unable to save daily log'
      });
    }
  },

  // GET /api/health/daily-log - Get daily log
  async getDailyLog(req, res) {
    try {
      const userId = req.user.userId;
      let { date } = req.query;

      // If no date provided, use today
      if (!date) {
        date = new Date();
        date.setHours(0, 0, 0, 0);
      } else {
        date = new Date(date);
        date.setHours(0, 0, 0, 0);
      }

      const dailyLog = await DailyLog.findOne({
        userId,
        date
      });

      if (!dailyLog) {
        return res.json({
          message: 'No log found for this date',
          log: null,
          hasData: false
        });
      }

      res.json({
        message: 'Daily log retrieved successfully',
        log: dailyLog,
        hasData: true,
        completeness: dailyLog.metrics.completenessScore,
        overallScore: dailyLog.metrics.overallScore
      });

    } catch (error) {
      console.error('Get daily log error:', error);
      res.status(500).json({
        error: 'Retrieval failed',
        message: 'Unable to retrieve daily log'
      });
    }
  },

  // GET /api/health/history - Get health history
  async getHealthHistory(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;

      let query = { userId };

      // Add date filters if provided
      if (req.query.startDate || req.query.endDate) {
        query.date = {};
        if (req.query.startDate) {
          query.date.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          query.date.$lte = new Date(req.query.endDate);
        }
      }

      const logs = await DailyLog.find(query)
        .sort({ date: -1 })
        .limit(limit)
        .skip(skip)
        .select('date metrics sleep.hours exercise.type exercise.duration mood.rating');

      const total = await DailyLog.countDocuments(query);

      // Calculate some quick stats
      const avgScore = logs.length > 0 
        ? logs.reduce((sum, log) => sum + log.metrics.overallScore, 0) / logs.length
        : 0;

      res.json({
        logs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: logs.length,
          hasNext: page * limit < total
        },
        stats: {
          totalLogs: total,
          averageScore: Math.round(avgScore)
        }
      });

    } catch (error) {
      console.error('Get health history error:', error);
      res.status(500).json({
        error: 'History retrieval failed',
        message: 'Unable to retrieve health history'
      });
    }
  },

  // GET /api/health/metrics - Get health metrics
  async getHealthMetrics(req, res) {
    try {
      const userId = req.user.userId;
      const days = parseInt(req.query.days) || 30;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get logs for the specified period
      const logs = await DailyLog.find({
        userId,
        date: { $gte: startDate }
      }).select('metrics sleep.hours exercise.duration diet.water');

      if (logs.length === 0) {
        return res.json({
          message: 'No data available for metrics calculation',
          metrics: null
        });
      }

      // Calculate average scores
      const avgMetrics = {
        overallScore: Math.round(logs.reduce((sum, log) => sum + log.metrics.overallScore, 0) / logs.length),
        sleepScore: Math.round(logs.reduce((sum, log) => sum + log.metrics.sleepScore, 0) / logs.length),
        exerciseScore: Math.round(logs.reduce((sum, log) => sum + log.metrics.exerciseScore, 0) / logs.length),
        nutritionScore: Math.round(logs.reduce((sum, log) => sum + log.metrics.nutritionScore, 0) / logs.length),
        moodScore: Math.round(logs.reduce((sum, log) => sum + log.metrics.moodScore, 0) / logs.length)
      };

      // Calculate trends (compare with previous period)
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);
      
      const prevLogs = await DailyLog.find({
        userId,
        date: { $gte: prevStartDate, $lt: startDate }
      }).select('metrics');

      let trends = {};
      if (prevLogs.length > 0) {
        const prevAvgScore = prevLogs.reduce((sum, log) => sum + log.metrics.overallScore, 0) / prevLogs.length;
        const improvement = avgMetrics.overallScore - prevAvgScore;
        
        trends = {
          improvement: Math.round(improvement),
          direction: improvement > 0 ? 'up' : improvement < 0 ? 'down' : 'stable',
          message: improvement > 5 ? 'Great improvement!' : 
                   improvement < -5 ? 'Needs attention' : 
                   'Maintaining steady progress'
        };
      }

      // Calculate other stats
      const stats = {
        totalLogs: logs.length,
        consistencyRate: Math.round((logs.length / days) * 100),
        avgSleepHours: logs.filter(l => l.sleep.hours).length > 0 
          ? (logs.reduce((sum, log) => sum + (log.sleep.hours || 0), 0) / logs.filter(l => l.sleep.hours).length).toFixed(1)
          : 'N/A',
        totalExerciseMinutes: logs.reduce((sum, log) => sum + (log.exercise.duration || 0), 0),
        avgWaterIntake: logs.filter(l => l.diet.water).length > 0
          ? Math.round(logs.reduce((sum, log) => sum + (log.diet.water || 0), 0) / logs.filter(l => l.diet.water).length)
          : 'N/A'
      };

      res.json({
        metrics: avgMetrics,
        trends,
        stats,
        period: `${days} days`,
        dataPoints: logs.length
      });

    } catch (error) {
      console.error('Get health metrics error:', error);
      res.status(500).json({
        error: 'Metrics calculation failed',
        message: 'Unable to calculate health metrics'
      });
    }
  },

  // GET /api/health/trends - Get health trends for charts
  async getHealthTrends(req, res) {
    try {
      const userId = req.user.userId;
      const days = parseInt(req.query.days) || 30;

      const trends = await DailyLog.getHealthTrends(userId, days);

      // Format data for charts
      const chartData = trends.map(log => ({
        date: log.date.toISOString().split('T')[0],
        overall: log.metrics.overallScore,
        sleep: log.metrics.sleepScore,
        exercise: log.metrics.exerciseScore,
        nutrition: log.metrics.nutritionScore,
        mood: log.metrics.moodScore
      }));

      res.json({
        trends: chartData,
        period: `${days} days`,
        dataPoints: chartData.length
      });

    } catch (error) {
      console.error('Get health trends error:', error);
      res.status(500).json({
        error: 'Trends calculation failed',
        message: 'Unable to retrieve health trends'
      });
    }
  },

  // GET /api/health/weekly-summary - Get weekly summary
  async getWeeklySummary(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const summary = await DailyLog.getWeeklySummary(userId, startDate, endDate);

      if (!summary || summary.length === 0) {
        return res.json({
          message: 'No data available for weekly summary',
          summary: null
        });
      }

      const weeklyData = summary[0];

      res.json({
        summary: {
          averageOverallScore: Math.round(weeklyData.avgOverallScore || 0),
          averageSleepScore: Math.round(weeklyData.avgSleepScore || 0),
          averageExerciseScore: Math.round(weeklyData.avgExerciseScore || 0),
          averageNutritionScore: Math.round(weeklyData.avgNutritionScore || 0),
          averageMoodScore: Math.round(weeklyData.avgMoodScore || 0),
          totalLogs: weeklyData.totalLogs || 0,
          averageSleepHours: weeklyData.avgSleepHours ? weeklyData.avgSleepHours.toFixed(1) : 'N/A',
          totalExerciseMinutes: weeklyData.totalExerciseMinutes || 0,
          consistencyRate: Math.round((weeklyData.totalLogs / 7) * 100)
        },
        period: '7 days'
      });

    } catch (error) {
      console.error('Get weekly summary error:', error);
      res.status(500).json({
        error: 'Weekly summary failed',
        message: 'Unable to generate weekly summary'
      });
    }
  },

  // GET /api/health/insights - Get AI-powered health insights
  async getHealthInsights(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get last 14 days of data for analysis
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      const logs = await DailyLog.find({
        userId,
        date: { $gte: startDate }
      }).sort({ date: -1 });

      if (logs.length < 3) {
        return res.json({
          insights: ['Log more data to get personalized insights'],
          recommendations: ['Try to log your health data consistently for better insights']
        });
      }

      // Generate insights based on data patterns
      const insights = generateHealthInsights(logs);
      const recommendations = generateRecommendations(logs);

      res.json({
        insights,
        recommendations,
        dataPoints: logs.length,
        period: '14 days'
      });

    } catch (error) {
      console.error('Get health insights error:', error);
      res.status(500).json({
        error: 'Insights generation failed',
        message: 'Unable to generate health insights'
      });
    }
  },

  // POST /api/health/goals - Set health goals (placeholder)
  async setHealthGoals(req, res) {
    try {
      // This would integrate with a HealthGoals model
      res.json({
        message: 'Health goals feature coming soon',
        goals: req.body
      });
    } catch (error) {
      res.status(500).json({
        error: 'Goal setting failed'
      });
    }
  },

  // GET /api/health/goals - Get health goals (placeholder)
  async getHealthGoals(req, res) {
    try {
      res.json({
        message: 'Health goals feature coming soon',
        goals: null
      });
    } catch (error) {
      res.status(500).json({
        error: 'Goal retrieval failed'
      });
    }
  },

  // DELETE /api/health/daily-log - Delete daily log
  async deleteDailyLog(req, res) {
    try {
      const userId = req.user.userId;
      const { date } = req.query;

      const deleteDate = new Date(date);
      deleteDate.setHours(0, 0, 0, 0);

      const deletedLog = await DailyLog.findOneAndDelete({
        userId,
        date: deleteDate
      });

      if (!deletedLog) {
        return res.status(404).json({
          error: 'Log not found',
          message: 'No log found for the specified date'
        });
      }

      res.json({
        message: 'Daily log deleted successfully',
        deletedDate: date
      });

    } catch (error) {
      console.error('Delete daily log error:', error);
      res.status(500).json({
        error: 'Deletion failed',
        message: 'Unable to delete daily log'
      });
    }
  }
};

// Helper function to generate health insights
function generateHealthInsights(logs) {
  const insights = [];
  
  // Sleep pattern analysis
  const sleepHours = logs.filter(l => l.sleep.hours).map(l => l.sleep.hours);
  if (sleepHours.length > 0) {
    const avgSleep = sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length;
    if (avgSleep < 7) {
      insights.push(`Your average sleep is ${avgSleep.toFixed(1)} hours. Consider getting more rest.`);
    } else if (avgSleep > 9) {
      insights.push(`You're averaging ${avgSleep.toFixed(1)} hours of sleep, which might be too much.`);
    } else {
      insights.push(`Great job! You're averaging ${avgSleep.toFixed(1)} hours of sleep.`);
    }
  }

  // Exercise consistency
  const exerciseDays = logs.filter(l => l.exercise.type && l.exercise.type !== 'rest').length;
  const totalDays = logs.length;
  const exerciseRate = (exerciseDays / totalDays) * 100;
  
  if (exerciseRate > 70) {
    insights.push(`Excellent! You've been active ${exerciseRate.toFixed(0)}% of days.`);
  } else if (exerciseRate > 40) {
    insights.push(`Good consistency with ${exerciseRate.toFixed(0)}% active days. Try to increase gradually.`);
  } else {
    insights.push(`You've been active ${exerciseRate.toFixed(0)}% of days. Consider adding more physical activity.`);
  }

  // Mood trends
  const moodScores = logs.filter(l => l.metrics.moodScore > 0).map(l => l.metrics.moodScore);
  if (moodScores.length > 0) {
    const avgMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
    if (avgMood < 50) {
      insights.push('Your mood scores suggest you might benefit from stress management techniques.');
    } else if (avgMood > 80) {
      insights.push('Your mood has been consistently positive. Keep up the great work!');
    }
  }

  return insights.length > 0 ? insights : ['Keep logging your data to get personalized insights!'];
}

// Helper function to generate recommendations
function generateRecommendations(logs) {
  const recommendations = [];
  
  // Based on the insights, provide actionable recommendations
  const recentLog = logs[0];
  
  if (recentLog.metrics.sleepScore < 70) {
    recommendations.push('Try establishing a consistent bedtime routine');
  }
  
  if (recentLog.metrics.exerciseScore < 60) {
    recommendations.push('Aim for at least 30 minutes of physical activity daily');
  }
  
  if (recentLog.metrics.nutritionScore < 60) {
    recommendations.push('Focus on drinking more water and eating balanced meals');
  }
  
  if (recentLog.metrics.moodScore < 60) {
    recommendations.push('Consider meditation or talking to someone about your feelings');
  }

  return recommendations.length > 0 ? recommendations : ['Keep up the healthy habits!'];
}

module.exports = healthController;
