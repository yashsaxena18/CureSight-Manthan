import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Activity, 
  Heart, 
  Calendar,
  FileText,
  Stethoscope,
  Pill,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  Award,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';

const healthStats = [
  { label: 'Health Score', value: 85, change: '+5%', icon: Heart, color: 'text-primary' },
  { label: 'Active Days', value: 23, change: '+12%', icon: Activity, color: 'text-accent' },
  { label: 'Checkups Done', value: 8, change: '+2', icon: Stethoscope, color: 'text-secondary' },
  { label: 'Goals Achieved', value: 15, change: '+3', icon: Target, color: 'text-warning' }
];

const recentActivity = [
  {
    type: 'symptom-check',
    title: 'Symptom Analysis Completed',
    description: 'Checked symptoms: headache, fatigue',
    time: '2 hours ago',
    status: 'completed',
    icon: Stethoscope
  },
  {
    type: 'report',
    title: 'Blood Test Report Analyzed',
    description: 'Overall health status: Good',
    time: '1 day ago',
    status: 'completed',
    icon: FileText
  },
  {
    type: 'monitoring',
    title: 'Daily Health Log Updated',
    description: '8h sleep, 45min exercise, good mood',
    time: '1 day ago',
    status: 'completed',
    icon: Activity
  },
  {
    type: 'appointment',
    title: 'Doctor Appointment Scheduled',
    description: 'Dr. Sarah Johnson - Cardiology',
    time: '2 days ago',
    status: 'pending',
    icon: Calendar
  }
];

const healthGoals = [
  { title: 'Daily Exercise', progress: 70, target: '5 days/week', icon: Activity },
  { title: 'Sleep Quality', progress: 85, target: '8 hours/night', icon: Clock },
  { title: 'Water Intake', progress: 60, target: '8 glasses/day', icon: Heart },
  { title: 'Medicine Adherence', progress: 95, target: '100% compliance', icon: Pill }
];

const upcomingAppointments = [
  {
    doctor: 'Dr. Sarah Johnson',
    specialty: 'Cardiology',
    date: 'Jan 20, 2024',
    time: '10:00 AM',
    type: 'Follow-up'
  },
  {
    doctor: 'Dr. Michael Chen',
    specialty: 'Internal Medicine',
    date: 'Jan 25, 2024',
    time: '2:30 PM',
    type: 'Annual Checkup'
  }
];

const recentReports = [
  {
    name: 'Complete Blood Count',
    date: 'Jan 15, 2024',
    status: 'Normal',
    provider: 'HealthLab Medical'
  },
  {
    name: 'Lipid Panel',
    date: 'Jan 10, 2024',
    status: 'Normal',
    provider: 'City Medical Center'
  },
  {
    name: 'Thyroid Function',
    date: 'Jan 5, 2024',
    status: 'Attention Needed',
    provider: 'HealthLab Medical'
  }
];

export default function Dashboard() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-accent" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      case 'attention': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'bg-accent/10 text-accent border-accent/20';
      case 'Attention Needed': return 'bg-warning/10 text-warning border-warning/20';
      case 'Critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">
              Health <span className="text-gradient">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your comprehensive health overview.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-secondary">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-medium">John Doe</p>
              <p className="text-sm text-muted-foreground">Member since 2024</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {healthStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="medical-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <Badge variant="secondary" className="text-xs">
                          {stat.change}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10">
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Health Goals */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Health Goals Progress</span>
                </CardTitle>
                <CardDescription>Track your progress towards better health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {healthGoals.map((goal, index) => {
                  const Icon = goal.icon;
                  return (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{goal.title}</p>
                            <p className="text-sm text-muted-foreground">Target: {goal.target}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>Your latest health activities and updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-start space-x-4 p-4 border border-border rounded-lg">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{activity.title}</p>
                          {getStatusIcon(activity.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Health Reports */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Recent Medical Reports</span>
                </CardTitle>
                <CardDescription>Your latest test results and medical reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentReports.map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">{report.provider}</p>
                      <p className="text-xs text-muted-foreground">{report.date}</p>
                    </div>
                    <Badge className={getReportStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/report-analyzer">
                    <FileText className="mr-2 h-4 w-4" />
                    Upload New Report
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="medical-button w-full justify-start" asChild>
                  <Link to="/symptom-checker">
                    <Stethoscope className="mr-2 h-4 w-4" />
                    Check Symptoms
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/daily-monitoring">
                    <Activity className="mr-2 h-4 w-4" />
                    Log Daily Health
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/find-doctors">
                    <Calendar className="mr-2 h-4 w-4" />
                    Find Doctors
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/medicine-comparison">
                    <Pill className="mr-2 h-4 w-4" />
                    Compare Medicines
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Upcoming Appointments</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingAppointments.map((appointment, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{appointment.doctor}</p>
                      <Badge variant="outline" className="text-xs">
                        {appointment.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{appointment.specialty}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{appointment.date}</span>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{appointment.time}</span>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/find-doctors">
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Appointment
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Health Tips */}
            <Card className="medical-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Today's Health Tip</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-primary mb-2">Stay Hydrated!</p>
                    <p className="text-xs text-muted-foreground">
                      Aim for 8 glasses of water daily. Proper hydration improves energy, focus, and overall health.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/daily-monitoring">
                      <TrendingUp className="mr-2 h-3 w-3" />
                      Track Progress
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Emergency */}
            <Card className="medical-card border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>Emergency</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Need immediate medical help?
                </p>
                <Button variant="destructive" className="w-full">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Call Emergency Services
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/emergency-practice">
                    <Heart className="mr-2 h-4 w-4" />
                    Emergency Guide
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}