import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Shield, Clock, Users, Award } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-700/50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-90"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]"></div>
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">CureSight</span>
                <span className="text-sm text-slate-400 font-medium">AI Health Companion</span>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              CureSight combines AI-powered health analysis with expert medical guidance to provide comprehensive healthcare solutions at your fingertips.
            </p>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400">AI-Powered Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400">Verified Medical Data</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400">24/7 Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400">Healthcare Professional</span>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="flex space-x-3 pt-4">
              <a href="#" className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-all duration-300 group">
                <Facebook className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-all duration-300 group">
                <Twitter className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-all duration-300 group">
                <Instagram className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-all duration-300 group">
                <Linkedin className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-5">
            <h3 className="font-semibold text-white text-base">Services</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/symptom-checker" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Symptom Checker</span>
                </Link>
              </li>
              <li>
                <Link to="/report-analyzer" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Report Analyzer</span>
                </Link>
              </li>
              <li>
                <Link to="/find-doctors" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Find Doctors</span>
                </Link>
              </li>
              <li>
                <Link to="/medicine-comparison" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Medicine Store</span>
                </Link>
              </li>
              <li>
                <Link to="/daily-monitoring" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Lifestyle Hub</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-5">
            <h3 className="font-semibold text-white text-base">Support</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Help Center</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Terms of Service</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Privacy Policy</span>
                </a>
              </li>
              <li>
                <Link to="/emergency-practice" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Emergency Contacts</span>
                </Link>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>Health Records</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-5">
            <h3 className="font-semibold text-white text-base">Contact</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-blue-500/20 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Emergency Helpline:</p>
                  <p className="text-white font-semibold">108 (India)</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-blue-500/20 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Health Emergency:</p>
                  <p className="text-white font-semibold">102 (India)</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-blue-500/20 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Support Email:</p>
                  <p className="text-white">support@curesight.ai</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-blue-500/20 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Headquarters:</p>
                  <p className="text-white">Roorkee, UK, India</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-blue-500/20 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Support Hours:</p>
                  <p className="text-white">24/7 Available</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Healthcare Disclaimer */}
        <div className="mt-12 pt-8 border-t border-slate-700/50">
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/30 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-amber-900/50">
                <Shield className="h-5 w-5 text-amber-400" />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-amber-200">Healthcare Disclaimer</h4>
                <p className="text-sm text-amber-300/90 leading-relaxed">
                  <strong>Important:</strong> CureSight is an AI-powered health companion designed for informational purposes only. Our symptom checker and health insights are not a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for proper medical care. In case of medical emergencies, call emergency services immediately.
                </p>
                <p className="text-xs text-amber-400 font-medium">
                  🚨 Emergency: Call 911 or your local emergency services
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-700/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
            <p className="text-sm text-slate-400">
              © 2025 CureSight. All rights reserved.
            </p>
            <p className="text-xs text-slate-500">
              Made by <span className="font-semibold text-blue-400">Byte CodeX</span>
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>System Status: Operational</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};