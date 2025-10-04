import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Moon, 
  Utensils, 
  Dumbbell,
  Heart,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Target,
  Award,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const initialData = {
  sleep: { hours: '', quality: '', bedtime: '', wakeup: '' },
  exercise: { type: '', duration: '', intensity: '', calories: '' },
  diet: { meals: '', water: '', supplements: '', notes: '' },
  mood: { rating: '', stress: '', energy: '', notes: '' }
};

export default function DailyMonitoring() {
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Backend data state
  const [healthMetrics, setHealthMetrics] = useState([
    { label: 'Sleep Quality', value: 0, target: 90, icon: Moon, color: 'text-primary' },
    { label: 'Exercise Goals', value: 0, target: 80, icon: Dumbbell, color: 'text-accent' },
    { label: 'Nutrition Score', value: 0, target: 85, icon: Utensils, color: 'text-secondary' },
    { label: 'Overall Wellness', value: 0, target: 90, icon: Heart, color: 'text-warning' }
  ]);
  
  const [recentLogs, setRecentLogs] = useState([]);
  const [todaysScore, setTodaysScore] = useState(0);
  const [hasExistingLog, setHasExistingLog] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Check authentication
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to track your health data.",
          variant: "destructive"
        });
        return;
      }

      // Load today's log, metrics, and history in parallel
      await Promise.all([
        loadTodaysLog(),
        loadHealthMetrics(),
        loadRecentLogs()
      ]);

    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast({
        title: "Loading Failed",
        description: "Unable to load your health data. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load today's existing log
  const loadTodaysLog = async () => {
    try {
      const response = await fetch(`${API_BASE}/health/daily-log`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.hasData) {
        // Pre-fill form with existing data
        const log = data.log;
        setFormData({
          sleep: {
            hours: log.sleep.hours?.toString() || '',
            quality: log.sleep.quality || '',
            bedtime: log.sleep.bedtime || '',
            wakeup: log.sleep.wakeup || ''
          },
          exercise: {
            type: log.exercise.type || '',
            duration: log.exercise.duration?.toString() || '',
            intensity: log.exercise.intensity || '',
            calories: log.exercise.calories?.toString() || ''
          },
          diet: {
            meals: log.diet.meals?.toString() || '',
            water: log.diet.water?.toString() || '',
            supplements: log.diet.supplements || '',
            notes: log.diet.notes || ''
          },
          mood: {
            rating: log.mood.rating || '',
            stress: log.mood.stress || '',
            energy: log.mood.energy || '',
            notes: log.mood.notes || ''
          }
        });

        setTodaysScore(data.overallScore || 0);
        setHasExistingLog(true);

        toast({
          title: "Data Loaded",
          description: "Your existing daily log has been loaded.",
        });
      }
    } catch (error) {
      console.error('Failed to load today\'s log:', error);
    }
  };

  // Load health metrics
  const loadHealthMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/health/metrics?days=7`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.metrics) {
        setHealthMetrics([
          { label: 'Sleep Quality', value: data.metrics.sleepScore || 0, target: 90, icon: Moon, color: 'text-primary' },
          { label: 'Exercise Goals', value: data.metrics.exerciseScore || 0, target: 80, icon: Dumbbell, color: 'text-accent' },
          { label: 'Nutrition Score', value: data.metrics.nutritionScore || 0, target: 85, icon: Utensils, color: 'text-secondary' },
          { label: 'Overall Wellness', value: data.metrics.overallScore || 0, target: 90, icon: Heart, color: 'text-warning' }
        ]);
      }
    } catch (error) {
      console.error('Failed to load health metrics:', error);
    }
  };

  // Load recent logs
  const loadRecentLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/health/history?limit=4`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.logs) {
        const formattedLogs = data.logs.map(log => ({
          date: new Date(log.date).toLocaleDateString(),
          sleep: log.sleep?.hours ? `${log.sleep.hours}h` : 'Not logged',
          exercise: log.exercise?.type ? `${log.exercise.duration || 0}min ${log.exercise.type}` : 'Rest day',
          mood: getMoodEmoji(log.mood?.rating) + ' ' + (log.mood?.rating || 'Not logged'),
          score: log.metrics?.overallScore || 0
        }));
        
        setRecentLogs(formattedLogs);
      }
    } catch (error) {
      console.error('Failed to load recent logs:', error);
    }
  };

  const getMoodEmoji = (rating) => {
    const moodEmojis = {
      'excellent': '😌',
      'good': '😊',
      'neutral': '😐',
      'low': '😔',
      'poor': '😞'
    };
    return moodEmojis[rating] || '😐';
  };

  const updateField = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    // Check authentication
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save your health data.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare data for backend
      const healthData = {
        sleep: {
          ...(formData.sleep.hours && { hours: parseFloat(formData.sleep.hours) }),
          ...(formData.sleep.quality && { quality: formData.sleep.quality }),
          ...(formData.sleep.bedtime && { bedtime: formData.sleep.bedtime }),
          ...(formData.sleep.wakeup && { wakeup: formData.sleep.wakeup })
        },
        exercise: {
          ...(formData.exercise.type && { type: formData.exercise.type }),
          ...(formData.exercise.duration && { duration: parseInt(formData.exercise.duration) }),
          ...(formData.exercise.intensity && { intensity: formData.exercise.intensity }),
          ...(formData.exercise.calories && { calories: parseInt(formData.exercise.calories) })
        },
        diet: {
          ...(formData.diet.meals && { meals: parseInt(formData.diet.meals) }),
          ...(formData.diet.water && { water: parseInt(formData.diet.water) }),
          ...(formData.diet.supplements && { supplements: formData.diet.supplements }),
          ...(formData.diet.notes && { notes: formData.diet.notes })
        },
        mood: {
          ...(formData.mood.rating && { rating: formData.mood.rating }),
          ...(formData.mood.stress && { stress: formData.mood.stress }),
          ...(formData.mood.energy && { energy: formData.mood.energy }),
          ...(formData.mood.notes && { notes: formData.mood.notes })
        }
      };

      const response = await fetch(`${API_BASE}/health/daily-log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(healthData)
      });

      const result = await response.json();

      if (response.ok) {
        setTodaysScore(result.overallScore || 0);
        setHasExistingLog(true);
        
        toast({
          title: hasExistingLog ? "Log Updated" : "Log Saved",
          description: `Your health data has been ${hasExistingLog ? 'updated' : 'recorded'} successfully. Score: ${result.overallScore}%`
        });

        // Refresh metrics and recent logs
        await Promise.all([
          loadHealthMetrics(),
          loadRecentLogs()
        ]);

      } else {
        throw new Error(result.message || 'Failed to save data');
      }

    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Unable to save your health data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateCompleteness = () => {
    const allFields = Object.values(formData).flatMap(section => Object.values(section));
    const filledFields = allFields.filter(field => field.toString().trim() !== '').length;
    return Math.round((filledFields / allFields.length) * 100);
  };

  const refreshData = async () => {
    await loadInitialData();
    toast({
      title: "Data Refreshed",
      description: "Your health data has been updated."
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-accent to-primary">
              <Activity className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            Daily Health <span className="text-gradient">Monitoring</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track your sleep, exercise, diet, and wellness to build healthier habits and gain insights into your lifestyle.
          </p>
          
          {/* Add refresh button */}
          <Button variant="outline" onClick={refreshData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Daily Log Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Indicator */}
            <Card className="medical-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Today's Progress</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{calculateCompleteness()}% Complete</Badge>
                    {todaysScore > 0 && (
                      <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                        Score: {todaysScore}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={calculateCompleteness()} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {hasExistingLog 
                    ? 'You can update your daily log anytime' 
                    : 'Fill out all sections to get comprehensive health insights'
                  }
                </p>
              </CardContent>
            </Card>

            {/* Sleep Tracking */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Moon className="h-5 w-5 text-primary" />
                  <span>Sleep Cycle</span>
                </CardTitle>
                <CardDescription>Track your sleep duration and quality</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sleep-hours">Hours of Sleep</Label>
                  <Input
                    id="sleep-hours"
                    type="number"
                    placeholder="7.5"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.sleep.hours}
                    onChange={(e) => updateField('sleep', 'hours', e.target.value)}
                    className="medical-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Sleep Quality</Label>
                  <Select value={formData.sleep.quality} onValueChange={(value) => updateField('sleep', 'quality', value)}>
                    <SelectTrigger className="medical-input">
                      <SelectValue placeholder="Rate your sleep" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bedtime">Bedtime</Label>
                  <Input
                    id="bedtime"
                    type="time"
                    value={formData.sleep.bedtime}
                    onChange={(e) => updateField('sleep', 'bedtime', e.target.value)}
                    className="medical-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wakeup">Wake-up Time</Label>
                  <Input
                    id="wakeup"
                    type="time"
                    value={formData.sleep.wakeup}
                    onChange={(e) => updateField('sleep', 'wakeup', e.target.value)}
                    className="medical-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Exercise Tracking */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Dumbbell className="h-5 w-5 text-accent" />
                  <span>Physical Activity</span>
                </CardTitle>
                <CardDescription>Log your workout and physical activities</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exercise Type</Label>
                  <Select value={formData.exercise.type} onValueChange={(value) => updateField('exercise', 'type', value)}>
                    <SelectTrigger className="medical-input">
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="strength">Strength Training</SelectItem>
                      <SelectItem value="yoga">Yoga</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                      <SelectItem value="cycling">Cycling</SelectItem>
                      <SelectItem value="walking">Walking</SelectItem>
                      <SelectItem value="rest">Rest Day</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    min="0"
                    max="600"
                    value={formData.exercise.duration}
                    onChange={(e) => updateField('exercise', 'duration', e.target.value)}
                    className="medical-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Intensity</Label>
                  <Select value={formData.exercise.intensity} onValueChange={(value) => updateField('exercise', 'intensity', value)}>
                    <SelectTrigger className="medical-input">
                      <SelectValue placeholder="Select intensity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="very-high">Very High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calories">Calories Burned</Label>
                  <Input
                    id="calories"
                    type="number"
                    placeholder="250"
                    min="0"
                    max="2000"
                    value={formData.exercise.calories}
                    onChange={(e) => updateField('exercise', 'calories', e.target.value)}
                    className="medical-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Diet & Nutrition */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Utensils className="h-5 w-5 text-secondary" />
                  <span>Diet & Nutrition</span>
                </CardTitle>
                <CardDescription>Track your meals and nutritional habits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meals">Number of Meals</Label>
                    <Input
                      id="meals"
                      type="number"
                      placeholder="3"
                      min="0"
                      max="10"
                      value={formData.diet.meals}
                      onChange={(e) => updateField('diet', 'meals', e.target.value)}
                      className="medical-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="water">Water Intake (glasses)</Label>
                    <Input
                      id="water"
                      type="number"
                      placeholder="8"
                      min="0"
                      max="20"
                      value={formData.diet.water}
                      onChange={(e) => updateField('diet', 'water', e.target.value)}
                      className="medical-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplements">Supplements/Vitamins</Label>
                  <Input
                    id="supplements"
                    placeholder="e.g., Vitamin D, Omega-3"
                    maxLength={200}
                    value={formData.diet.supplements}
                    onChange={(e) => updateField('diet', 'supplements', e.target.value)}
                    className="medical-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diet-notes">Meal Notes</Label>
                  <Textarea
                    id="diet-notes"
                    placeholder="Describe your meals, snacks, or any dietary observations..."
                    maxLength={500}
                    value={formData.diet.notes}
                    onChange={(e) => updateField('diet', 'notes', e.target.value)}
                    className="medical-input min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mood & Wellness */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-warning" />
                  <span>Mood & Wellness</span>
                </CardTitle>
                <CardDescription>Track your mental and emotional state</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Overall Mood</Label>
                    <Select value={formData.mood.rating} onValueChange={(value) => updateField('mood', 'rating', value)}>
                      <SelectTrigger className="medical-input">
                        <SelectValue placeholder="Rate your mood" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">😌 Excellent</SelectItem>
                        <SelectItem value="good">😊 Good</SelectItem>
                        <SelectItem value="neutral">😐 Neutral</SelectItem>
                        <SelectItem value="low">😔 Low</SelectItem>
                        <SelectItem value="poor">😞 Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Stress Level</Label>
                    <Select value={formData.mood.stress} onValueChange={(value) => updateField('mood', 'stress', value)}>
                      <SelectTrigger className="medical-input">
                        <SelectValue placeholder="Rate stress" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Energy Level</Label>
                  <Select value={formData.mood.energy} onValueChange={(value) => updateField('mood', 'energy', value)}>
                    <SelectTrigger className="medical-input">
                      <SelectValue placeholder="Rate energy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very-high">Very High</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="very-low">Very Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mood-notes">Additional Notes</Label>
                  <Textarea
                    id="mood-notes"
                    placeholder="Any thoughts, feelings, or observations about your day..."
                    maxLength={500}
                    value={formData.mood.notes}
                    onChange={(e) => updateField('mood', 'notes', e.target.value)}
                    className="medical-input min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || calculateCompleteness() === 0}
              className="medical-button w-full"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {hasExistingLog ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                hasExistingLog ? 'Update Daily Log' : 'Save Daily Log'
              )}
            </Button>
          </div>

          {/* Dashboard Sidebar */}
          <div className="space-y-6">
            {/* Health Metrics */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Health Metrics</span>
                </CardTitle>
                <CardDescription>Your 7-day average scores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {healthMetrics.map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-4 w-4 ${metric.color}`} />
                          <span className="text-sm font-medium">{metric.label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {metric.value}%
                        </span>
                      </div>
                      <Progress value={metric.value} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Target: {metric.target}%
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Logs */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Recent Logs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log, index) => (
                    <div key={index} className="p-3 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{log.date}</p>
                        <Badge variant="outline">{log.score}%</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>💤 {log.sleep}</p>
                        <p>💪 {log.exercise}</p>
                        <p>🧠 {log.mood}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No recent logs found</p>
                    <p className="text-xs text-muted-foreground">Start tracking to see your history</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="mr-2 h-4 w-4" />
                  Set Weekly Goals
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Award className="mr-2 h-4 w-4" />
                  View Achievements
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Health Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
