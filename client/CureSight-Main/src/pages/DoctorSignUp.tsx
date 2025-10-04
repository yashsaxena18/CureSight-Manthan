import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Heart, Eye, EyeOff, Mail, Lock, User, Phone, 
  GraduationCap, Building2, Award, RefreshCw, 
  CheckCircle2, Stethoscope, MapPin, AlertCircle,
  Calendar, IndianRupee
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// API Configuration - same as existing
const API_BASE = 'http://localhost:5000/api';

const specializations = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Neurology', 
  'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology',
  'Surgery', 'Oncology', 'Gynecology', 'ENT', 'Ophthalmology',
  'Anesthesiology', 'Emergency Medicine', 'Internal Medicine',
  'Family Medicine', 'Pathology', 'Urology', 'Other'
];

const languages = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 
  'Gujarati', 'Urdu', 'Kannada', 'Malayalam', 'Punjabi', 'Other'
];

const availableDays = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
  'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Lakshadweep'
];

export default function DoctorSignUp() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  const [formData, setFormData] = useState({
    // Step 1: Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    city: '',
    state: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Professional Information
    medicalLicenseNumber: '',
    specialization: '',
    yearsOfExperience: '',
    hospitalAffiliation: '',
    bio: '',
    consultationFee: '',
    languages: ['English'],
    
    // Step 3: Availability & Agreements
    availableDays: [],
    agreeTerms: false,
    agreePrivacy: false,
    agreeVerification: false
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field as keyof typeof prev] as string[], value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return validatePersonalInfo();
      case 2:
        return validateProfessionalInfo();
      case 3:
        return validateAgreements();
      default:
        return false;
    }
  };

  const validatePersonalInfo = () => {
    const errors = [];
    
    if (!formData.firstName.trim()) errors.push("First name is required");
    if (!formData.lastName.trim()) errors.push("Last name is required");
    if (!formData.email.trim()) errors.push("Email is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push("Valid email is required");
    if (!formData.phoneNumber.trim()) errors.push("Phone number is required");
    if (!/^[\+]?[\d\s\-\(\)]{10,15}$/.test(formData.phoneNumber)) errors.push("Valid phone number is required");
    if (formData.password.length < 8) errors.push("Password must be at least 8 characters");
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.push("Password must contain uppercase, lowercase, and number");
    }
    if (formData.password !== formData.confirmPassword) errors.push("Passwords don't match");

    if (errors.length > 0) {
      toast({
        title: "Please complete required fields",
        description: errors[0],
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validateProfessionalInfo = () => {
    const errors = [];
    
    if (!formData.medicalLicenseNumber.trim()) errors.push("Medical license number is required");
    if (formData.medicalLicenseNumber.length < 5) errors.push("License number must be at least 5 characters");
    if (!formData.specialization) errors.push("Specialization is required");
    if (!formData.yearsOfExperience) errors.push("Years of experience is required");
    if (parseInt(formData.yearsOfExperience) < 0 || parseInt(formData.yearsOfExperience) > 60) {
      errors.push("Experience must be between 0-60 years");
    }
    if (!formData.hospitalAffiliation.trim()) errors.push("Hospital/clinic affiliation is required");

    if (errors.length > 0) {
      toast({
        title: "Please complete professional information",
        description: errors[0],
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validateAgreements = () => {
    if (!formData.agreeTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the Terms of Service",
        variant: "destructive"
      });
      return false;
    }
    
    if (!formData.agreePrivacy) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the Privacy Policy",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.agreeVerification) {
      toast({
        title: "Verification Agreement Required",
        description: "Please acknowledge the verification process",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) return;

    setIsLoading(true);

    try {
      console.log('🔄 Sending doctor signup request...');

      const response = await fetch(`${API_BASE}/auth/doctor-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phoneNumber: formData.phoneNumber.trim(),
          city: formData.city.trim(),
          state: formData.state,
          medicalLicenseNumber: formData.medicalLicenseNumber.trim(),
          specialization: formData.specialization,
          yearsOfExperience: formData.yearsOfExperience,
          hospitalAffiliation: formData.hospitalAffiliation.trim(),
          bio: formData.bio.trim(),
          consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : undefined,
          languages: formData.languages,
          availableDays: formData.availableDays,
          agreeTerms: formData.agreeTerms.toString(),
          agreePrivacy: formData.agreePrivacy.toString()
        })
      });

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
        // Use auth context to login doctor immediately
        login(data.user, data.token);
        
        console.log('✅ Doctor logged in via context:', data.user.firstName);
        
        toast({
          title: "Welcome Dr. " + data.user.firstName + "! 👨‍⚕️",
          description: "Doctor account created successfully! Your account is pending verification.",
        });

        // Redirect to doctor dashboard with verification notice
        navigate('/doctor-dashboard?newAccount=true');

      } else {
        throw new Error(data.message || data.error || 'Doctor signup failed');
      }

    } catch (error) {
      console.error('❌ Doctor signup error:', error);
      toast({
        title: "Signup Failed",
        description: (error as Error).message || "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderProfessionalInfo();
      case 3:
        return renderAvailabilityAndAgreements();
      default:
        return null;
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold">Personal Information</h3>
        <p className="text-muted-foreground">Basic details about you</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Dr. John"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            className="medical-input"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Smith"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            className="medical-input"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="doctor@hospital.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="medical-input pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+91 9876543210"
              value={formData.phoneNumber}
              onChange={(e) => updateField('phoneNumber', e.target.value)}
              className="medical-input pl-10"
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="city"
              type="text"
              placeholder="Mumbai"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              className="medical-input pl-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Select value={formData.state} onValueChange={(value) => updateField('state', value)}>
            <SelectTrigger className="medical-input">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {indianStates.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create strong password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="medical-input pl-10 pr-10"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Must contain uppercase, lowercase, and number
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              className="medical-input pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfessionalInfo = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold">Professional Information</h3>
        <p className="text-muted-foreground">Your medical credentials and expertise</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="medicalLicenseNumber">Medical License Number *</Label>
          <div className="relative">
            <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="medicalLicenseNumber"
              type="text"
              placeholder="MD123456"
              value={formData.medicalLicenseNumber}
              onChange={(e) => updateField('medicalLicenseNumber', e.target.value.toUpperCase())}
              className="medical-input pl-10"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Will be verified by our team
          </p>
        </div>
        <div className="space-y-2">
          <Label>Specialization *</Label>
          <Select value={formData.specialization} onValueChange={(value) => updateField('specialization', value)}>
            <SelectTrigger className="medical-input">
              <SelectValue placeholder="Select specialization" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {specializations.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="yearsOfExperience"
              type="number"
              placeholder="5"
              min="0"
              max="60"
              value={formData.yearsOfExperience}
              onChange={(e) => updateField('yearsOfExperience', e.target.value)}
              className="medical-input pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="consultationFee"
              type="number"
              placeholder="500"
              min="0"
              max="10000"
              step="50"
              value={formData.consultationFee}
              onChange={(e) => updateField('consultationFee', e.target.value)}
              className="medical-input pl-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hospitalAffiliation">Hospital/Clinic Affiliation *</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="hospitalAffiliation"
            type="text"
            placeholder="Apollo Hospital, Mumbai"
            value={formData.hospitalAffiliation}
            onChange={(e) => updateField('hospitalAffiliation', e.target.value)}
            className="medical-input pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Languages Spoken</Label>
        <div className="grid grid-cols-3 gap-2">
          {languages.map((lang) => (
            <div key={lang} className="flex items-center space-x-2">
              <Checkbox
                id={`lang-${lang}`}
                checked={formData.languages.includes(lang)}
                onCheckedChange={(checked) => updateArrayField('languages', lang, !!checked)}
              />
              <Label htmlFor={`lang-${lang}`} className="text-sm">
                {lang}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Professional Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell patients about your experience, approach to care, and specialties... (Optional)"
          value={formData.bio}
          onChange={(e) => updateField('bio', e.target.value)}
          className="medical-input min-h-[100px]"
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">
          {formData.bio.length}/1000 characters
        </p>
      </div>
    </div>
  );

  const renderAvailabilityAndAgreements = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold">Availability & Agreements</h3>
        <p className="text-muted-foreground">When are you available and final agreements</p>
      </div>

      <div className="space-y-4">
        <Label>Available Days (Optional)</Label>
        <div className="grid grid-cols-2 gap-2">
          {availableDays.map((day) => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={`day-${day}`}
                checked={formData.availableDays.includes(day)}
                onCheckedChange={(checked) => updateArrayField('availableDays', day, !!checked)}
              />
              <Label htmlFor={`day-${day}`} className="text-sm">
                {day}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          You can update this later in your profile
        </p>
      </div>

      {/* Verification Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900">Account Verification</h4>
            <p className="text-sm text-blue-700 mt-1">
              Your doctor account will need to be verified by our medical team. This process typically takes 1-3 business days. 
              You'll receive an email once verification is complete.
            </p>
          </div>
        </div>
      </div>

      {/* Agreements */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="agreeTerms"
            checked={formData.agreeTerms}
            onCheckedChange={(checked) => updateField('agreeTerms', !!checked)}
            className="mt-1"
          />
          <Label htmlFor="agreeTerms" className="text-sm leading-relaxed cursor-pointer">
            I agree to the{' '}
            <Link to="/doctor-terms" className="text-blue-600 hover:underline">
              Doctor Terms of Service
            </Link>{' '}
            and understand my responsibilities as a healthcare provider on this platform. *
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="agreePrivacy"
            checked={formData.agreePrivacy}
            onCheckedChange={(checked) => updateField('agreePrivacy', !!checked)}
            className="mt-1"
          />
          <Label htmlFor="agreePrivacy" className="text-sm leading-relaxed cursor-pointer">
            I acknowledge that I have read and agree to the{' '}
            <Link to="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>{' '}
            and understand how patient data will be handled. *
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="agreeVerification"
            checked={formData.agreeVerification}
            onCheckedChange={(checked) => updateField('agreeVerification', !!checked)}
            className="mt-1"
          />
          <Label htmlFor="agreeVerification" className="text-sm leading-relaxed cursor-pointer">
            I understand that my medical credentials will be verified and I consent to background checks 
            necessary for platform approval. *
          </Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 via-background to-green-50">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-green-500">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Join CureSight as a <span className="text-gradient bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">Doctor</span>
            </h1>
            <p className="text-muted-foreground">
              Create your professional account to connect with patients and provide AI-powered healthcare insights.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < totalSteps && (
                  <div className={`w-16 h-0.5 ${
                    step < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-16 text-xs text-muted-foreground">
            <span className={currentStep >= 1 ? 'text-blue-600' : ''}>Personal</span>
            <span className={currentStep >= 2 ? 'text-blue-600' : ''}>Professional</span>
            <span className={currentStep >= 3 ? 'text-blue-600' : ''}>Final</span>
          </div>
        </div>

        <Card className="medical-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Stethoscope className="h-5 w-5" />
              <span>Doctor Registration</span>
            </CardTitle>
            <CardDescription>
              Step {currentStep} of {totalSteps}: {
                currentStep === 1 ? 'Personal Information' :
                currentStep === 2 ? 'Professional Details' :
                'Availability & Agreements'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={currentStep === totalSteps ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                {currentStep > 1 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={prevStep}
                    className="px-8"
                  >
                    Previous
                  </Button>
                )}
                
                <div className="flex-1" />
                
                {currentStep < totalSteps ? (
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white px-8"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white px-8"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Create Doctor Account
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Sign In Links */}
              <div className="text-center text-sm text-muted-foreground mt-8 pt-6 border-t">
                <p className="mb-2">
                  Already have a doctor account?{' '}
                  <Link to="/doctor-signin" className="text-blue-600 hover:underline font-medium">
                    Sign in here
                  </Link>
                </p>
                <p>
                  Are you a patient?{' '}
                  <Link to="/signup" className="text-primary hover:underline font-medium">
                    Create patient account
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Professional Notice */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Important Notice:</strong> This platform is designed for licensed healthcare professionals only. 
                All doctor accounts undergo strict verification to ensure patient safety and maintain professional standards. 
                Providing false information may result in account suspension and legal action.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
