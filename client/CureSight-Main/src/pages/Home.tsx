import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Stethoscope, 
  FileText, 
  Users, 
  Play, 
  Pill, 
  Activity, 
  ArrowRight,
  Shield,
  Zap,
  Heart,
  CheckCircle2
} from 'lucide-react';
import heroImage from '@/assets/hero-medical.jpg';

const features = [
  {
    icon: Stethoscope,
    title: 'AI Disease Predector',
    description: 'Get instant AI-powered analysis of your symptoms and receive guidance on next steps.',
    href: '/symptom-checker',
    color: 'text-primary'
  },
  {
    icon: FileText,
    title: 'Report Analyzer',
    description: 'Upload medical reports for comprehensive analysis and personalized recommendations.',
    href: '/report-analyzer',
    color: 'text-secondary'
  },
  {
    icon: Users,
    title: 'Find Doctors',
    description: 'Locate qualified healthcare providers near you with availability and reviews.',
    href: '/find-doctors',
    color: 'text-accent'
  },
  {
    icon: Play,
    title: 'Emergency Practice',
    description: 'Learn life-saving techniques through interactive tutorials and guides.',
    href: '/emergency-practice',
    color: 'text-warning'
  },
  {
    icon: Pill,
    title: 'Medicine Comparison',
    description: 'Compare medications across different medical systems for informed decisions.',
    href: '/medicine-comparison',
    color: 'text-primary'
  },
  {
    icon: Activity,
    title: 'Health Monitoring',
    description: 'Track your daily health metrics and lifestyle for better wellness insights.',
    href: '/daily-monitoring',
    color: 'text-secondary'
  }
];

const stats = [
  { label: 'Users Helped', value: '100K+', icon: Users },
  { label: 'Medical Reports Analyzed', value: '50K+', icon: FileText },
  { label: 'Doctors in Network', value: '5K+', icon: Stethoscope },
  { label: 'Emergency Guides', value: '200+', icon: Shield }
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  Your Health,{' '}
                  <span className="text-gradient">Simplified</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  CureSight combines AI-powered health analysis with expert medical guidance to provide comprehensive healthcare solutions at your fingertips.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="medical-button" asChild>
                  <Link to="/symptom-checker">
                    <Stethoscope className="mr-2 h-5 w-5" />
                    Start Health Check
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/find-doctors">
                    <Users className="mr-2 h-5 w-5" />
                    Find Doctors
                  </Link>
                </Button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span>AI-Powered Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span>Verified Medical Data</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <img 
                src={heroImage} 
                alt="CureSight Medical Interface" 
                className="rounded-2xl shadow-2xl w-full h-auto max-w-lg mx-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20">
                      <Icon className="h-6 w-6 text-primary" />
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

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Comprehensive Healthcare <span className="text-gradient">Solutions</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From symptom checking to emergency preparedness, CureSight provides all the tools you need for better health management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="medical-card group hover:scale-[1.02] transition-all duration-300">
                  <CardHeader className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10">
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="group-hover:bg-primary/5" asChild>
                      <Link to={feature.href} className="flex items-center">
                        Learn More
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Take Control of Your Health?
              </h2>
              <p className="text-xl text-muted-foreground">
                Join thousands of users who trust CureSight for their healthcare needs.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="medical-button" asChild>
                <Link to="/signup">
                  <Heart className="mr-2 h-5 w-5" />
                  Get Started Free
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/dashboard">
                  <Zap className="mr-2 h-5 w-5" />
                  View Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}