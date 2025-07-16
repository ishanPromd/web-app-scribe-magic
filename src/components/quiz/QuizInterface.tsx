import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  ZoomIn,
  Maximize2,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/Button';
import { Quiz, QuizSession, QuizResponse } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface QuizInterfaceProps {
  quiz: Quiz;
  onComplete: (session: QuizSession) => void;
  onExit: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ quiz, onComplete, onExit }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Initialize quiz session
  const startQuiz = useCallback(() => {
    const newSession: QuizSession = {
      quiz,
      currentQuestionIndex: 0,
      responses: [],
      startTime: new Date(),
      timeRemaining: quiz.timeLimit * 60,
      isCompleted: false,
    };
    setSession(newSession);
    setTimeRemaining(newSession.timeRemaining);
    setShowStartScreen(false);
    setSelectedAnswer(null);
    setResponses([]);
  }, [quiz]);

  // Timer effect
  useEffect(() => {
    if (!session || session.isCompleted || showStartScreen) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, showStartScreen]);

  const handleTimeUp = useCallback(() => {
    if (!session) return;
    
    if (selectedAnswer !== null) {
      handleNextQuestion();
    }
    
    const completedSession: QuizSession = {
      ...session,
      responses: responses,
      isCompleted: true,
      timeRemaining: 0,
    };
    setSession(completedSession);
    onComplete(completedSession);
    toast.error('Time\'s up! Paper submitted automatically.');
  }, [session, selectedAnswer, responses, onComplete]);

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (!session || selectedAnswer === null) return;

    const currentQuestion = session.quiz.questions[session.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    const response: QuizResponse = {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
      timeSpent: 30,
    };

    const updatedResponses = [...responses, response];
    setResponses(updatedResponses);
    
    if (session.currentQuestionIndex < session.quiz.questions.length - 1) {
      setSession({
        ...session,
        currentQuestionIndex: session.currentQuestionIndex + 1,
        responses: updatedResponses,
      });
      setSelectedAnswer(null);
    } else {
      const completedSession: QuizSession = {
        ...session,
        responses: updatedResponses,
        isCompleted: true,
        timeRemaining,
      };
      setSession(completedSession);
      onComplete(completedSession);
    }
  };

  const handleSubmitQuiz = () => {
    if (!session || selectedAnswer === null) return;

    const currentQuestion = session.quiz.questions[session.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    const response: QuizResponse = {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
      timeSpent: 30,
    };

    const updatedResponses = [...responses, response];
    
    const completedSession: QuizSession = {
      ...session,
      responses: updatedResponses,
      isCompleted: true,
      timeRemaining,
    };
    setSession(completedSession);
    onComplete(completedSession);
  };

  const handlePreviousQuestion = () => {
    if (!session || session.currentQuestionIndex === 0) return;
    
    // Remove the current question's response if going back
    const updatedResponses = responses.slice(0, session.currentQuestionIndex);
    setResponses(updatedResponses);
    
    // Get the previous response to restore the selected answer
    const previousResponseIndex = session.currentQuestionIndex - 1;
    const previousResponse = updatedResponses[previousResponseIndex];
    
    setSession({
      ...session,
      currentQuestionIndex: session.currentQuestionIndex - 1,
      responses: updatedResponses,
    });
    
    // Set the previous answer if it exists
    setSelectedAnswer(previousResponse?.selectedAnswer ?? null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExit = () => {
    if (session && !session.isCompleted) {
      setShowConfirmExit(true);
    } else {
      onExit();
    }
  };

  const confirmExit = () => {
    setShowConfirmExit(false);
    onExit();
  };

  const handleImageClick = (imageUrl: string) => {
    if (!imageUrl) return;
    setModalImageUrl(imageUrl);
    setImageLoading(true);
    setImageError(false);
    setShowImageModal(true);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImageUrl('');
    setImageLoading(false);
    setImageError(false);
  };

  if (showStartScreen) {
    const introduction = quiz.introduction || {
      title: 'උපදේශ පත්‍රකාව',
      subtitle: 'Paper Introduction',
      instructions: [
        'නිවැරදි පිළිතුර ලබා දෙන්න.',
        'මුලු ප්‍රශ්න ගණන 50 කි.',
        'ප්‍රශ්නයට (1) (2) (3) (4) (5) යන පිළිතුරු වලින් පිළිතුර තෝරාගෙන, එය අසලින් ලබාදී ඇති Dot (⦿) සලකුණ Click කරන්න.'
      ],
      buttonText: 'Start'
    };

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full"
        >
          <div className="p-6 text-left bg-white border border-gray-200 rounded-3xl shadow-lg relative overflow-hidden">
            <button
              onClick={onExit}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            <h1 className="text-xl font-bold text-gray-900 mb-4 font-sinhala pr-8">
              {introduction.title}
            </h1>

            <div className="w-full h-px bg-gray-200 mb-4"></div>

            <h2 className="text-lg font-semibold text-gray-700 mb-4 font-sinhala">
              {introduction.subtitle}
            </h2>

            <div className="space-y-3 mb-6">
              {introduction.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0">⦿</div>
                  <p className="text-sm text-gray-700 font-sinhala leading-relaxed">
                    {instruction}
                  </p>
                </div>
              ))}
            </div>

            <Button 
              onClick={startQuiz} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 text-base font-semibold font-sinhala shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {introduction.buttonText}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!session) return null;

  const currentQuestion = session.quiz.questions[session.currentQuestionIndex];
  const isLastQuestion = session.currentQuestionIndex === session.quiz.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Close Button */}
      <div className="px-4 py-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={handleExit}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>

          {/* Timer Display */}
          <div className="bg-white rounded-full px-4 py-2 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className={`font-mono font-bold text-sm ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          {/* Question Counter */}
          <div className="text-center">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              Question {session.currentQuestionIndex + 1} of {session.quiz.questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={session.currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Question Image - Mobile First, Responsive */}
            {currentQuestion.imageUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900">Question Image</h3>
                    <button
                      onClick={() => handleImageClick(currentQuestion.imageUrl!)}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">View Full Size</span>
                      <span className="sm:hidden">Zoom</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 lg:p-8 bg-gray-50">
                  <div className="relative group cursor-pointer" onClick={() => handleImageClick(currentQuestion.imageUrl!)}>
                    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
                      <img 
                        src={currentQuestion.imageUrl} 
                        alt="Question illustration" 
                        className="w-full h-auto max-h-[300px] sm:max-h-[400px] lg:max-h-[500px] object-contain hover:opacity-90 transition-opacity"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Zoom overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                        <ZoomIn className="w-6 h-6 text-gray-700" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Question Text Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 lg:p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Question {session.currentQuestionIndex + 1}
                </h3>
                <div className="text-sm text-gray-500">
                  {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                </div>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight">
                {currentQuestion.question}
              </h2>
            </motion.div>

            {/* Answer Options Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 lg:p-6"
            >
              <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">Select your answer:</h3>
              <div className="space-y-3">
                {currentQuestion.options.slice(0, 5).map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full p-3 lg:p-4 text-left rounded-lg transition-all duration-200 border-2 ${
                      selectedAnswer === index
                        ? 'bg-blue-50 border-blue-500 shadow-md'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 lg:space-x-4">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm lg:text-base flex-shrink-0 ${
                        selectedAnswer === index
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300 text-gray-600'
                      }`}>
                        {String.fromCharCode(49 + index)}
                      </div>
                      <span className="text-sm lg:text-base font-medium text-gray-900 flex-1 leading-relaxed">
                        {option}
                      </span>
                      <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedAnswer === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedAnswer === index && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 lg:w-4 lg:h-4 bg-white rounded-full"
                          />
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 lg:py-6 border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <motion.button
              
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePreviousQuestion}
              disabled={session.currentQuestionIndex === 0}
              className="flex items-center space-x-2 lg:space-x-3 px-4 lg:px-8 py-3 lg:py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </motion.button>

            <div className="text-center">
              <div className="text-xs lg:text-sm text-gray-600 mb-1">Progress</div>
              <div className="w-40 lg:w-80 bg-gray-200 rounded-full h-2 lg:h-3">
                <div 
                  className="bg-blue-600 h-2 lg:h-3 rounded-full transition-all duration-300"
                  style={{ width: `${((session.currentQuestionIndex + 1) / session.quiz.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {isLastQuestion ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmitQuiz}
                disabled={selectedAnswer ===  null}
                className="flex items-center space-x-2 lg:space-x-3 px-4 lg:px-8 py-3 lg:py-4 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
                <span>Submit Paper</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null}
                className="flex items-center space-x-2 lg:space-x-3 px-4 lg:px-8 py-3 lg:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Full Screen Image Modal */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
            onClick={closeImageModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeImageModal}
                className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10 shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Loading state */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-white text-sm">Loading image...</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {imageError && (
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center">
                  <div className="text-red-400 mb-4">
                    <X className="w-12 h-12 mx-auto" />
                  </div>
                  <p className="text-white text-lg font-medium mb-2">Failed to load image</p>
                  <p className="text-white/80 text-sm">The image could not be displayed</p>
                </div>
              )}

              {/* Image */}
              {modalImageUrl && (
                <img
                  src={modalImageUrl}
                  alt="Full size question image"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  style={{ display: imageLoading || imageError ? 'none' : 'block' }}
                />
              )}

              {/* Image info */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2  bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <p className="text-white text-sm font-medium">
                  Question {session.currentQuestionIndex + 1} Image
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Exit Modal */}
      <AnimatePresence>
        {showConfirmExit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center">
                <div className="w-12 h-12 text-amber-500 mx-auto mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Exit Paper?</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Your progress will be lost if you exit now. Are you sure?
                </p>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmExit(false)}
                    className="flex-1"
                    size="sm"
                  >
                    Continue Paper
                  </Button>
                  <Button
                    variant="danger"
                    onClick={confirmExit}
                    className="flex-1"
                    size="sm"
                  >
                    Exit Paper
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};