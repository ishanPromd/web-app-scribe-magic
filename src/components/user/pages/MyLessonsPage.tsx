import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faFileText, faRss, faBell, faUser, faPlay, faSignOutAlt,
  faChevronDown, faBookOpen, faPlus, faEdit, faTrash, faArrowLeft, faVideo, faGift
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../../hooks/useData';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../ui/Button';
import { PlyrPlayer } from '../PlyrPlayer';
import { extractVideoId, extractVideoDurationFromEmbed, getYouTubeThumbnail } from '../../../utils/youtube';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface MyLessonsPageProps {
  onNavigate: (tab: string) => void;
  activeTab: string;
  onPlayerModalToggle?: (isOpen: boolean) => void;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  imageUrl?: string;
  lessonCount: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  thumbnailUrl?: string;
  videoCount: number;
  videos: LessonVideo[];
  contentType?: 'theory' | 'speed_revision';
}

interface LessonVideo {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  thumbnail_url: string;
  duration: string;
  lessonId: string;
  created_at: string;
}

// Custom Loading Component
const CustomLoader: React.FC = () => (
  <div className="min-h-screen bg-white flex items-center justify-center px-4">
    <div className="text-center">
      <div className="loader mb-4"></div>
      <style jsx>{`
        .loader {
          width: fit-content;
          margin: 0 auto;
          font-size: 40px;
          font-family: monospace;
          font-weight: bold;
          text-transform: uppercase;
          color: #0000;
          -webkit-text-stroke: 1px #000;
          --g: conic-gradient(#000 0 0) no-repeat text;
          background: var(--g) 0, var(--g) 1ch, var(--g) 2ch, var(--g) 3ch, var(--g) 4ch, var(--g) 5ch, var(--g) 6ch;
          animation: l17-0 1s linear infinite alternate, l17-1 2s linear infinite;
        }
        .loader:before {
          content: "Loading";
        }
        @keyframes l17-0 {
          0% { background-size: 1ch 0; }
          100% { background-size: 1ch 100%; }
        }
        @keyframes l17-1 {
          0%, 50% { background-position-y: 100%, 0; }
          50.01%, to { background-position-y: 0, 100%; }
        }
      `}</style>
    </div>
  </div>
);

// Loading Line Component
const LoadingLine: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <AnimatePresence>
    {isLoading && (
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        exit={{ width: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 z-30 shadow-lg"
        style={{
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
        }}
      />
    )}
  </AnimatePresence>
);

export const MyLessonsPage: React.FC<MyLessonsPageProps> = ({ onNavigate, activeTab, onPlayerModalToggle }) => {
  const { lessons } = useData();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentView, setCurrentView] = useState<'subjects' | 'lessons' | 'videos'>('subjects');
  const [contentType, setContentType] = useState<'theory' | 'speed_revision'>('theory');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userAccess, setUserAccess] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingContainers, setLoadingContainers] = useState<Set<string>>(new Set());
  const [dataLoaded, setDataLoaded] = useState(false);

  const getDefaultSubjects = useCallback((): Subject[] => [
    {
      id: 'sft',
      name: 'SFT',
      description: 'Science for Technology - Core scientific principles',
      icon: '🔬',
      color: 'from-green-500 to-emerald-600',
      imageUrl: 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg',
      lessonCount: 0,
      lessons: []
    },
    {
      id: 'et',
      name: 'ET',
      description: 'Engineering Technology - Applied engineering concepts',
      icon: '⚙️',
      color: 'from-orange-500 to-amber-600',
      imageUrl: 'https://images.pexels.com/photos/159298/gears-cogs-machine-machinery-159298.jpeg',
      lessonCount: 0,
      lessons: []
    },
    {
      id: 'ict',
      name: 'ICT',
      description: 'Information & Communication Technology',
      icon: '💻',
      color: 'from-blue-500 to-indigo-600',
      imageUrl: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg',
      lessonCount: 0,
      lessons: []
    }
  ], []);

  const loadUserAccess = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: accessData, error } = await supabase
        .from('user_lesson_access')
        .select('lesson_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading user access:', error);
        return;
      }

      const accessSet = new Set(accessData?.map(item => item.lesson_id) || []);
      setUserAccess(accessSet);
      return accessSet;
    } catch (error) {
      console.error('Error loading user access:', error);
      setUserAccess(new Set());
      return new Set();
    }
  }, [user?.id]);

  const loadSubjects = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('created_at', { ascending: true });

      if (subjectsError) {
        console.log('Subjects table error, using default subjects:', subjectsError);
        setSubjects(getDefaultSubjects());
        setLoading(false);
        return;
      }

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('subject_lessons')
        .select('*')
        .order('created_at', { ascending: true });

      if (lessonsError) {
        console.error('Error loading lessons:', lessonsError);
      }

      const { data: videosData, error: videosError } = await supabase
        .from('lesson_videos')
        .select('*')
        .order('position', { ascending: true });

      if (videosError) {
        console.error('Error loading videos:', videosError);
      }

      // Filter subjects by content type first
      const filteredSubjects = (subjectsData || getDefaultSubjects()).filter(subject => {
        const subjectContentType = subject.content_type || 'theory';
        return subjectContentType === contentType;
      });

      const organizedSubjects = filteredSubjects.map(subject => {
        const subjectLessons = (lessonsData || [])
          .filter(lesson => lesson.subject_id === subject.id)
          .filter(lesson => userAccess.has(lesson.id))
          .filter(lesson => {
            const lessonContentType = lesson.content_type || 'theory';
            return lessonContentType === contentType;
          })
          .map(lesson => {
            const lessonVideos = (videosData || [])
              .filter(video => video.lesson_id === lesson.id)
              .map((video, index) => ({
                id: video.id,
                title: video.title,
                description: video.description,
                youtube_url: video.youtube_url,
                thumbnail_url: video.thumbnail_url,
                duration: video.duration,
                lessonId: lesson.id,
                subjectId: subject.id,
                created_at: video.created_at,
                position: video.position || index
              }));

            return {
              id: lesson.id,
              title: lesson.title,
              description: lesson.description,
              subjectId: subject.id,
              thumbnailUrl: lesson.thumbnail_url,
              videoCount: lessonVideos.length,
              videos: lessonVideos.sort((a, b) => (a.position || 0) - (b.position || 0)),
              contentType: lesson.content_type || 'theory'
            };
          });

        return {
          id: subject.id,
          name: subject.name,
          description: subject.description,
          icon: subject.icon,
          color: subject.color,
          imageUrl: subject.image_url,
          lessonCount: subjectLessons.length,
          lessons: subjectLessons
        };
      });

      setSubjects(organizedSubjects);
    } catch (error) {
      console.error('Error loading data:', error);
      setSubjects(getDefaultSubjects());
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  }, [user?.id, userAccess, contentType, getDefaultSubjects]);

  useEffect(() => {
    if (user?.id && !dataLoaded) {
      loadUserAccess().then(() => {
        console.log('User access loaded, now loading subjects');
      });
    }
  }, [user?.id, dataLoaded, loadUserAccess]);

  useEffect(() => {
    if (user?.id && userAccess.size >= 0) {
      loadSubjects();
    }
  }, [user?.id, userAccess, contentType, loadSubjects]);

  const openVideo = (video: LessonVideo) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
    onPlayerModalToggle?.(true);
  };

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
    onPlayerModalToggle?.(false);
  };

  const handleContainerClick = (id: string, action: () => void) => {
    setLoadingContainers(prev => new Set(prev).add(id));
    
    setTimeout(() => {
      setLoadingContainers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      action();
    }, 600);
  };

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentView('lessons');
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setCurrentView('videos');
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSelectedLesson(null);
    setCurrentView('subjects');
  };

  const handleBackToLessons = () => {
    setSelectedLesson(null);
    setCurrentView('lessons');
  };

  if (loading) {
    return <CustomLoader />;
  }

  const bottomNavItems = [
    { id: 'home', name: 'Home', icon: faHome }, 
    { id: 'recent', name: 'Recent', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss }, 
    { id: 'my-lessons', name: 'My Lessons', icon: faBookOpen },
    { id: 'notifications', name: 'Notifications', icon: faBell },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 py-4 pb-24"> {/* Reduced padding */}
        {/* Compact Header - Only show when on subjects view */}
        {currentView === 'subjects' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center justify-between mb-4"
          >
            
          </motion.div>
        )}

        {/* Back button for other views */}
        {currentView !== 'subjects' && (
          <div className="flex items-center mb-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={currentView === 'videos' ? handleBackToLessons : handleBackToSubjects}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 text-gray-600" />
            </motion.button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentView === 'lessons' && selectedSubject ? selectedSubject.name : 
                 currentView === 'videos' && selectedLesson ? selectedLesson.title : 'My Lessons'}
              </h1>
            </div>
          </div>
        )}

        {/* Content Type Switch - Only show on subjects view */}
        {currentView === 'subjects' && (
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-full p-1 flex items-center">
              <button
                onClick={() => setContentType('theory')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  contentType === 'theory'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Theory
              </button>
              <button
                onClick={() => setContentType('speed_revision')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  contentType === 'speed_revision'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Speed Revision
              </button>
            </div>
          </div>
        )}

        {/* Content based on current view */}
        <AnimatePresence mode="wait">
          {currentView === 'subjects' && (
            <SubjectsView 
              subjects={subjects} 
              onSubjectClick={handleSubjectClick}
              loadingContainers={loadingContainers}
              onContainerClick={handleContainerClick}
            />
          )}

          {currentView === 'lessons' && selectedSubject && (
            <LessonsView 
              subject={selectedSubject} 
              onLessonClick={handleLessonClick}
              loadingContainers={loadingContainers}
              onContainerClick={handleContainerClick}
            />
          )}

          {currentView === 'videos' && selectedLesson && (
            <VideosView 
              lesson={selectedLesson} 
              onVideoClick={openVideo}
              loadingContainers={loadingContainers}
              onContainerClick={handleContainerClick}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen Video Player */}
      <AnimatePresence>
        {showVideoPlayer && selectedVideo && (
          <PlyrPlayer
            videoUrl={selectedVideo.youtube_url}
            title={selectedVideo.title}
            onClose={closeVideoPlayer}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/50 z-50">
        <div className="w-full px-4">
          <nav className="flex justify-around py-2">
            {bottomNavItems.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/${item.id}`)}
                className={`relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? 'text-blue-600 bg-blue-50 shadow-lg scale-105' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-blue-100 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

// Subjects View Component with fixed ripple animation
const SubjectsView: React.FC<{ 
  subjects: Subject[]; 
  onSubjectClick: (subject: Subject) => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ subjects, onSubjectClick, loadingContainers, onContainerClick }) => {
  // Create individual ripple state for each subject
  const [ripples, setRipples] = useState<Map<string, Array<{ x: number; y: number; id: number }>>>(new Map());

  const createRipple = (subjectId: string, event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now() + Math.random();

    setRipples(prev => {
      const newRipples = new Map(prev);
      const subjectRipples = newRipples.get(subjectId) || [];
      newRipples.set(subjectId, [...subjectRipples, { x, y, id }]);
      return newRipples;
    });

    setTimeout(() => {
      setRipples(prev => {
        const newRipples = new Map(prev);
        const subjectRipples = newRipples.get(subjectId) || [];
        newRipples.set(subjectId, subjectRipples.filter(ripple => ripple.id !== id));
        return newRipples;
      });
    }, 800);
  };

  const subjectsWithLessons = subjects.filter(subject => subject.lessonCount > 0);
  const contentType = subjects[0]?.lessons[0]?.contentType || 'theory';

  if (subjectsWithLessons.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FontAwesomeIcon icon={faBookOpen} className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No {contentType === 'theory' ? 'Theory' : 'Speed Revision'} Content Available</h3>
        <p className="text-gray-600 text-sm mb-4">You haven't acquired access to any {contentType === 'theory' ? 'theory' : 'speed revision'} lessons yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjectsWithLessons.map((subject, index) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={(e) => {
              createRipple(subject.id, e);
              onContainerClick(subject.id, () => onSubjectClick(subject));
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Subject-specific ripple effects */}
            {ripples.get(subject.id)?.map(ripple => (
              <motion.div
                key={ripple.id}
                className="absolute bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-full pointer-events-none z-40"
                style={{
                  left: ripple.x - 100,
                  top: ripple.y - 100,
                  width: 200,
                  height: 200,
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            ))}
            
            <LoadingLine isLoading={loadingContainers.has(subject.id)} />
            
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <img 
                src={subject.imageUrl} 
                alt={subject.name} 
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => { 
                  e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Subject'; 
                }} 
              />
              
              <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm font-medium">
                {subject.lessonCount} Lessons
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-base line-clamp-1 leading-tight">
                  {subject.name}
                </h3>
              </div>

              <p className="text-gray-600 mb-3 leading-relaxed text-sm line-clamp-2">
                {subject.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`px-3 py-1 bg-gradient-to-r ${subject.color} text-white rounded-full font-semibold text-xs`}>
                    {subject.name}
                  </span>
                  <span>{subject.lessonCount} Lessons</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Lessons View Component with fixed ripple animation
const LessonsView: React.FC<{ 
  subject: Subject; 
  onLessonClick: (lesson: Lesson) => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ subject, onLessonClick, loadingContainers, onContainerClick }) => {
  // Create individual ripple state for each lesson
  const [ripples, setRipples] = useState<Map<string, Array<{ x: number; y: number; id: number }>>>(new Map());

  const createRipple = (lessonId: string, event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now() + Math.random();

    setRipples(prev => {
      const newRipples = new Map(prev);
      const lessonRipples = newRipples.get(lessonId) || [];
      newRipples.set(lessonId, [...lessonRipples, { x, y, id }]);
      return newRipples;
    });

    setTimeout(() => {
      setRipples(prev => {
        const newRipples = new Map(prev);
        const lessonRipples = newRipples.get(lessonId) || [];
        newRipples.set(lessonId, lessonRipples.filter(ripple => ripple.id !== id));
        return newRipples;
      });
    }, 800);
  };

  return (
    <div className="px-4 lg:px-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subject.lessons.map((lesson, index) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={(e) => {
              createRipple(lesson.id, e);
              onContainerClick(lesson.id, () => onLessonClick(lesson));
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Lesson-specific ripple effects */}
            {ripples.get(lesson.id)?.map(ripple => (
              <motion.div
                key={ripple.id}
                className="absolute bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-full pointer-events-none z-40"
                style={{
                  left: ripple.x - 100,
                  top: ripple.y - 100,
                  width: 200,
                  height: 200,
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            ))}
            
            <LoadingLine isLoading={loadingContainers.has(lesson.id)} />
            
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <img 
                src={lesson.thumbnailUrl || 'https://via.placeholder.com/320x180?text=Lesson'} 
                alt={lesson.title} 
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => { 
                  e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Lesson'; 
                }} 
              />
              
              <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm font-medium">
                {lesson.videoCount} Videos
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-base line-clamp-1 leading-tight">
                  {lesson.title}
                </h3>
              </div>

              <p className="text-gray-600 mb-3 leading-relaxed text-sm line-clamp-2">
                {lesson.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
                  <span>{lesson.videoCount} Videos</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {subject.lessons.length === 0 && (
          <div className="text-center py-12 col-span-full">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faBookOpen} className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Lessons Available</h3>
            <p className="text-gray-600 text-sm mb-4">You haven't acquired any lessons for this subject yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Videos View Component with fixed ripple animation
const VideosView: React.FC<{ 
  lesson: Lesson; 
  onVideoClick: (video: LessonVideo) => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ lesson, onVideoClick, loadingContainers, onContainerClick }) => {
  // Create individual ripple state for each video
  const [ripples, setRipples] = useState<Map<string, Array<{ x: number; y: number; id: number }>>>(new Map());

  const createRipple = (videoId: string, event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now() + Math.random();

    setRipples(prev => {
      const newRipples = new Map(prev);
      const videoRipples = newRipples.get(videoId) || [];
      newRipples.set(videoId, [...videoRipples, { x, y, id }]);
      return newRipples;
    });

    setTimeout(() => {
      setRipples(prev => {
        const newRipples = new Map(prev);
        const videoRipples = newRipples.get(videoId) || [];
        newRipples.set(videoId, videoRipples.filter(ripple => ripple.id !== id));
        return newRipples;
      });
    }, 800);
  };

  return (
    <div className="px-4 lg:px-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lesson.videos.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={(e) => {
              createRipple(video.id, e);
              onContainerClick(video.id, () => onVideoClick(video));
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Video-specific ripple effects */}
            {ripples.get(video.id)?.map(ripple => (
              <motion.div
                key={ripple.id}
                className="absolute bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-full pointer-events-none z-40"
                style={{
                  left: ripple.x - 100,
                  top: ripple.y - 100,
                  width: 200,
                  height: 200,
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            ))}
            
            <LoadingLine isLoading={loadingContainers.has(video.id)} />
            
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <img 
                src={video.thumbnail_url || getYouTubeThumbnail(video.youtube_url)} 
                alt={video.title} 
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => { 
                  e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Video'; 
                }} 
              />
              
              {/* Duration Badge */}
              <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm font-medium">
                {video.duration}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-base line-clamp-1 leading-tight">
                  {video.title}
                </h3>
              </div>

              <p className="text-gray-600 mb-3 leading-relaxed text-sm line-clamp-2">
                {video.description}
              </p>

              {/* Tags Section */}
              <div className="flex items-center justify-between pt-3 ">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    <FontAwesomeIcon icon={faVideo} className="w-3 h-3 mr-1" />
                    Video
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Free Tag */}
                  <div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    <FontAwesomeIcon icon={faGift} className="w-3 h-3 mr-1" />
                    Free
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {lesson.videos.length === 0 && (
          <div className="text-center py-12 col-span-full">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faPlay} className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Videos Yet</h3>
            <p className="text-gray-600 text-sm mb-4">This lesson doesn't have any videos yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};