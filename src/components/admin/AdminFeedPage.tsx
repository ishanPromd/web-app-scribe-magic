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
      <style>{`
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
      const { error } = await supabase
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
          duration: videoData.duration
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

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

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
  };

  const handleMoveVideo = async (videoId: string, direction: 'up' | 'down') => {
    if (!selectedLesson) return;

    const videos = [...selectedLesson.videos];
    const currentIndex = videos.findIndex(v => v.id === videoId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= videos.length) return;

    // Swap positions
    [videos[currentIndex], videos[newIndex]] = [videos[newIndex], videos[currentIndex]];

    try {
      // Update positions in database
      const updates = videos.map((video, index) => ({
        id: video.id,
        position: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('lesson_videos')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating video position:', error);
          toast.error('Failed to update video order');
          return;
        }
      }

      toast.success('Video order updated!');
      await loadSubjects();
    } catch (error) {
      console.error('Error updating video order:', error);
      toast.error('Failed to update video order');
    }
  };

  const handleSubjectSelect = (subject: Subject) => {
    handleContainerClick(subject.id, () => {
      setSelectedSubject(subject);
      setCurrentView('lessons');
    });
  };

  const handleLessonSelect = (lesson: Lesson) => {
    handleContainerClick(lesson.id, () => {
      setSelectedLesson(lesson);
      setCurrentView('videos');
    });
  };

  const handleBackToSubjects = () => {
    setCurrentView('subjects');
    setSelectedSubject(null);
    setSelectedLesson(null);
  };

  const handleBackToLessons = () => {
    setCurrentView('lessons');
    setSelectedLesson(null);
  };

  const handleAddSubject = () => {
    setShowSubjectManagement(true);
  };

  const handleAddLesson = () => {
    if (!selectedSubject) {
      toast.error('Please select a subject first');
      return;
    }
    setShowLessonManagement(true);
  };

  const handleAddVideoClick = () => {
    if (!selectedLesson) {
      toast.error('Please select a lesson first');
      return;
    }
    setShowVideoUpload(true);
  };

  if (loading) {
    return <CustomLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {currentView !== 'subjects' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={currentView === 'lessons' ? handleBackToSubjects : handleBackToLessons}
                  className="flex items-center space-x-2"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                  <span>Back</span>
                </Button>
              )}
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentView === 'subjects' && 'Content Management'}
                  {currentView === 'lessons' && selectedSubject?.name}
                  {currentView === 'videos' && selectedLesson?.title}
                </h1>
                <p className="text-sm text-gray-600">
                  {currentView === 'subjects' && `Manage ${contentType === 'theory' ? 'Theory' : 'Speed Revision'} content`}
                  {currentView === 'lessons' && `${selectedSubject?.lessons.length || 0} lessons`}
                  {currentView === 'videos' && `${selectedLesson?.videos.length || 0} videos`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Content Type Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setContentType('theory')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    contentType === 'theory'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Theory
                </button>
                <button
                  onClick={() => setContentType('speed_revision')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    contentType === 'speed_revision'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Speed Revision
                </button>
              </div>

              {/* Add Button */}
              <Button
                onClick={() => {
                  if (currentView === 'subjects') handleAddSubject();
                  else if (currentView === 'lessons') handleAddLesson();
                  else if (currentView === 'videos') handleAddVideoClick();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                Add {currentView === 'subjects' ? 'Subject' : currentView === 'lessons' ? 'Lesson' : 'Video'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* Subjects View */}
          {currentView === 'subjects' && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {subjects.map((subject) => (
                <motion.div
                  key={subject.id}
                  className="relative group cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSubjectSelect(subject)}
                >
                  <div className={`bg-gradient-to-br ${subject.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${
                    loadingContainers.has(subject.id) ? 'animate-pulse' : ''
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-3xl">{subject.icon}</div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{subject.lessonCount}</div>
                        <div className="text-sm opacity-90">Lessons</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{subject.name}</h3>
                    <p className="text-sm opacity-90">{subject.description}</p>
                  </div>
                  
                  {loadingContainers.has(subject.id) && (
                    <div className="absolute inset-0 bg-white/20 rounded-2xl flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Lessons View */}
          {currentView === 'lessons' && selectedSubject && (
            <motion.div
              key="lessons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {selectedSubject.lessons.map((lesson) => (
                <motion.div
                  key={lesson.id}
                  className="relative group cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLessonSelect(lesson)}
                >
                  <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 ${
                    loadingContainers.has(lesson.id) ? 'animate-pulse' : ''
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <FontAwesomeIcon icon={faBookOpen} className="text-2xl text-blue-600" />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{lesson.videoCount}</div>
                        <div className="text-sm text-gray-600">Videos</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{lesson.title}</h3>
                    <p className="text-sm text-gray-600">{lesson.description}</p>
                  </div>
                  
                  {loadingContainers.has(lesson.id) && (
                    <div className="absolute inset-0 bg-white/20 rounded-2xl flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Videos View */}
          {currentView === 'videos' && selectedLesson && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {selectedLesson.videos.length === 0 ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faVideo} className="text-6xl text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No videos yet</h3>
                  <p className="text-gray-600 mb-6">Start by adding your first video to this lesson</p>
                  <Button
                    onClick={handleAddVideoClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                    Add First Video
                  </Button>
                </div>
              ) : (
                selectedLesson.videos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={video.thumbnail_url || getYouTubeThumbnail(video.youtube_url)}
                          alt={video.title}
                          className="w-32 h-20 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => openVideo(video)}
                          className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <FontAwesomeIcon icon={faPlay} className="text-white text-xl" />
                        </button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{video.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Duration: {video.duration}</span>
                          <span>Position: {(video.position || 0) + 1}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveVideo(video.id, 'up')}
                          disabled={index === 0}
                        >
                          <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveVideo(video.id, 'down')}
                          disabled={index === selectedLesson.videos.length - 1}
                        >
                          <FontAwesomeIcon icon={faArrowDown} className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditVideo(video)}
                        >
                          <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showVideoPlayer && selectedVideo && (
          <PlyrPlayer
            video={selectedVideo}
            onClose={closeVideoPlayer}
            onNext={() => {}}
            onPrevious={() => {}}
            hasNext={false}
            hasPrevious={false}
          />
        )}

        {showVideoUpload && (
          <VideoUploadModal
            onClose={() => setShowVideoUpload(false)}
            onUpload={handleAddVideo}
            lessonTitle={selectedLesson?.title || ''}
          />
        )}

        {showVideoEdit && editingVideo && (
          <VideoEditModal
            video={editingVideo}
            onClose={() => {
              setShowVideoEdit(false);
              setEditingVideo(null);
            }}
            onUpdate={handleUpdateVideo}
          />
        )}

        {showSubjectManagement && (
          <SubjectManagementModal
            onClose={() => setShowSubjectManagement(false)}
            onSubjectAdded={loadSubjects}
            contentType={contentType}
          />
        )}

        {showLessonManagement && selectedSubject && (
          <LessonManagementModal
            subject={selectedSubject}
            onClose={() => setShowLessonManagement(false)}
            onLessonAdded={loadSubjects}
            contentType={contentType}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
