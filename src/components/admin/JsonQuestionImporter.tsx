import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Check, AlertCircle, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import toast from 'react-hot-toast';

interface JsonQuestion {
  question_number: number;
  question: string;
  answer_1: string;
  answer_2: string;
  answer_3: string;
  answer_4: string;
  answer_5: string;
  correct_answer?: number | number[];
  image_url?: string;
}

interface JsonQuestionImporterProps {
  onImport: (questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number | number[];
    explanation?: string;
    points: number;
    difficulty: 'easy' | 'medium' | 'hard';
    imageUrl?: string;
  }>) => void;
  onClose: () => void;
}

export const JsonQuestionImporter: React.FC<JsonQuestionImporterProps> = ({ onImport, onClose }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<JsonQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  const cleanJsonText = (text: string): string => {
    // Remove [cite_start] and [cite: number] patterns
    return text
      .replace(/\[cite_start\]/g, '')
      .replace(/\[cite:\s*\d+(?:,\s*\d+)*\]/g, '')
      .trim();
  };

  const validateAndParseJson = (input: string) => {
    try {
      setErrors([]);
      
      if (!input.trim()) {
        setErrors(['Please enter JSON data']);
        setIsValid(false);
        setParsedQuestions([]);
        return;
      }

      const parsed = JSON.parse(input);
      
      if (!Array.isArray(parsed)) {
        setErrors(['JSON must be an array of questions']);
        setIsValid(false);
        setParsedQuestions([]);
        return;
      }

      const validationErrors: string[] = [];
      const validQuestions: JsonQuestion[] = [];

      parsed.forEach((item, index) => {
        const questionNum = index + 1;
        
        // Check required fields
        if (!item.question || typeof item.question !== 'string') {
          validationErrors.push(`Question ${questionNum}: Missing or invalid question text`);
        }
        
        if (!item.answer_1 || typeof item.answer_1 !== 'string') {
          validationErrors.push(`Question ${questionNum}: Missing answer_1`);
        }
        
        if (!item.answer_2 || typeof item.answer_2 !== 'string') {
          validationErrors.push(`Question ${questionNum}: Missing answer_2`);
        }
        
        if (!item.answer_3 || typeof item.answer_3 !== 'string') {
          validationErrors.push(`Question ${questionNum}: Missing answer_3`);
        }
        
        if (!item.answer_4 || typeof item.answer_4 !== 'string') {
          validationErrors.push(`Question ${questionNum}: Missing answer_4`);
        }
        
        if (!item.answer_5 || typeof item.answer_5 !== 'string') {
          validationErrors.push(`Question ${questionNum}: Missing answer_5`);
        }
        
        // Validate correct_answer if provided
        if (item.correct_answer !== undefined) {
          if (Array.isArray(item.correct_answer)) {
            // Multiple correct answers
            if (item.correct_answer.length === 0) {
              validationErrors.push(`Question ${questionNum}: correct_answer array cannot be empty`);
            } else if (item.correct_answer.some(ans => typeof ans !== 'number' || ans < 1 || ans > 5)) {
              validationErrors.push(`Question ${questionNum}: all correct_answer values must be numbers between 1 and 5`);
            } else if (new Set(item.correct_answer).size !== item.correct_answer.length) {
              validationErrors.push(`Question ${questionNum}: correct_answer array cannot contain duplicate values`);
            }
          } else if (typeof item.correct_answer !== 'number' || item.correct_answer < 1 || item.correct_answer > 5) {
            validationErrors.push(`Question ${questionNum}: correct_answer must be a number between 1 and 5, or an array of such numbers`);
          }
        }

        if (validationErrors.length === 0) {
          validQuestions.push({
            question_number: item.question_number || questionNum,
            question: cleanJsonText(item.question),
            answer_1: cleanJsonText(item.answer_1),
            answer_2: cleanJsonText(item.answer_2),
            answer_3: cleanJsonText(item.answer_3),
            answer_4: cleanJsonText(item.answer_4),
            answer_5: cleanJsonText(item.answer_5),
            image_url: item.image_url && item.image_url !== 'none' ? item.image_url : undefined,
            correct_answer: item.correct_answer || 1,
          });
        }
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setIsValid(false);
        setParsedQuestions([]);
      } else {
        setErrors([]);
        setIsValid(true);
        setParsedQuestions(validQuestions);
        toast.success(`Successfully parsed ${validQuestions.length} questions`);
      }
    } catch (error) {
      setErrors(['Invalid JSON format. Please check your syntax.']);
      setIsValid(false);
      setParsedQuestions([]);
    }
  };

  const handleImport = () => {
    if (!isValid || parsedQuestions.length === 0) {
      toast.error('Please fix validation errors first');
      return;
    }

    const convertedQuestions = parsedQuestions.map(q => ({
      question: q.question,
      options: [q.answer_1, q.answer_2, q.answer_3, q.answer_4, q.answer_5],
      correctAnswer: Array.isArray(q.correct_answer) 
        ? q.correct_answer.map(ans => ans - 1) // Convert array from 1-based to 0-based
        : (q.correct_answer || 1) - 1, // Convert single answer from 1-based to 0-based
      explanation: '',
      points: 1,
      difficulty: 'medium' as const,
      imageUrl: q.image_url,
    }));

    onImport(convertedQuestions);
    toast.success(`Imported ${convertedQuestions.length} questions successfully!`);
    onClose();
  };

  const downloadSampleJson = () => {
    const sampleData = [
      {
        "question_number": 1,
        "question": "ශාක සෛල බිත්තියේ බහුලව ම පවතින බහු අවයවිකය කුමක්ද?",
        "answer_1": "(1) ග්ලූකෝස්",
        "answer_2": "(2) සෙලියුලෝස්",
        "answer_3": "(3) හෙමිසෙලියුලෝස්",
        "answer_4": "(4) සුක්රෝස්",
        "answer_5": "(5) පිෂ්ටය",
        "correct_answer": 2,
        "image_url": "none"
      },
      {
        "question_number": 2,
        "question": "පහත සඳහන් වලින් ප්‍රකාශ ස්වයංපෝෂී ජීවීන් වන්නේ කවුද?",
        "answer_1": "(1) Nitrobacter",
        "answer_2": "(2) Cyanobacteria",
        "answer_3": "(3) Green algae",
        "answer_4": "(4) Clostridium",
        "answer_5": "(5) Saccharomyces",
        "correct_answer": [2, 3],
        "image_url": "none"
      },
      {
        "question_number": 3,
        "question": "පහත සඳහන් වලින් කාබන් සම්මිශ්‍ර වන්නේ කවුද?",
        "answer_1": "(1) ග්ලූකෝස්",
        "answer_2": "(2) සෙලියුලෝස්",
        "answer_3": "(3) පිෂ්ටය",
        "answer_4": "(4) ප්‍රෝටීන්",
        "answer_5": "(5) ලිපිඩ්",
        "correct_answer": [1, 2, 3],
        "image_url": "none"
      }
    ];

    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-questions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Import Questions from JSON</h2>
                <p className="text-sm text-gray-600">Import multiple questions at once using JSON format</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Sample Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Need a sample format?</h3>
                <p className="text-sm text-blue-700">Download a sample JSON file to see the expected format</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleJson}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Sample
              </Button>
            </div>
          </div>

          {/* JSON Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JSON Questions Data
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                validateAndParseJson(e.target.value);
              }}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste your JSON questions data here..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports [cite_start] and [cite: number] patterns which will be automatically cleaned
            </p>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 font-medium mb-1">JSON Format Requirements:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Include <code className="bg-blue-200 px-1 rounded">correct_answer</code> field to specify correct option(s)</li>
                <li>• Single correct answer: <code className="bg-blue-200 px-1 rounded">"correct_answer": 2</code></li>
                <li>• Multiple correct answers: <code className="bg-blue-200 px-1 rounded">"correct_answer": [2, 3, 4]</code></li>
                <li>• If <code className="bg-blue-200 px-1 rounded">correct_answer</code> is not provided, it defaults to option 1</li>
                <li>• Use 1-based indexing (1 = first option, 2 = second option, etc.)</li>
                <li>• All answer fields (answer_1 through answer_5) are required</li>
              </ul>
            </div>
          </div>

          {/* Validation Results */}
          {errors.length > 0 && (
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 mb-2">Validation Errors</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {isValid && parsedQuestions.length > 0 && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 mb-2">
                    Ready to Import ({parsedQuestions.length} questions)
                  </h4>
                  <div className="text-sm text-green-700 space-y-2">
                    <p>✓ All questions have valid format</p>
                    <p>✓ All required fields are present</p>
                    <p>✓ Correct answers (single or multiple) will be imported from JSON data</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Preview */}
          {parsedQuestions.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Preview (First 3 questions)</h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {parsedQuestions.slice(0, 3).map((question, index) => (
                  <Card key={index} className="p-4 bg-gray-50">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">
                        Q{question.question_number}: {question.question}
                      </h4>
                      <div className="grid grid-cols-1 gap-1 text-sm text-gray-600">
                        {[
                          { num: 1, text: question.answer_1 },
                          { num: 2, text: question.answer_2 },
                          { num: 3, text: question.answer_3 },
                          { num: 4, text: question.answer_4 },
                          { num: 5, text: question.answer_5 }
                        ].map(({ num, text }) => {
                          const isCorrect = Array.isArray(question.correct_answer) 
                            ? question.correct_answer.includes(num)
                            : question.correct_answer === num;
                          return (
                            <span key={num} className={isCorrect ? "font-semibold text-green-600" : ""}>
                              ({num}) {text}
                            </span>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        ✓ Correct Answer{Array.isArray(question.correct_answer) && question.correct_answer.length > 1 ? 's' : ''}: 
                        {Array.isArray(question.correct_answer) 
                          ? ` Options ${question.correct_answer.join(', ')}`
                          : ` Option ${question.correct_answer}`
                        }
                      </div>
                      {question.image_url && (
                        <p className="text-xs text-blue-600">📷 Image: {question.image_url}</p>
                      )}
                    </div>
                  </Card>
                ))}
                {parsedQuestions.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {parsedQuestions.length - 3} more questions
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!isValid || parsedQuestions.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import {parsedQuestions.length} Questions
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};