import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Clock, BookOpen, Award, Users, Star, 
  Check, Heart, User, Mail, Phone, Trash2, Camera,
  ShieldCheck, Share2, Play, Lock, AlertTriangle, 
  ExternalLink, ThumbsUp, Send, CheckCircle2, RefreshCw
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { testsService } from '../../services/testsService';
import notificationsService from '../../services/notificationsService';
import { useAuth } from '../../context/AuthContext';
import paymentService from '../../services/paymentService';


interface Creator {
  name: string;
  avatar: string;
  verified: boolean;
  specialty: string;
  followers: number;
  rating: number;
  testsCreated: number;
}

interface TestDetail {
  id: string;
  title: string;
  category: string;
  creator: Creator;
  participants: number;
  duration: number;
  questions: number;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  thumbnail: string; // Gradient class
  description: string;
  prerequisites: string[];
  syllabus: string[];
  registered: boolean;
  registration_type?: 'none' | 'simple' | 'custom';
  reg_fields?: Record<string, boolean>;
  custom_question?: string;
  entry_fee?: number;
}

interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string;
  comment: string;
  helpfulCount: number;
  isHelpful?: boolean;
}

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'file';
  value: string;
  options?: string[];
}

interface PublicTestDetailViewProps {
  onNavigate: (view: any, param?: string) => void;
  testId: string | null;
}

// Initial Mock Data
const MOCK_CREATORS: Record<string, Creator> = {
  'mahak-gupta': {
    name: 'Mahak Gupta',
    avatar: 'bg-gradient-to-tr from-purple-500 to-indigo-500',
    verified: true,
    specialty: 'Java Platform Architect & Educator',
    followers: 18400,
    rating: 4.93,
    testsCreated: 14
  },
  'aris-thorne': {
    name: 'Dr. Aris Thorne',
    avatar: 'bg-gradient-to-tr from-pink-400 to-rose-400',
    verified: true,
    specialty: 'Advanced Computer Science & OOP',
    followers: 12800,
    rating: 4.92,
    testsCreated: 32
  },
  'mark-vance': {
    name: 'Prof. Mark Vance',
    avatar: 'bg-gradient-to-tr from-emerald-400 to-teal-400',
    verified: true,
    specialty: 'Higher Calculus & Analysis',
    followers: 8900,
    rating: 4.79,
    testsCreated: 18
  }
};

const MOCK_TEST_DETAILS: Record<string, TestDetail> = {
  'java-mock-test': {
    id: 'java-mock-test',
    title: 'Java Programming Mock Test',
    category: 'Programming',
    creator: MOCK_CREATORS['mahak-gupta'],
    participants: 3450,
    duration: 60,
    questions: 30,
    marks: 150,
    difficulty: 'medium',
    thumbnail: 'from-amber-600 to-orange-600',
    description: 'This assessment is calibrated to evaluate core concepts of the Java programming language, including OOP principles, collections framework, exception handling, memory management (JVM), multithreading, and stream API. Recommended for developers preparing for technical interviews and Java SE certifications.',
    prerequisites: [
      'Basic understanding of syntax and control statements',
      'Familiarity with Object-Oriented Programming (Classes, Inheritance, Polymorphism)',
      'Understanding of standard Java library structures (List, Map, Set)'
    ],
    syllabus: [
      'OOP fundamentals & Object Lifecycle',
      'Java Collections Framework (ArrayList, HashMap, LinkedList)',
      'Multithreading, thread safety, and executors',
      'JVM Architecture & Garbage Collection basics',
      'Java Streams & Lambda Expressions (Java 8+ features)'
    ],
    registered: false
  },
  'test-1': {
    id: 'test-1',
    title: 'Python Advanced OOP Design Patterns',
    category: 'Programming',
    creator: MOCK_CREATORS['aris-thorne'],
    participants: 1240,
    duration: 45,
    questions: 15,
    marks: 75,
    difficulty: 'hard',
    thumbnail: 'from-violet-600 to-indigo-600',
    description: 'Deep dive into Pythonic design patterns, meta-programming, descriptors, decorators, and abstract base classes. This test challenges developers to apply SOLID design principles in dynamic scripting structures.',
    prerequisites: [
      'Intermediate to advanced Python syntax knowledge',
      'Familiarity with standard software design patterns (Factory, Singleton, Observer)',
      'Familiarity with typing and protocol definitions in Python'
    ],
    syllabus: [
      'Meta-classes and Dynamic Attribute Creation',
      'Behavioral Design Patterns (Observer, Strategy, State)',
      'Creational Design Patterns (Singleton, Builder, Factory)',
      'Memory optimization and __slots__ usage',
      'Descriptors and property overrides'
    ],
    registered: false
  },
  'test-4': {
    id: 'test-4',
    title: 'Calculus IV: Double Integrals & Vectors',
    category: 'Mathematics',
    creator: MOCK_CREATORS['mark-vance'],
    participants: 840,
    duration: 60,
    questions: 10,
    marks: 100,
    difficulty: 'hard',
    thumbnail: 'from-teal-500 to-emerald-600',
    description: 'Evaluation of advanced multivariate calculus, focusing on integration over regions, Green\'s theorem, Stokes\' theorem, divergence theorems, and coordinate transformations (spherical/cylindrical coordinates).',
    prerequisites: [
      'Solid command over single variable differentiation and integration',
      'Basic vector algebra (Dot product, Cross product)',
      'Familiarity with partial derivatives and gradient fields'
    ],
    syllabus: [
      'Double and Triple Integrals in general regions',
      'Line Integrals & Vector Fields',
      'Green\'s, Stokes\', and Divergence Theorems',
      'Change of variables and Jacobian determinants',
      'Applications to physics (Center of mass, Flux calculations)'
    ],
    registered: false
  }
};

const INITIAL_MOCK_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    userName: 'Karan Sharma',
    userAvatar: 'bg-gradient-to-r from-blue-400 to-indigo-500',
    rating: 5,
    date: '2026-05-12',
    comment: 'The questions on JVM garbage collection and stream API were incredibly helpful and very close to what I was asked in my real technical interview! Highly recommend taking this test.',
    helpfulCount: 24
  },
  {
    id: 'rev-2',
    userName: 'Aanya Nair',
    userAvatar: 'bg-gradient-to-r from-pink-400 to-orange-400',
    rating: 4,
    date: '2026-06-02',
    comment: 'Highly structured and covers a broad spectrum of topics. The multithreading questions were quite tricky but very educational. The custom explanations could have been slightly longer.',
    helpfulCount: 12
  },
  {
    id: 'rev-3',
    userName: 'Rohan Deshmukh',
    userAvatar: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    rating: 5,
    date: '2026-06-10',
    comment: 'Excellent test depth! Verified instructor guidelines are clear. It was great preparation for the Oracle Java Professional certification. Took me about 50 minutes to complete.',
    helpfulCount: 7
  }
];

export const PublicTestDetailView: React.FC<PublicTestDetailViewProps> = ({ onNavigate, testId }) => {
  const { user, profile } = useAuth();
  const currentUserId = user?.id || null;

  // Fallback to java-mock-test if no testId matches
  const activeId = testId && MOCK_TEST_DETAILS[testId] ? testId : 'java-mock-test';
  const [testDetail, setTestDetail] = useState<TestDetail>(() => MOCK_TEST_DETAILS[activeId]);

  // Core States
  const [isRegistered, setIsRegistered] = useState(testDetail.registered);
  const [isSaved, setIsSaved] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_MOCK_REVIEWS);
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  
  // Registration Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customQuestionAnswer, setCustomQuestionAnswer] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const getMappedKeys = (key: string): string[] => {
    const mapping: Record<string, string[]> = {
      college: ['college'],
      courseName: ['branch', 'course_name'],
      yearSemester: ['year', 'year_semester'],
      branch: ['branch'],
      graduationYear: ['graduation_year'],
      city: ['city'],
      state: ['state'],
      linkedinProfile: ['linkedin', 'linkedin_profile'],
      githubProfile: ['github', 'github_profile'],
      resumeUpload: ['resume', 'resume_link', 'resume_upload'],
      profilePhoto: ['profile_photo', 'photo']
    };
    return mapping[key] || [key.toLowerCase().replace(/\s+/g, '_')];
  };

  // Sync profile details with form fields
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  // Unified form state tracking
  useEffect(() => {
    const isMobileRequired = testDetail.registration_type === 'simple' || 
      (testDetail.registration_type === 'custom' && testDetail.reg_fields?.mobileNumber);

    const compiledData: Record<string, any> = {
      full_name: fullName,
      email: email
    };

    if (isMobileRequired || phone.trim()) {
      compiledData.mobile = phone;
      compiledData.mobile_number = phone;
      compiledData.phone = phone;
    }

    customFields.forEach(f => {
      const key = f.id.replace('cf-db-', '').replace('cf-custom-', '');
      const mappedKeys = getMappedKeys(key);
      mappedKeys.forEach(mk => {
        compiledData[mk] = f.value;
      });
    });

    if (testDetail.custom_question) {
      compiledData.custom_question_1 = customQuestionAnswer;
    }

    setFormData(compiledData);
  }, [fullName, email, phone, customFields, customQuestionAnswer, testDetail.registration_type, testDetail.reg_fields, testDetail.custom_question]);

  // Simulated Test Execution States
  const [showTestingModal, setShowTestingModal] = useState(false);
  const [testingStep, setTestingStep] = useState(0);
  const [testTimeLeft, setTestTimeLeft] = useState(testDetail.duration * 60);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const isUuid = testId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId);
    if (isUuid) {
      const fetchDbTest = async () => {
        try {
          const { data, error } = await testsService.getTestById(testId);
          if (error) throw error;
          if (data) {
            const [creatorRes, regsRes] = await Promise.all([
              data.creator_id ? testsService.getCreatorProfiles([data.creator_id]) : Promise.resolve({ data: [] }),
              testsService.getRegistrationsForTests([data.id])
            ]);

            const creatorProfile = creatorRes.data?.[0];
            const testRegs = regsRes.data || [];
            const myReg = currentUserId ? testRegs.find((r: any) => r.user_id === currentUserId) : null;
            let isUserRegistered = !!myReg;

            if (!isUserRegistered && currentUserId && (data.entry_fee || 0) > 0) {
              const payStatus = await paymentService.getPaymentStatus(data.id);
              if (payStatus.paid) {
                isUserRegistered = true;
              }
            }

            setTestDetail({
              id: data.id,
              title: data.title,
              category: 'Programming',
              creator: {
                name: creatorProfile?.full_name || 'Verified Creator',
                avatar: creatorProfile?.avatar_url || 'bg-gradient-to-tr from-purple-500 to-indigo-500',
                verified: true,
                specialty: creatorProfile?.specialty || 'Verified Testoriax Educator',
                followers: 120,
                rating: 4.8,
                testsCreated: 1
              },
              participants: testRegs.length,
              duration: data.duration || 60,
              questions: Array.isArray(data.questions) ? data.questions.length : 0,
              marks: data.total_marks || 100,
              difficulty: 'medium' as const,
              thumbnail: data.mock_thumbnail || 'from-purple-500 to-indigo-500',
              description: data.description || 'No description provided.',
              prerequisites: [
                'Basic understanding of test topics',
                'Stable internet connection & webcam access'
              ],
              syllabus: (Array.isArray(data.syllabus) && data.syllabus.length > 0)
                ? data.syllabus
                : [
                    `Core ${data.category || 'Assessment'} Fundamentals`,
                    'Conceptual & Practical Problem Solving',
                    'Time Management & Precision Under Pressure',
                    'Comprehensive Competency Evaluation'
                  ],
              registered: isUserRegistered,
              registration_type: data.registration_type || 'simple',
              reg_fields: data.reg_fields,
              custom_question: data.custom_question,
              entry_fee: data.entry_fee || 0
            } as any);

            if (myReg && myReg.registration_data) {
              const regData = myReg.registration_data;
              if (regData.full_name) setFullName(regData.full_name);
              if (regData.email) setEmail(regData.email);
              if (regData.mobile_number || regData.mobile || regData.phone) {
                setPhone(regData.mobile_number || regData.mobile || regData.phone);
              }
              if (regData.custom_question_1) {
                setCustomQuestionAnswer(regData.custom_question_1);
              }
            }

            const initializedFields: CustomField[] = [];
            if (data.registration_type === 'simple') {
              initializedFields.push(
                { id: 'cf-db-college', label: 'College/School', type: 'text', value: '' },
                { id: 'cf-db-courseName', label: 'Course Name', type: 'text', value: '' },
                { id: 'cf-db-yearSemester', label: 'Year/Semester', type: 'text', value: '' }
              );
            } else if (data.reg_fields && data.registration_type === 'custom') {
              Object.entries(data.reg_fields).forEach(([key, enabled]) => {
                if (enabled && key !== 'fullName' && key !== 'email' && key !== 'mobileNumber') {
                  const labelMap: Record<string, string> = {
                    college: 'College/University',
                    branch: 'Branch/Stream',
                    graduationYear: 'Graduation Year',
                    city: 'City',
                    state: 'State',
                    linkedinProfile: 'LinkedIn Profile Link',
                    githubProfile: 'GitHub Profile Link',
                    resumeUpload: 'Resume/Portfolio Link',
                    profilePhoto: 'Profile Photo'
                  };
                  const label = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  initializedFields.push({
                    id: `cf-db-${key}`,
                    label,
                    type: key === 'profilePhoto' ? 'file' : 'text',
                    value: ''
                  });
                }
              });
            }

            // Prefill values from myReg if available
            if (myReg && myReg.registration_data) {
              const regData = myReg.registration_data;
              initializedFields.forEach(f => {
                const key = f.id.replace('cf-db-', '').replace('cf-custom-', '');
                const mappedKeys = getMappedKeys(key);
                const val = mappedKeys.map(mk => regData[mk]).find(v => v !== undefined);
                if (val !== undefined) {
                  f.value = val;
                }
              });
            }
            setCustomFields(initializedFields);
          }
        } catch (err) {
          console.error('Error fetching test detail from database:', err);
        }
      };
      fetchDbTest();
    } else {
      const activeId = testId && MOCK_TEST_DETAILS[testId] ? testId : 'java-mock-test';
      const mockDetail = MOCK_TEST_DETAILS[activeId];
      setTestDetail(mockDetail);
      setCustomFields([
        { id: 'cf-1', label: 'Programming Experience (Years)', type: 'select', value: '1-3 years', options: ['Less than 1 year', '1-3 years', '3-5 years', '5+ years'] },
        { id: 'cf-2', label: 'LinkedIn Profile Link (Optional)', type: 'text', value: '' }
      ]);
    }
  }, [testId, currentUserId]);

  useEffect(() => {
    setIsRegistered(testDetail.registered);
    setTestTimeLeft(testDetail.duration * 60);
  }, [testDetail]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
      showToast('Please log in to register.');
      setTimeout(() => {
        onNavigate('login');
      }, 800);
      return;
    }

    const isMobileRequired = testDetail.registration_type === 'simple' || 
      (testDetail.registration_type === 'custom' && testDetail.reg_fields?.mobileNumber);

    const errors: Record<string, string> = {};
    if (!fullName.trim()) {
      errors.fullName = 'Full Name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email Address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (isMobileRequired && !phone.trim()) {
      errors.phone = 'Mobile Number is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Please fix the errors in the form.');
      return;
    }

    const emptyCustomField = customFields.find(f => !f.value.trim());
    if (emptyCustomField) {
      showToast(`Please fill out the ${emptyCustomField.label} field.`);
      return;
    }

    const entryFeeAmount = Number(testDetail.entry_fee || 0);

    const isUuid = testDetail.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testDetail.id);
    if (isUuid) {
      try {
        if (entryFeeAmount > 0) {
          showToast('Initiating Razorpay checkout...');

          const orderRes = await paymentService.createRazorpayOrder(testDetail.id);
          if (orderRes.error) {
            throw new Error(orderRes.error.message || 'Failed to create payment order.');
          }

          const orderData = orderRes.data;
          await paymentService.loadRazorpayCheckoutScript();

          if ((window as any).Razorpay) {
            const rzpOptions = {
              key: orderData.key_id,
              amount: orderData.amount, // in paise
              currency: orderData.currency || 'INR',
              name: 'Testoriax',
              description: `Registration for ${testDetail.title}`,
              order_id: orderData.order_id,
              prefill: {
                name: fullName,
                email: email,
                contact: phone,
              },
              theme: {
                color: '#7c3aed',
              },
              handler: async function (response: any) {
                try {
                  const verifyResult = await paymentService.verifyRazorpayPayment({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    test_id: testDetail.id,
                  });

                  if (verifyResult.error) {
                    showToast('Payment signature verification failed: ' + verifyResult.error.message);
                    return;
                  }

                  const regRes = await testsService.registerForTest(testDetail.id, currentUserId, { ...formData, paid: true, razorpay_payment_id: response.razorpay_payment_id });
                  if (regRes.error) throw regRes.error;

                  const wasRegistered = isRegistered;
                  setIsRegistered(true);
                  setIsEditing(false);
                  if (!wasRegistered) {
                    setTestDetail(prev => ({ ...prev, participants: prev.participants + 1 }));
                    notificationsService.notifyTestRegistration(currentUserId, testDetail.id, testDetail.title);
                  }
                  showToast('Payment Verified & Successfully registered for ' + testDetail.title + '!');
                } catch (vErr: any) {
                  showToast(vErr.message || 'Failed to complete registration.');
                }
              },
              modal: {
                ondismiss: function () {
                  showToast('Payment checkout cancelled.');
                }
              }
            };

            const rzp = new (window as any).Razorpay(rzpOptions);
            rzp.open();
            return;
          } else {
            // Direct fallback verification if Razorpay script is not present
            const verifyResult = await paymentService.verifyRazorpayPayment({
              razorpay_order_id: orderData.order_id,
              razorpay_payment_id: `pay_test_${Date.now()}`,
              razorpay_signature: `sig_test_mock_${Date.now()}`,
              test_id: testDetail.id,
            });

            if (!verifyResult.error) {
              await testsService.registerForTest(testDetail.id, currentUserId, { ...formData, paid: true });
              const wasRegistered = isRegistered;
              setIsRegistered(true);
              setIsEditing(false);
              if (!wasRegistered) {
                setTestDetail(prev => ({ ...prev, participants: prev.participants + 1 }));
                notificationsService.notifyTestRegistration(currentUserId, testDetail.id, testDetail.title);
              }
              showToast('Test Mode Payment Verified & Successfully registered!');
            }
            return;
          }
        }

        const response = await testsService.registerForTest(testDetail.id, currentUserId, formData);

        const { data, error } = response;
        if (error) {
          throw error;
        } else if (data) {
          const wasRegistered = isRegistered;
          setIsRegistered(true);
          setIsEditing(false);
          if (!wasRegistered) {
            setTestDetail(prev => ({
              ...prev,
              participants: prev.participants + 1
            }));
            // Trigger in-app notification
            notificationsService.notifyTestRegistration(currentUserId, testDetail.id, testDetail.title);
          }
          showToast(wasRegistered ? 'Registration updated successfully!' : 'Successfully registered for ' + testDetail.title + '!');
        }
      } catch (err: any) {
        console.error('Error submitting registration:', err);
        showToast(err.message || 'Failed to submit registration. Please try again.');
      }
    } else {
      const wasRegistered = isRegistered;
      setIsRegistered(true);
      setIsEditing(false);
      if (!wasRegistered) {
        setTestDetail(prev => ({
          ...prev,
          participants: prev.participants + 1
        }));
      }
      showToast(wasRegistered ? 'Registration updated successfully!' : 'Successfully registered for ' + testDetail.title + '!');
    }
  };

  const handleCancelRegistration = async () => {
    if (!currentUserId) return;

    const isUuid = testDetail.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testDetail.id);
    if (isUuid) {
      try {
        const { error } = await testsService.unregisterFromTest(testDetail.id, currentUserId);
        if (error) throw error;
        setIsRegistered(false);
        setIsEditing(false);
        setFullName('');
        setEmail('');
        setPhone('');
        setCustomQuestionAnswer('');
        setCustomFields(prev => prev.map(f => ({ ...f, value: '' })));
        setTestDetail(prev => ({
          ...prev,
          participants: Math.max(0, prev.participants - 1)
        }));
        showToast('Cancelled registration state.');
      } catch (err: any) {
        console.error('Error cancelling registration:', err);
        showToast('Failed to cancel registration.');
      }
    } else {
      setIsRegistered(false);
      setIsEditing(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setCustomQuestionAnswer('');
      setCustomFields(prev => prev.map(f => ({ ...f, value: '' })));
      setTestDetail(prev => ({
        ...prev,
        participants: Math.max(0, prev.participants - 1)
      }));
      showToast('Cancelled registration state.');
    }
  };

  // Toggle bookmark / save
  const handleToggleSave = () => {
    setIsSaved(prev => {
      const next = !prev;
      showToast(next ? 'Saved test to bookmarks!' : 'Removed test from bookmarks.');
      return next;
    });
  };

  // Review helper
  const handleHelpfulToggle = (reviewId: string) => {
    setReviews(prev => prev.map(r => {
      if (r.id === reviewId) {
        const isCurrentlyHelpful = r.isHelpful;
        return {
          ...r,
          isHelpful: !isCurrentlyHelpful,
          helpfulCount: isCurrentlyHelpful ? r.helpfulCount - 1 : r.helpfulCount + 1
        };
      }
      return r;
    }));
  };

  // Submit a new review
  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      userName: 'Jane Challenger',
      userAvatar: 'bg-gradient-to-tr from-purple-500 to-pink-500',
      rating: newRating,
      date: new Date().toISOString().split('T')[0],
      comment: newReviewText,
      helpfulCount: 0
    };

    setReviews(prev => [newReview, ...prev]);
    setNewReviewText('');
    showToast('Review submitted successfully!');
  };

  // Test Environment Simulation steps
  const startTestEnvironment = () => {
    if (!currentUserId) {
      showToast('Please log in to start the test.');
      setTimeout(() => {
        onNavigate('login');
      }, 800);
      return;
    }
    onNavigate('exam-entry', testDetail.id || activeId);
  };


  // Timer simulation
  useEffect(() => {
    if (testingStep === 4 && testTimeLeft > 0) {
      const timer = setInterval(() => {
        setTestTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [testingStep, testTimeLeft]);

  // Format time (seconds to hh:mm:ss)
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get difficulty color classes
  const getDiffBadgeColor = (diff: 'easy' | 'medium' | 'hard') => {
    if (diff === 'easy') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (diff === 'medium') return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-rose-50 text-rose-700 border-rose-100';
  };

  // Render related tests filters
  const relatedTests = Object.values(MOCK_TEST_DETAILS).filter(t => t.id !== activeId);

  const registrationRequired = (testDetail as any).registration_type !== 'none';
  const showStartTest = (!registrationRequired || isRegistered) && !isEditing;

  const handleShare = async () => {
    const url = window.location.href;
    const title = testDetail?.title || 'Testoriax Exam';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out this test on Testoriax: ${title}`,
          url
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          showToast('Share link copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      showToast('Share link copied to clipboard!');
    }
  };

  return (
    <div className="w-full font-sans antialiased min-h-screen relative bg-[#fffafb] pb-24 select-none">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-55 px-4.5 py-2.5 bg-slate-900/95 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-24">
        
        {/* Navigation Breadcrumb & Back bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('discovery')}
            className="group px-4 py-2 bg-white hover:bg-slate-50 border border-slate-150 rounded-2xl text-xs font-bold text-slate-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Public Lobby</span>
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer shadow-sm"
              title="Share Test"
            >
              <Share2 size={14} />
            </button>
          </div>
        </div>

        {/* Outer Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Test Detail Contents (8/12) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. TEST HERO BANNER CARD */}
            <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-100/80 shadow-md">
              
              {/* Header Gradient Block */}
              <div className={`h-48 md:h-56 bg-gradient-to-r ${testDetail.thumbnail} relative p-6 md:p-8 flex flex-col justify-between text-white`}>
                <div className="absolute inset-0 bg-black/15 mix-blend-multiply" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                
                {/* Upper strip */}
                <div className="flex justify-between items-start relative z-10">
                  <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-wider">
                    {testDetail.category}
                  </span>
                  
                  <div className="flex items-center gap-1 bg-slate-900/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-yellow-400">
                    <Star size={11} className="fill-yellow-400 stroke-transparent" />
                    <span>{testDetail.creator.rating} Rating</span>
                  </div>
                </div>

                {/* Test Title */}
                <div className="relative z-10">
                  <h1 className="font-display font-extrabold text-xl md:text-3xl tracking-tight leading-tight">
                    {testDetail.title}
                  </h1>
                </div>
              </div>

              {/* Banner Details Body */}
              <div className="p-6 md:p-8 bg-white flex flex-col gap-6">
                
                {/* Meta Statistics strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-500">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Clock size={15} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-semibold text-slate-350 block leading-tight">Duration</span>
                      <span className="text-slate-800 font-extrabold">{testDetail.duration} Mins</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                      <BookOpen size={15} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-semibold text-slate-350 block leading-tight">Questions</span>
                      <span className="text-slate-800 font-extrabold">{testDetail.questions} Qs</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Award size={15} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-semibold text-slate-350 block leading-tight">Total Marks</span>
                      <span className="text-slate-800 font-extrabold">{testDetail.marks} Marks</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Users size={15} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-semibold text-slate-350 block leading-tight">Participants</span>
                      <span className="text-slate-800 font-extrabold">{testDetail.participants.toLocaleString()} Attempted</span>
                    </div>
                  </div>
                </div>

                {/* Creator Profile Detail row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-1 border-b border-slate-50">
                  <button
                    onClick={() => onNavigate('creator-profile', activeId === 'java-mock-test' ? 'mahak-gupta' : activeId === 'test-1' ? 'aris-thorne' : 'mark-vance')}
                    className="flex items-center gap-3 text-left hover:opacity-85 transition-all cursor-pointer focus:outline-none group/creator"
                  >
                    <div className={`w-11 h-11 rounded-2xl ${testDetail.creator.avatar} shrink-0 flex items-center justify-center text-white font-display font-extrabold text-sm shadow-sm transition-transform group-hover/creator:scale-[1.02]`}>
                      {testDetail.creator.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-extrabold text-slate-800 group-hover/creator:text-lilac-600 transition-colors">by {testDetail.creator.name}</span>
                        {testDetail.creator.verified && <ShieldCheck size={13} className="text-purple-500" />}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">{testDetail.creator.specialty}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                    <div className="text-right">
                      <span className="block text-slate-800 font-extrabold">{testDetail.creator.followers.toLocaleString()}</span>
                      <span className="text-[8px] uppercase tracking-wide">Followers</span>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="text-right">
                      <span className="block text-slate-800 font-extrabold">{testDetail.creator.testsCreated}</span>
                      <span className="text-[8px] uppercase tracking-wide">Tests</span>
                    </div>
                  </div>
                </div>

                {/* Badges details */}
                <div className="flex flex-wrap gap-2.5">
                  <div className={`px-3 py-1 rounded-xl border text-[10px] font-bold flex items-center gap-1 capitalize ${getDiffBadgeColor(testDetail.difficulty)}`}>
                    <Award size={11} />
                    <span>{testDetail.difficulty} Level</span>
                  </div>
                  
                  <div className="px-3 py-1 rounded-xl border border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Lock size={11} className="text-slate-400" />
                    <span>Secure Proctored Execution</span>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. DESCRIPTION & REQUIREMENTS */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
              
              {/* Description */}
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-3">About This Mock Assessment</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {testDetail.description}
                </p>
              </div>

              {/* Prerequisites */}
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-3">Assessment Pre-Requisites</h3>
                <ul className="flex flex-col gap-2 pl-1">
                  {testDetail.prerequisites.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-500 font-semibold leading-relaxed">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Syllabus */}
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-3">Covered Syllabus & Competencies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                  {testDetail.syllabus.map((topic, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <div className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-100/30 flex items-center justify-center shrink-0 font-display font-bold text-[9px] text-indigo-700">
                        {idx + 1}
                      </div>
                      <span className="truncate">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* 3. MORE FROM CREATOR & RELATED TESTS */}
            <div className="flex flex-col gap-6">
              
              {/* Related Tests */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block mb-3.5">
                  Related Mock Assessments
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {relatedTests.map((t) => (
                    <GlassCard
                      key={t.id}
                      onClick={() => onNavigate('test-details', t.id)}
                      className="p-5 border-slate-100 hover:border-purple-300 hover:shadow-md cursor-pointer flex flex-col justify-between transition-all duration-300 bg-white relative overflow-hidden group"
                    >
                      <div>
                        <div className={`h-24 rounded-2xl bg-gradient-to-r ${t.thumbnail} p-3.5 text-white flex flex-col justify-between relative mb-3.5 overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
                          <span className="text-[8px] font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded uppercase tracking-wider w-max relative z-10">
                            {t.category}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase w-max relative z-10 ${
                            t.difficulty === 'easy' ? 'bg-emerald-500 text-white' :
                            t.difficulty === 'medium' ? 'bg-amber-500 text-white' :
                            'bg-rose-500 text-white'
                          }`}>
                            {t.difficulty}
                          </span>
                        </div>

                        <h4 className="font-display font-extrabold text-xs text-slate-800 line-clamp-1 group-hover:text-purple-600 transition-colors">
                          {t.title}
                        </h4>
                        
                        <p className="text-[9px] text-slate-400 font-semibold mt-1">by {t.creator.name}</p>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3.5 border-t border-slate-50 text-[9px] font-bold text-slate-400">
                        <span>{t.questions} Qs • {t.duration}m</span>
                        <span className="text-purple-650 flex items-center gap-0.5">
                          <span>View Detail</span>
                          <ExternalLink size={9} />
                        </span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>

            </div>

            {/* 4. REVIEWS & RATINGS */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-4">Reviews & Candidate Feedback</h3>
                
                {/* Stats Breakdown Summary */}
                <div className="flex flex-col md:flex-row items-center gap-6 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  
                  {/* Big Score */}
                  <div className="flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-3xl font-display font-black text-slate-800 leading-none">4.9</span>
                    
                    <div className="flex gap-0.5 text-yellow-400 mt-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} className="fill-yellow-400 stroke-transparent" />
                      ))}
                    </div>
                    
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 block">Based on {testDetail.participants} evaluations</span>
                  </div>

                  <div className="w-px h-16 bg-slate-200 hidden md:block" />

                  {/* Distribution bars */}
                  <div className="flex-1 w-full flex flex-col gap-1.5">
                    {[
                      { stars: 5, pct: 93 },
                      { stars: 4, pct: 5 },
                      { stars: 3, pct: 2 },
                      { stars: 2, pct: 0 },
                      { stars: 1, pct: 0 }
                    ].map((row) => (
                      <div key={row.stars} className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                        <span className="w-8 text-right shrink-0">{row.stars} Star</span>
                        <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${row.pct}%` }} />
                        </div>
                        <span className="w-8 shrink-0">{row.pct}%</span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Submit a Review Form */}
              <form onSubmit={handleAddReview} className="border-t border-slate-100 pt-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Leave a Review</span>
                
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Your Rating:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isSel = newRating >= starVal;
                      return (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setNewRating(starVal)}
                          className="text-yellow-400 hover:scale-110 transition-transform cursor-pointer outline-none"
                        >
                          <Star size={16} className={isSel ? 'fill-yellow-400 stroke-transparent' : 'text-slate-250'} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-200/50 transition-all">
                  <textarea
                    rows={2}
                    required
                    placeholder="Share your experience taking this mock test or preparing with the questions..."
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    className="flex-grow bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder-slate-400 resize-none"
                  />
                  <button
                    type="submit"
                    className="ml-3 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow transition-all active:scale-[0.97] cursor-pointer"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="divide-y divide-slate-50 border-t border-slate-100/70 pt-2 flex flex-col">
                {reviews.map((rev) => (
                  <div key={rev.id} className="py-4.5 first:pt-2 last:pb-0 flex flex-col gap-2.5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-xl ${rev.userAvatar} shrink-0 text-[10px] text-white font-extrabold flex items-center justify-center shadow-sm`}>
                          {rev.userName.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">{rev.userName}</span>
                          <span className="text-[8px] text-slate-400 font-semibold">{rev.date}</span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex gap-0.5 text-yellow-400">
                        {[1, 2, 3, 4, 5].map((starVal) => {
                          const isSel = rev.rating >= starVal;
                          return (
                            <Star key={starVal} size={9} className={isSel ? 'fill-yellow-400 stroke-transparent' : 'text-slate-200'} />
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      {rev.comment}
                    </p>

                    {/* Helpful counter button */}
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => handleHelpfulToggle(rev.id)}
                        className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                          rev.isHelpful
                            ? 'border-purple-200 bg-purple-50 text-purple-700 font-extrabold shadow-sm'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:text-slate-600'
                        }`}
                      >
                        <ThumbsUp size={9} />
                        <span>Helpful ({rev.helpfulCount})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: STICKY REGISTRATION/CTA COMPONENT (4/12) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-6">
            
            {/* REGISTRATION PANEL */}
            <div className="bg-white border border-slate-100/90 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col gap-5">
              
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/30 rounded-full blur-2xl pointer-events-none" />
              
              {/* Conditional Panel Rendering */}
              {!showStartTest ? (
                <>
                  {/* Header */}
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Lock size={13} className="text-purple-600" />
                      <span>Registration Panel</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      Register to secure your evaluation credentials. Registration is free.
                    </p>
                  </div>                  {/* FORM */}
                  <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                    
                    {/* Full Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Full Name</label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                        <User size={13} className="text-slate-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            setFormData(prev => ({ ...prev, full_name: e.target.value }));
                            if (e.target.value.trim()) {
                              setFormErrors(prev => {
                                const next = { ...prev };
                                delete next.fullName;
                                return next;
                              });
                            }
                          }}
                          className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none"
                          placeholder="Your full name"
                        />
                      </div>
                      {formErrors.fullName && (
                        <p className="text-[10px] text-red-500 font-bold pl-1 mt-0.5">{formErrors.fullName}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Email Address</label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                        <Mail size={13} className="text-slate-400 mr-2 shrink-0" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setFormData(prev => ({ ...prev, email: e.target.value }));
                            if (e.target.value.trim()) {
                              setFormErrors(prev => {
                                const next = { ...prev };
                                delete next.email;
                                return next;
                              });
                            }
                          }}
                          className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none"
                          placeholder="your.email@domain.com"
                        />
                      </div>
                      {formErrors.email && (
                        <p className="text-[10px] text-red-500 font-bold pl-1 mt-0.5">{formErrors.email}</p>
                      )}
                    </div>

                    {/* Mobile Number */}
                    {(testDetail.registration_type === 'simple' || (testDetail.registration_type === 'custom' && testDetail.reg_fields?.mobileNumber)) && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Mobile Number</label>
                        <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                          <Phone size={13} className="text-slate-400 mr-2 shrink-0" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              setFormData(prev => ({ 
                                ...prev, 
                                mobile: e.target.value,
                                mobile_number: e.target.value,
                                phone: e.target.value
                              }));
                              if (e.target.value.trim()) {
                                setFormErrors(prev => {
                                  const next = { ...prev };
                                  delete next.phone;
                                  return next;
                                });
                              }
                            }}
                            className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        {formErrors.phone && (
                          <p className="text-[10px] text-red-500 font-bold pl-1 mt-0.5">{formErrors.phone}</p>
                        )}
                      </div>
                    )}

                    {/* DYNAMIC CUSTOM FIELDS */}
                    {customFields.length > 0 && (
                      <div className="flex flex-col gap-3.5 border-t border-slate-50 pt-3.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-455 uppercase pl-1">Additional Information</span>
                          <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded uppercase">Custom fields</span>
                        </div>

                        {customFields.map((field) => (
                          <div key={field.id} className="flex flex-col gap-1.5 relative group/field">
                            
                            <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">{field.label}</label>
                            
                            {field.type === 'select' ? (
                              <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                                <select
                                  value={field.value}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomFields(prev => prev.map(f => f.id === field.id ? { ...f, value: val } : f));
                                    const key = field.id.replace('cf-db-', '').replace('cf-custom-', '');
                                    const mappedKeys = getMappedKeys(key);
                                    setFormData(prev => {
                                      const next = { ...prev };
                                      mappedKeys.forEach(mk => { next[mk] = val; });
                                      return next;
                                    });
                                  }}
                                  className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none border-none cursor-pointer"
                                >
                                  {field.options?.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            ) : field.type === 'file' || field.id.includes('profilePhoto') ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                  {field.value ? (
                                    <div className="relative w-12 h-12 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                                      <img src={field.value} alt="Profile Preview" className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomFields(prev => prev.map(f => f.id === field.id ? { ...f, value: '' } : f));
                                          const key = field.id.replace('cf-db-', '').replace('cf-custom-', '');
                                          const mappedKeys = getMappedKeys(key);
                                          setFormData(prev => {
                                            const next = { ...prev };
                                            mappedKeys.forEach(mk => { next[mk] = ''; });
                                            return next;
                                          });
                                        }}
                                        className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-all opacity-0 hover:opacity-100 cursor-pointer"
                                        title="Remove Photo"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                      <User size={16} />
                                    </div>
                                  )}
                                  
                                  <label className="flex-grow flex items-center justify-center border border-dashed border-slate-250 hover:border-purple-400 hover:bg-purple-50/10 rounded-2xl px-3.5 py-2.5 cursor-pointer text-xs font-bold text-slate-500 hover:text-purple-650 transition-all select-none duration-150">
                                    <Camera size={13} className="mr-2" />
                                    <span>{field.value ? 'Change Photo' : 'Upload Profile Photo'}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            const result = reader.result as string;
                                            setCustomFields(prev => prev.map(f => f.id === field.id ? { ...f, value: result } : f));
                                            const key = field.id.replace('cf-db-', '').replace('cf-custom-', '');
                                            const mappedKeys = getMappedKeys(key);
                                            setFormData(prev => {
                                              const next = { ...prev };
                                              mappedKeys.forEach(mk => { next[mk] = result; });
                                              return next;
                                            });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomFields(prev => prev.map(f => f.id === field.id ? { ...f, value: val } : f));
                                    const key = field.id.replace('cf-db-', '').replace('cf-custom-', '');
                                    const mappedKeys = getMappedKeys(key);
                                    setFormData(prev => {
                                      const next = { ...prev };
                                      mappedKeys.forEach(mk => { next[mk] = val; });
                                      return next;
                                    });
                                  }}
                                  className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none"
                                  placeholder={`Enter ${field.label.toLowerCase()}`}
                                />
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    )}

                    {/* Custom Question if configured */}
                    {testDetail.custom_question && (
                      <div className="flex flex-col gap-1.5 border-t border-slate-50 pt-3.5">
                        <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">
                          {testDetail.custom_question}
                        </label>
                        <div className="relative flex items-center bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-purple-300 transition-all shadow-sm">
                          <textarea
                            rows={2}
                            required
                            value={customQuestionAnswer}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomQuestionAnswer(val);
                              setFormData(prev => ({
                                ...prev,
                                custom_question_1: val
                              }));
                            }}
                            className="flex-grow bg-transparent text-xs font-semibold text-slate-700 outline-none resize-none"
                            placeholder="Enter your answer"
                          />
                        </div>
                      </div>
                    )}

                    {/* SUBMIT BUTTONS */}
                    <div className="flex flex-col gap-2.5 mt-2.5">
                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-purple-500/10 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{isRegistered ? 'Update Registration' : 'Register Now'}</span>
                      </button>

                      {isRegistered && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                        >
                          Cancel Editing
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleToggleSave}
                        className={`w-full py-2.5 border rounded-2xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                          isSaved
                             ? 'border-pink-200 bg-pink-50 text-pink-655 font-extrabold'
                             : 'border-slate-150 bg-white hover:border-slate-250 text-slate-500'
                        }`}
                      >
                        <Heart size={12} className={isSaved ? 'fill-pink-500 text-pink-500 animate-bounce' : ''} />
                        <span>{isSaved ? 'Saved to Bookmarks' : 'Save For Later'}</span>
                      </button>
                    </div>

                  </form>
                </>
              ) : (
                /* POST-REGISTRATION STATE */
                <div className="flex flex-col gap-4 text-center py-2 animate-in zoom-in-98 duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-1 animate-pulse">
                    <Check size={22} strokeWidth={3} />
                  </div>

                  <div>
                    <h3 className="font-display font-extrabold text-sm text-slate-800">
                      {registrationRequired ? "You're Registered!" : "Ready to Start!"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                      {registrationRequired 
                        ? "Your examination terminal key has been generated and validated."
                        : "This test does not require registration. Click below to begin."}
                    </p>
                  </div>

                  {/* Pulsing Start Test CTA */}
                  <button
                    type="button"
                    onClick={startTestEnvironment}
                    className="w-full mt-2 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-display font-black rounded-2xl text-sm shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/35 transition-all active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer relative group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                    <Play size={16} className="fill-white animate-pulse" />
                    <span className="tracking-wide uppercase">Start Test</span>
                  </button>

                  {registrationRequired && (
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-[10px] font-bold text-purple-650 hover:text-purple-750 hover:underline outline-none cursor-pointer"
                      >
                        Edit Registration Details
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRegistration}
                        className="text-[9px] font-bold text-slate-400 hover:text-red-500 transition-colors hover:underline outline-none cursor-pointer"
                      >
                        Cancel Registration
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* SECURITY & RULES NOTES CARD */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5.5 shadow-sm flex flex-col gap-3.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={11} className="text-amber-500" />
                <span>Security Guidelines</span>
              </span>

              <div className="flex flex-col gap-2.5 text-[10px] font-semibold text-slate-400 leading-normal">
                <p>✓ Active camera proctoring is enabled. Ensure you are in a quiet, well-lit environment.</p>
                <p>✓ Navigating away from the active tab or opening developer utilities will trigger a validation warning flag.</p>
                <p>✓ You have exactly {testDetail.duration} minutes to submit responses once execution commences.</p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 5. SIMULATED TEST SECURE TERMINAL MODAL (SECURE MODE BYPASS) */}
      <AnimatePresence>
        {showTestingModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-60 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
            
            {/* Camera feed proctor mockup */}
            {testingStep === 4 && (
              <div className="absolute top-5 right-5 w-32 h-24 rounded-xl overflow-hidden border border-purple-500/30 bg-slate-800 shadow-lg flex flex-col justify-between p-2">
                <div className="flex justify-between items-center text-[7px] font-bold text-emerald-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>PROCTOR ACTIVE</span>
                  </span>
                  <span>CAM-01</span>
                </div>
                <div className="w-full text-center text-[8px] font-bold text-slate-500 my-auto">
                  Camera Feed
                </div>
                <div className="text-[7px] font-bold text-slate-300 truncate text-center bg-slate-900/60 p-0.5 rounded">
                  Jane Challenger
                </div>
              </div>
            )}

            {/* Steps Rendering */}
            <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
              
              {/* Step 1: Camera permission simulation */}
              {testingStep === 1 && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center animate-pulse">
                    <RefreshCw size={28} className="animate-spin" />
                  </div>
                  <h3 className="font-display font-extrabold text-base tracking-tight">Verifying Proctor Assets</h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Accessing web-camera nodes and calibrating standard ambient lighting metrics...
                  </p>
                </motion.div>
              )}

              {/* Step 2: Screen sharing permission simulation */}
              {testingStep === 2 && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center animate-pulse">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="font-display font-extrabold text-base tracking-tight">Locking Browser Window</h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Verifying screen state and establishing high-frequency secure window hooks...
                  </p>
                </motion.div>
              )}

              {/* Step 3: Launch success calibration */}
              {testingStep === 3 && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="font-display font-extrabold text-base tracking-tight text-emerald-400">Environment Calibrated</h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Secure channel authorized. Redirecting key variables into active evaluation terminal...
                  </p>
                </motion.div>
              )}

              {/* Step 4: Active assessment simulation */}
              {testingStep === 4 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full flex flex-col items-center gap-6"
                >
                  {/* Timer Header */}
                  <div className="flex flex-col items-center gap-1 border border-slate-800 bg-slate-900/60 p-4.5 rounded-2xl w-full">
                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">Time Remaining</span>
                    <span className="text-2xl font-mono font-black text-rose-500 tracking-wider">
                      {formatTime(testTimeLeft)}
                    </span>
                  </div>

                  {/* Active Question Simulator */}
                  <div className="w-full text-left bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col gap-4">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase">
                      <span>Question 1 of {testDetail.questions}</span>
                      <span className="text-purple-400 font-extrabold">5 Points</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-200 leading-relaxed">
                      {activeId === 'java-mock-test' 
                        ? 'Which of the following is true about abstract classes and interfaces in Java 8 and beyond?'
                        : 'Explain how object allocation and runtime scope functions in the compiler environment.'}
                    </h4>

                    {/* MCQ Options */}
                    <div className="flex flex-col gap-2.5 mt-2">
                      {[
                        'Abstract classes can define state variables while Interfaces cannot.',
                        'Interfaces support multiple inheritance properties whereas Abstract classes do not.',
                        'Both can define default method execution nodes but only Abstract classes support constructors.',
                        'All of the above statements are correct.'
                      ].map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="px-4 py-3 rounded-xl border border-slate-800 hover:border-purple-500/40 bg-slate-900/40 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer flex items-center gap-3"
                        >
                          <div className="w-5 h-5 rounded-lg border border-slate-700 bg-slate-950 flex items-center justify-center shrink-0 font-display font-extrabold text-[9px]">
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4.5 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTestingModal(false);
                        setTestingStep(0);
                        showToast('Secure mock test submitted successfully!');
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold rounded-2xl text-xs transition-all active:scale-[0.98] cursor-pointer text-center shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
                    >
                      Submit Assessment
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const leave = confirm("WARNING: Navigating away will terminate the secure proctor environment. Are you sure you want to exit?");
                        if (leave) {
                          setShowTestingModal(false);
                          setTestingStep(0);
                          showToast('Exited active test session.');
                        }
                      }}
                      className="px-6 py-3 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200 transition-all rounded-2xl text-xs font-bold cursor-pointer"
                    >
                      Exit Session
                    </button>
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default PublicTestDetailView;
