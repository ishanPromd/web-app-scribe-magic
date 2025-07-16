import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faFileText, faRss, faBell, faUser, faPlay, faSignOutAlt,
  faBookOpen, faPlus, faEdit, faTrash, faArrowLeft, faArrowUp, faArrowDown, faVideo, faGift
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { PlyrPlayer } from '../user/PlyrPlayer';
import { VideoUploadModal } from '../user/VideoUploadModal';
import { SubjectManagementModal } from './SubjectManagementModal';
import { LessonManagementModal } from '../user/LessonManagementModal';
import { VideoEditModal } from './VideoEditModal';
import { getYouTubeThumbnail } from '../../utils/youtube';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface AdminFeedPageProps {
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
  contentType?: 'theory' | 'speed_revision';
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
  subjectId: string;
  created_at: string;
  position?: number;
  content_type?: 'theory' | 'speed_revision';
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

// Ripple Effect Hook
const useRipple = () => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now() + Math.random();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, 800);
  };

  return { ripples, createRipple };
};

// Ripple Component
const RippleEffect: React.FC<{ ripples: Array<{ x: number; y: number; id: number }> }> = ({ ripples }) => (
  <>
    {ripples.map(ripple => (
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
  </>
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

export const AdminFeedPage: React.FC<AdminFeedPageProps> = ({ onNavigate, activeTab, onPlayerModalToggle }) => {
  const { lessons, addLesson, deleteLesson } = useData();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [showVideoEdit, setShowVideoEdit] = useState(false);
  const [editingVideo, setEditingVideo] = useState<LessonVideo | null>(null);
  const [showSubjectManagement, setShowSubjectManagement] = useState(false);
  const [showLessonManagement, setShowLessonManagement] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentView, setCurrentView] = useState<'subjects' | 'lessons' | 'videos'>('subjects');
  const [contentType, setContentType] = useState<'theory' | 'speed_revision'>('theory');
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
  }, [user?.id, contentType, getDefaultSubjects]);

  useEffect(() => {
    if (user?.id && !dataLoaded) {
      loadSubjects();
    }
  }, [user?.id, dataLoaded, loadSubjects]);

  useEffect(() => {
    if (user?.id && dataLoaded) {
      loadSubjects();
    }
  }, [user?.id, contentType, loadSubjects]);

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

  const handleAddVideo = async (videoData: any) => {
    if (!selectedLesson || !selectedSubject) {
      toast.error('Please select a lesson first');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lesson_videos')
        .insert({
          title: videoData.title,
          description: videoData.description,
          youtube_url: videoData.youtubeUrl,
          thumbnail_url: videoData.thumbnailUrl,
          duration: videoData.duration,
          lesson_id: selectedLesson.id,
          subject_id: selectedSubject.id,
          position: selectedLesson.videos.length,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding video:', error);
        toast.error('Failed to add video to database');
        return;
      }

      toast.success('Video added successfully!');
      await loadSubjects();
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Failed to add video');
    }
  };

  const handleEditVideo = (video: LessonVideo) => {
    setEditingVideo(video);
    setShowVideoEdit(true);
  };

  const handleUpdateVideo = async (videoData: any) => {
    if (!editingVideo) return;

    try {
      const { error } = await supabase
        .from('lesson_videos')
        .update({
          title: videoData.title,
          description: videoData.description,
          youtube_url: videoData.youtubeUrl,
          thumbnail_url: videoData.thumbnailUrl,
          duration: videoData.duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingVideo.id);

      if (error) {
        console.error('Error updating video:', error);
        toast.error('Failed to update video');
        return;
      }

      toast.success('Video updated successfully!');
      await loadSubjects();
      setShowVideoEdit(false);
      setEditingVideo(null);
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video');
    }
  };

  const handleMoveVideo = async (videoId: string, direction: 'up' | 'down') => {
    if (!selectedLesson) return;

    const videos = [...selectedLesson.videos];
    const currentIndex = videos.findIndex(v => v.id === videoId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= videos.length) return;

    [videos[currentIndex], videos[newIndex]] = [videos[newIndex], videos[currentIndex]];

    try {
      for (let i = 0; i < videos.length; i++) {
        await supabase
          .from('lesson_videos')
          .update({ position: i })
          .eq('id', videos[i].id);
      }

      toast.success('Video position updated!');
      await loadSubjects();
    } catch (error) {
      console.error('Error updating video position:', error);
      toast.error('Failed to update video position');
    }
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

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        const { error } = await supabase
          .from('lesson_videos')
          .delete()
          .eq('id', videoId);

        if (error) {
          console.error('Error deleting video:', error);
          toast.error('Failed to delete video');
          return;
        }

        toast.success('Video deleted successfully!');
        await loadSubjects();
      } catch (error) {
        console.error('Error deleting video:', error);
        toast.error('Failed to delete video');
      }
    }
  };

  if (loading) {
    return <CustomLoader />;
  }

  const bottomNavItems = [
    { id: 'home', name: 'Home', icon: faHome }, 
    { id: 'recent', name: 'Papers', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss }, 
    { id: 'notifications', name: 'Notifications', icon: faBell },
    { id: 'profile', name: 'Profile', icon: faUser },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center space-x-3">
            {currentView !== 'subjects' && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={currentView === 'videos' ? handleBackToLessons : handleBackToSubjects}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 text-gray-600" />
              </motion.button>
            )}
            <div>
              {currentView === 'subjects' && (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Lessons</h1>
                  <p className="text-gray-600 text-sm">Manage content and lessons</p>
                </>
              )}
              {currentView === 'lessons' && selectedSubject && (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedSubject.name} Lessons</h1>
                  <p className="text-gray-600 text-sm">{selectedSubject.lessons.length} lessons available</p>
                </>
              )}
              {currentView === 'videos' && selectedLesson && (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedLesson.title}</h1>
                  <p className="text-gray-600 text-sm">{selectedLesson.videos.length} videos available</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentView === 'subjects' && (
              <Button 
                onClick={() => setShowSubjectManagement(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-2" />
                Manage Subjects
              </Button>
            )}
            {currentView === 'lessons' && (
              <Button 
                onClick={() => setShowLessonManagement(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                Add Lesson
              </Button>
            )}
            {currentView === 'videos' && (
              <Button 
                onClick={() => setShowVideoUpload(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                Add Video
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={signOut}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="w-3 h-3 mr-1" />
              Sign Out
            </Button>
          </div>
        </motion.div>

        {/* Content Type Switch - Only on subjects page */}
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
              onEditVideo={handleEditVideo}
              onDeleteVideo={handleDeleteVideo}
              onMoveVideo={handleMoveVideo}
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
                onClick={() => navigate(`/admin/${item.id === 'home' ? '' : item.id}`)}
                className={`relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id || (activeTab === 'lessons' && item.id === 'lessons')
                    ? 'text-blue-600 bg-blue-50 shadow-lg scale-105' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
                {(activeTab === item.id || (activeTab === 'lessons' && item.id === 'lessons')) && (
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

      {/* Modals */}
      <AnimatePresence>
        {showSubjectManagement && (
          <SubjectManagementModal
            subjects={subjects}
            contentType={contentType}
            onClose={() => setShowSubjectManagement(false)}
            onSave={async (updatedSubjects) => {
              await loadSubjects();
              setShowSubjectManagement(false);
            }}
          />
        )}
        {showLessonManagement && selectedSubject && (
          <LessonManagementModal
            subject={selectedSubject}
            contentType={contentType}
            onClose={() => setShowLessonManagement(false)}
            onSave={async (updatedSubject) => {
              await loadSubjects();
              setShowLessonManagement(false);
            }}
          />
        )}
        {showVideoUpload && (
          <VideoUploadModal
            onClose={() => setShowVideoUpload(false)}
            onSubmit={handleAddVideo}
            defaultCategory={selectedSubject?.name}
            contentType={contentType}
          />
        )}
        {showVideoEdit && editingVideo && (
          <VideoEditModal
            video={editingVideo}
            contentType={contentType}
            onClose={() => {
              setShowVideoEdit(false);
              setEditingVideo(null);
            }}
            onSubmit={handleUpdateVideo}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Subjects View Component with left/right gaps
const SubjectsView: React.FC<{ 
  subjects: Subject[]; 
  onSubjectClick: (subject: Subject) => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ subjects, onSubjectClick, loadingContainers, onContainerClick }) => {
  const { ripples, createRipple } = useRipple();

  if (subjects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FontAwesomeIcon icon={faBookOpen} className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Available</h3>
        <p className="text-gray-600 text-sm mb-4">Create your first subject to get started.</p>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject, index) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={(e) => {
              createRipple(e);
              onContainerClick(subject.id, () => onSubjectClick(subject));
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RippleEffect ripples={ripples} />
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

// Lessons View Component with left/right gaps
const LessonsView: React.FC<{ 
  subject: Subject; 
  onLessonClick: (lesson: Lesson) => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ subject, onLessonClick, loadingContainers, onContainerClick }) => {
  const { ripples, createRipple } = useRipple();

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
              createRipple(e);
              onContainerClick(lesson.id, () => onLessonClick(lesson));
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RippleEffect ripples={ripples} />
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
            <p className="text-gray-600 text-sm mb-4">Add your first lesson to this subject.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Videos View Component with left/right gaps and admin controls
const VideosView: React.FC<{ 
  lesson: Lesson; 
  onVideoClick: (video: LessonVideo) => void;
  onEditVideo: (video: LessonVideo) => void;
  onDeleteVideo: (videoId: string) => void;
  onMoveVideo: (videoId: string, direction: 'up' | 'down') => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ lesson, onVideoClick, onEditVideo, onDeleteVideo, onMoveVideo, loadingContainers, onContainerClick }) => {
  const { ripples, createRipple } = useRipple();

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
              createRipple(e);
              onContainerClick(video.id, () => onVideoClick(video));
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RippleEffect ripples={ripples} />
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

              {/* Admin Controls */}
              <div className="absolute top-3 left-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditVideo(video);
                  }}
                  className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center justify-center text-white transition-colors"
                >
                  <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteVideo(video.id);
                  }}
                  className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                </button>
              </div>

              {/* Position Controls */}
              <div className="absolute top-3 right-3 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveVideo(video.id, 'up');
                    }}
                    className="w-6 h-6 bg-green-500 hover:bg-green-600 rounded flex items-center justify-center text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faArrowUp} className="w-2 h-2" />
                  </button>
                )}
                {index < lesson.videos.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveVideo(video.id, 'down');
                    }}
                    className="w-6 h-6 bg-green-500 hover:bg-green-600 rounded flex items-center justify-center text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faArrowDown} className="w-2 h-2" />
                  </button>
                )}
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
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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
            <p className="text-gray-600 text-sm mb-4">Add your first video to this lesson.</p>
          </div>
        )}
      </div>
    </div>
  );
};