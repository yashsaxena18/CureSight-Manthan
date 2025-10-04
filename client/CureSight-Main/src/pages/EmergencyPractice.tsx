import { useState, useEffect } from 'react';
import { 
  Play, 
  Clock, 
  Users, 
  Heart, 
  AlertTriangle,
  Pill,
  Phone,
  CheckCircle2,
  BookOpen,
  Download,
  ExternalLink,
  Star,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';

const emergencyVideos = [
  {
    id: 1,
    title: 'How to Perform CPR in 2025: A Life-Saving Guide',
    duration: '3:24',
    difficulty: 'Essential',
    views: '15.2K',
    description: 'Comprehensive CPR tutorial covering basic techniques for adults, children, and infants.',
    useCase: 'When someone is unconscious and not breathing normally.',
    videoId: 'rLJ3hLpp0BU',
    category: 'Cardiac',
    rating: 4.9,
    instructor: 'Illinois Safety CPR'
  },
  {
    id: 2,
    title: 'Learn How to Save a Life in 5 Minutes! (2025)',
    duration: '4:43',
    difficulty: 'Essential',
    views: '2.1M',
    description: 'Quick 5-minute training covering CPR, AED, and First Aid.',
    useCase: 'Complete emergency response training.',
    videoId: 'lgeBdGqoBUs',
    category: 'Cardiac',
    rating: 4.8,
    instructor: 'Save a Life Certifications'
  },
  {
    id: 3,
    title: 'How to Perform CPR - Step-by-Step Guide',
    duration: '3:50',
    difficulty: 'Essential',
    views: '892K',
    description: 'Detailed step-by-step CPR demonstration.',
    useCase: 'For cardiac arrest situations.',
    videoId: 'Plse2FOkV4Q',
    category: 'Cardiac',
    rating: 4.7,
    instructor: 'Victor Chang Cardiac Research Institute'
  }
];

const emergencyMedicines = [
  {
    name: 'Epinephrine Auto-Injector (EpiPen)',
    use: 'Severe allergic reactions (anaphylaxis)',
    dosage: 'Adult: 0.3mg, Child: 0.15mg',
    instructions: 'Remove safety cap, inject into outer thigh through clothing if necessary, hold firmly for 3 seconds',
    warning: 'Call 911 immediately after use.'
  },
  {
    name: 'Aspirin',
    use: 'Suspected heart attack (chest pain)',
    dosage: '325mg (chewable) once',
    instructions: 'Chew and swallow immediately while waiting for emergency services',
    warning: 'Do not use if allergic to aspirin or advised against by a doctor.'
  },
  {
    name: 'Nitroglycerin (Sublingual Tablet)',
    use: 'Chest pain/angina',
    dosage: '0.3–0.6 mg under the tongue every 5 minutes as needed (max 3 doses in 15 minutes)',
    instructions: 'Place under the tongue and allow to dissolve',
    warning: 'Do not use with erectile dysfunction drugs (Viagra, Cialis).'
  },
  {
    name: 'Albuterol Inhaler',
    use: 'Asthma attack or difficulty breathing',
    dosage: '2 puffs every 4–6 hours as needed',
    instructions: 'Shake well, exhale fully, place mouthpiece in mouth, press inhaler while breathing in deeply',
    warning: 'Seek emergency help if not relieved after use.'
  },
  {
    name: 'Glucose Tablets / Gel',
    use: 'Low blood sugar (hypoglycemia)',
    dosage: '15–20 grams orally',
    instructions: 'Chew tablets or swallow gel, recheck blood sugar after 15 minutes',
    warning: 'Only for conscious patients able to swallow.'
  },
  {
    name: 'Naloxone (Narcan)',
    use: 'Opioid overdose (unconsciousness, slow breathing)',
    dosage: 'Nasal spray: 1 spray into one nostril; may repeat every 2–3 minutes if needed',
    instructions: 'Lay person on back, spray into nostril, call emergency services immediately',
    warning: 'Effects are temporary, must seek emergency help.'
  },
  {
    name: 'Diazepam (Rectal Gel)',
    use: 'Severe seizure (status epilepticus)',
    dosage: 'Varies by age/weight (commonly 5–20mg)',
    instructions: 'Administer rectally using prefilled applicator',
    warning: 'Only for use under doctor’s guidance, seek emergency help.'
  },
  {
    name: 'Morphine / Fentanyl (Injectable)',
    use: 'Severe trauma or pain (paramedic use)',
    dosage: 'Varies by protocol (typically 2–10mg IV morphine)',
    instructions: 'Administer only by trained healthcare provider',
    warning: 'Risk of respiratory depression, use only in medical settings.'
  }
];


const emergencyContacts = [
  { service: 'Emergency Services', number: '911', description: 'Police, Fire, Ambulance - Life threatening emergencies' },
  { service: 'Poison Control', number: '1-800-222-1222', description: '24/7 Poison emergencies and guidance' }
];

export default function EmergencyPractice() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const categories = ['All', 'Cardiac', 'Airway', 'Trauma', 'Neurological', 'Allergic'];
  const [activeTab, setActiveTab] = useState('tutorials');

  const filteredVideos = selectedCategory === 'All' 
    ? emergencyVideos 
    : emergencyVideos.filter(video => video.category === selectedCategory);

  // Track user interaction to enable sound
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Essential': return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const openVideoModal = (video) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
    setPlayingVideo(null);
  };

  const enableSound = () => {
    setSoundEnabled(true);
    setUserInteracted(true);
  };

  const VideoModal = () => {
    if (!selectedVideo || !showVideoModal) return null;
    
    // Determine if we should start with sound based on user interaction
    const shouldHaveSound = userInteracted && soundEnabled;
    const videoParams = shouldHaveSound 
      ? `autoplay=1&rel=0&modestbranding=1&controls=1&enablejsapi=1`
      : `autoplay=1&mute=1&rel=0&modestbranding=1&controls=1&enablejsapi=1`;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">{selectedVideo.title}</h3>
            <button 
              onClick={closeVideoModal}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube-nocookie.com/embed/${selectedVideo.videoId}?${videoParams}`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                className="w-full h-full"
              />
            </div>
            <div className="mt-4 space-y-3">
              {!soundEnabled && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <VolumeX className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">Sound is muted by browser policy</p>
                        <p className="text-sm text-blue-600">Click to enable sound for all videos</p>
                      </div>
                    </div>
                    <button
                      onClick={enableSound}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Volume2 className="h-4 w-4" />
                      <span>Enable Sound</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{selectedVideo.duration}</span>
                <span className="flex items-center"><Users className="h-4 w-4 mr-1" />{selectedVideo.views} views</span>
                <span className="flex items-center"><Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />{selectedVideo.rating}</span>
              </div>
              <p className="text-gray-700">{selectedVideo.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const VideoPlayer = ({ videoId, title, onClick }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showIframe, setShowIframe] = useState(false);

    const handlePlayClick = (e) => {
      e.stopPropagation();
      setShowIframe(true);
      setIsPlaying(true);
      setPlayingVideo(videoId);
      
      // Mark that user has interacted
      setUserInteracted(true);
    };

    if (showIframe || playingVideo === videoId) {
      const shouldHaveSound = userInteracted && soundEnabled;
      const videoParams = shouldHaveSound 
        ? `autoplay=1&rel=0&modestbranding=1&controls=1&enablejsapi=1`
        : `autoplay=1&mute=1&rel=0&modestbranding=1&controls=1&enablejsapi=1`;

      return (
        <div className="aspect-video rounded-lg overflow-hidden shadow-lg relative bg-black">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?${videoParams}`}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
            className="w-full h-full"
          />
          {!soundEnabled && (
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
              <VolumeX className="h-3 w-3" />
              <span>Muted - Click sound icon to unmute</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="aspect-video rounded-lg overflow-hidden shadow-lg relative cursor-pointer group bg-black">
        <img 
          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <button 
            onClick={handlePlayClick}
            className="bg-red-600 hover:bg-red-700 rounded-full p-4 shadow-lg transform hover:scale-110 transition-all duration-200"
          >
            <Play className="h-8 w-8 text-white" />
          </button>
        </div>
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          Click to play video
        </div>
        <div 
          onClick={onClick}
          className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded hover:bg-opacity-90 transition-all duration-200 flex items-center space-x-1 text-sm cursor-pointer"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Fullscreen</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-orange-500 shadow-lg">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Emergency <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Practice</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Master life-saving techniques through expert-led video tutorials and comprehensive emergency preparedness guides.
          </p>
        </div>

        {/* Custom Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white rounded-lg shadow-sm p-1">
            {['tutorials', 'medicines', 'contacts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 text-center font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab === 'tutorials' && 'Video Tutorials'}
                {tab === 'medicines' && 'Emergency Medicines'}
                {tab === 'contacts' && 'Emergency Contacts'}
              </button>
            ))}
          </div>
        </div>

        {/* Video Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <div className="space-y-8">
            {/* Sound Enable Notice */}
            {!soundEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <VolumeX className="h-6 w-6 text-amber-600" />
                    <div>
                      <h3 className="font-medium text-amber-800 mb-1">Videos will play muted</h3>
                      <p className="text-sm text-amber-700">
                        This is normal browser behavior for autoplay videos. You can enable sound by clicking the button below or using the sound controls in each video player.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={enableSound}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors font-medium"
                  >
                    <Volume2 className="h-5 w-5" />
                    <span>Enable Sound</span>
                  </button>
                </div>
              </div>
            )}

            {soundEnabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Volume2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-700">
                    <strong>Sound enabled!</strong> New videos will play with audio. You can still use the video controls to adjust volume.
                  </p>
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-2">Emergency Categories</h2>
              <p className="text-gray-600 mb-4">Filter tutorials by emergency type to find what you need</p>
              <div className="flex flex-wrap gap-3">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      selectedCategory === category 
                        ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Video List */}
            <div className="space-y-8">
              {filteredVideos.map((video) => (
                <div key={video.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="grid lg:grid-cols-3 gap-0">
                    {/* Video Section */}
                    <div className="lg:col-span-2 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">{video.title}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(video.difficulty)}`}>
                          {video.difficulty}
                        </span>
                      </div>
                      
                      <VideoPlayer 
                        videoId={video.videoId} 
                        title={video.title} 
                        onClick={() => openVideoModal(video)}
                      />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{video.duration}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{video.views} views</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{video.rating}</span>
                          </div>
                        </div>
                        <a 
                          href={`https://youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>YouTube</span>
                        </a>
                      </div>
                    </div>

                    {/* Information Panel */}
                    <div className="bg-gray-50 p-6 space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                          When to Use
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {video.useCase}
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                          What You'll Learn
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {video.description}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Instructor:</span>
                          <span className="text-sm text-gray-900">{video.instructor}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Category:</span>
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-700">
                            {video.category}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => openVideoModal(video)}
                        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Watch Full Screen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs remain the same... */}
        {activeTab === 'medicines' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Pill className="h-6 w-6 text-blue-500" />
                <h2 className="text-xl font-bold">Essential Emergency Medications</h2>
              </div>
              <div className="space-y-6">
                {emergencyMedicines.map((medicine, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-6">
                    <h4 className="font-bold text-xl text-gray-900 mb-4">{medicine.name}</h4>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <p className="font-semibold text-gray-700 mb-2">Use Case</p>
                        <p className="text-gray-600 text-sm">{medicine.use}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 mb-2">Dosage</p>
                        <p className="text-gray-600 text-sm">{medicine.dosage}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 mb-2">Instructions</p>
                        <p className="text-gray-600 text-sm">{medicine.instructions}</p>
                      </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                      <p className="text-sm text-yellow-700"><strong>Warning:</strong> {medicine.warning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Phone className="h-6 w-6 text-green-500" />
                <h2 className="text-xl font-bold">Emergency Contact Numbers</h2>
              </div>
              <div className="space-y-4">
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-6 border border-gray-200 rounded-xl">
                    <div>
                      <p className="font-bold text-lg text-gray-900">{contact.service}</p>
                      <p className="text-gray-600">{contact.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{contact.number}</p>
                      <a 
                        href={`tel:${contact.number.replace(/\D/g, '')}`}
                        className="inline-flex items-center px-4 py-2 border rounded-lg text-sm hover:bg-red-50"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Now
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Modal */}
      <VideoModal />
    </div>
  );
}
