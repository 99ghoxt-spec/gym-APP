/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { 
  Activity, 
  Plus, 
  Trash2, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Dumbbell, 
  Zap, 
  Calendar,
  Target,
  Flame,
  TrendingUp,
  X,
  Scale
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, signIn, logOut } from './firebase';
import { getDocFromServer } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Theme Context ---
export type Theme = 'minimal' | 'nature';
export const ThemeContext = React.createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: 'minimal',
  setTheme: () => {}
});
export const useTheme = () => React.useContext(ThemeContext);

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface ExerciseSet {
  reps: number;
  weight: number;
}

interface Exercise {
  id: string;
  name: string;
  sets: number | ExerciseSet[];
  reps?: number;
  weight?: number;
  calories: number;
}

interface Workout {
  id: string;
  userId: string;
  date: any;
  bodyPart: string;
  totalCalories: number;
  status: 'active' | 'completed';
}

interface Metric {
  id: string;
  userId: string;
  weight: number;
  height: number;
  date: any;
}

// --- Constants ---
const BODY_PARTS = ['胸部', '背部', '腿部', '肩部', '手臂', '核心', '全身'];
const COMMON_EXERCISES = [
  '卧推 (Bench Press)', '深蹲 (Squat)', '硬拉 (Deadlift)',
  '引体向上 (Pull-up)', '杠铃划船 (Barbell Row)', '哑铃推举 (Dumbbell Press)',
  '侧平举 (Lateral Raise)', '弯举 (Bicep Curl)', '臂屈伸 (Tricep Extension)', '卷腹 (Crunch)'
];

// --- Components ---

const WorkoutHistoryItem = ({ workout, onDelete }: { key?: string | number, workout: Workout, onDelete: (id: string) => Promise<void> }) => {
  const [expanded, setExpanded] = useState(false);
  const [historyExercises, setHistoryExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const toggleExpand = async () => {
    if (!expanded && historyExercises.length === 0) {
      setLoading(true);
      try {
        const q = query(collection(db, `workouts/${workout.id}/exercises`));
        const snapshot = await getDocs(q);
        setHistoryExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className={cn("group flex flex-col p-4 rounded-2xl transition-all", theme === 'nature' ? "bg-white shadow-sm" : "bg-zinc-50 border border-zinc-100 hover:border-zinc-300")}>
      <div className="flex items-center justify-between cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-center gap-4">
          <div className={cn("w-10 h-10 flex items-center justify-center rounded-xl", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-white border border-zinc-200 shadow-sm")}>
            <Zap className={cn("w-5 h-5", theme === 'nature' ? "text-[#A3C87A]" : "text-zinc-700")} />
          </div>
          <div>
            <h4 className={cn("text-sm font-semibold", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>{workout.bodyPart} 训练</h4>
            <div className={cn("flex items-center gap-3 text-xs font-medium mt-1", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {format(workout.date?.toDate ? workout.date.toDate() : new Date(workout.date), 'MM月dd日')}</span>
              <span className={cn("flex items-center gap-1", theme === 'nature' ? "text-[#A3C87A]" : "text-orange-500")}><Flame className="w-3.5 h-3.5" /> {workout.totalCalories} 千卡</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(workout.id); }}
            className={cn("opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all", theme === 'nature' ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-zinc-400 hover:text-red-500 hover:bg-red-50")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className={cn("w-5 h-5", theme === 'nature' ? "text-[#2A6041]/40" : "text-zinc-400")} /> : <ChevronDown className={cn("w-5 h-5", theme === 'nature' ? "text-[#2A6041]/40" : "text-zinc-400")} />}
        </div>
      </div>
      
      {expanded && (
        <div className={cn("mt-4 pt-4 border-t", theme === 'nature' ? "border-[#F4F7F4]" : "border-zinc-200/60")}>
          {loading ? (
            <div className={cn("text-xs text-center py-2", theme === 'nature' ? "text-[#2A6041]/50" : "text-zinc-400")}>加载中...</div>
          ) : historyExercises.length > 0 ? (
            <div className="space-y-3">
              {historyExercises.map(ex => (
                <div key={ex.id} className={cn("p-3 rounded-xl", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-white border border-zinc-100")}>
                  <div className={cn("text-sm font-medium mb-2", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>{ex.name}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Array.isArray(ex.sets) ? ex.sets.map((set, i) => (
                      <div key={i} className={cn("text-xs px-2 py-1.5 rounded-lg", theme === 'nature' ? "bg-white text-[#2A6041]/80" : "bg-zinc-50 text-zinc-600 border border-zinc-100")}>
                        <span className={cn("mr-1", theme === 'nature' ? "text-[#2A6041]/40" : "text-zinc-400")}>#{i + 1}</span>
                        {set.weight}kg × {set.reps}次
                      </div>
                    )) : (
                      <div className={cn("text-xs px-2 py-1.5 rounded-lg", theme === 'nature' ? "bg-white text-[#2A6041]/80" : "bg-zinc-50 text-zinc-600 border border-zinc-100")}>
                        {ex.sets}组 × {ex.reps}次 @ {ex.weight}kg
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={cn("text-xs text-center py-2", theme === 'nature' ? "text-[#2A6041]/50" : "text-zinc-400")}>无动作记录</div>
          )}
        </div>
      )}
    </div>
  );
};

const Button = ({ 
  children, 
  onClick, 
  className, 
  variant = 'primary',
  disabled = false,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) => {
  const { theme } = useTheme();
  
  const variants = {
    minimal: {
      primary: 'bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl',
      secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-xl',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100 rounded-xl',
      ghost: 'bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 rounded-xl'
    },
    nature: {
      primary: 'bg-[#2A6041] text-white hover:bg-[#1E4A31] rounded-full shadow-md shadow-[#2A6041]/20',
      secondary: 'bg-[#F4F7F4] text-[#2A6041] hover:bg-[#E2EBE2] rounded-full',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100 rounded-full',
      ghost: 'bg-transparent text-[#2A6041]/70 hover:bg-[#F4F7F4] hover:text-[#2A6041] rounded-full'
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative px-5 py-2.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm font-medium',
        variants[theme][variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, title, variant = 'default' }: { children: React.ReactNode; className?: string; title?: string; variant?: 'default' | 'highlight' }) => {
  const { theme } = useTheme();
  
  const themeClasses = {
    minimal: {
      default: 'bg-white border border-zinc-200/60 rounded-2xl shadow-sm',
      highlight: 'bg-zinc-900 text-white rounded-2xl shadow-md'
    },
    nature: {
      default: 'bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none',
      highlight: 'bg-[#A3C87A] text-[#1A4028] rounded-[2rem] shadow-lg shadow-[#A3C87A]/30'
    }
  };

  return (
    <div className={cn('relative p-6 overflow-hidden', themeClasses[theme][variant], className)}>
      {title && (
        <div className="flex items-center gap-2 mb-5">
          <h3 className={cn("text-sm font-semibold", theme === 'nature' && variant === 'default' ? 'text-[#2A6041]' : (variant === 'highlight' ? 'text-inherit' : 'text-zinc-900'))}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
};

const Input = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => {
  const { theme } = useTheme();
  
  return (
    <div className="flex flex-col gap-1.5">
      <label className={cn("text-xs font-medium", theme === 'nature' ? 'text-[#2A6041]/70' : 'text-zinc-500')}>{label}</label>
      <input
        {...props}
        className={cn(
          "px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
          theme === 'nature' 
            ? "bg-[#F4F7F4] border-none rounded-full text-[#1A4028] focus:ring-[#A3C87A]/50" 
            : "bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-zinc-900/10 focus:border-zinc-900"
        )}
      />
    </div>
  );
};

// --- Error Handling ---
function handleFirestoreError(error: any, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  public state: any = { hasError: false, error: null };

  constructor(props: any) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
          <X className="w-12 h-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold text-zinc-900 mb-2">系统错误</h1>
          <p className="text-zinc-500 text-sm max-w-md mb-6">
            发生了一个意外错误，请尝试重新加载页面。
          </p>
          <pre className="bg-white p-4 border border-zinc-200 rounded-xl text-[10px] text-red-500 font-mono text-left max-w-full overflow-auto mb-6 shadow-sm">
            {JSON.stringify(this.state.error, null, 2)}
          </pre>
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// --- Main App Wrapper ---
export default function AppWrapper() {
  const [theme, setTheme] = useState<Theme>('nature');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeContext.Provider>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showNewWorkoutModal, setShowNewWorkoutModal] = useState(false);
  const [newWorkoutPart, setNewWorkoutPart] = useState(BODY_PARTS[0]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'profile'>('dashboard');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'bodyPart'>('all');
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>(BODY_PARTS[0]);
  const [today, setToday] = useState(new Date());
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const { theme, setTheme } = useTheme();

  const latestWeight = metrics.length > 0 ? metrics[0].weight : 70;
  const latestHeight = metrics.length > 0 ? metrics[0].height : 170;

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeWorkout = useMemo(() => {
    return workouts.find(w => {
      const wDate = w.date?.toDate ? w.date.toDate() : new Date(w.date);
      return isSameDay(wDate, today);
    }) || null;
  }, [workouts, today]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    
    // Test Connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return unsubscribe;
  }, []);

  // Workouts Listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
      setWorkouts(data);
    });
    return unsubscribe;
  }, [user]);

  // Metrics Listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'metrics'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMetrics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Metric)));
    });
    return unsubscribe;
  }, [user]);

  // Exercises Listener for Active Workout
  useEffect(() => {
    if (!activeWorkout) {
      setExercises([]);
      return;
    }
    const q = query(collection(db, `workouts/${activeWorkout.id}/exercises`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)));
    });
    return unsubscribe;
  }, [activeWorkout]);

  // --- Handlers ---

  const handleStartWorkout = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'workouts'), {
        userId: user.uid,
        date: Timestamp.now(),
        bodyPart: newWorkoutPart,
        totalCalories: 0,
        status: 'active'
      });
      setShowNewWorkoutModal(false);
    } catch (err) {
      handleFirestoreError(err, 'create', 'workouts');
    }
  };

  const handleAddExercise = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeWorkout) return;
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const reps = parseInt(formData.get('reps') as string);
    const weight = parseFloat(formData.get('weight') as string) || 0;

    const baseCalories = 5.0 * latestWeight * ((reps * 3) / 3600);
    const extraCalories = weight > 0 ? (weight * reps * 0.015) : 0;
    const estimatedCalories = Math.max(1, Math.round(baseCalories + extraCalories));

    try {
      const existingEx = exercises.find(ex => ex.name === name);
      if (existingEx) {
        let currentSets: ExerciseSet[] = [];
        if (Array.isArray(existingEx.sets)) {
          currentSets = [...existingEx.sets];
        } else if (typeof existingEx.sets === 'number') {
          currentSets = [{ weight: existingEx.weight || 0, reps: existingEx.reps || 0 }];
        }
        currentSets.push({ weight, reps });

        await updateDoc(doc(db, `workouts/${activeWorkout.id}/exercises`, existingEx.id), {
          sets: currentSets,
          calories: (existingEx.calories || 0) + estimatedCalories
        });
      } else {
        await addDoc(collection(db, `workouts/${activeWorkout.id}/exercises`), {
          name,
          sets: [{ weight, reps }],
          calories: estimatedCalories
        });
      }
      
      const newTotal = activeWorkout.totalCalories + estimatedCalories;
      await updateDoc(doc(db, 'workouts', activeWorkout.id), {
        totalCalories: newTotal
      });

      (e.currentTarget.elements.namedItem('reps') as HTMLInputElement).value = '';
    } catch (err) {
      handleFirestoreError(err, 'write', `workouts/${activeWorkout.id}/exercises`);
    }
  };

  const handleAddMetric = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const weight = parseFloat(formData.get('weight') as string);
    const height = parseFloat(formData.get('height') as string);
    try {
      await addDoc(collection(db, 'metrics'), {
        userId: user.uid,
        weight,
        height,
        date: Timestamp.now()
      });
      e.currentTarget.reset();
    } catch (err) {
      handleFirestoreError(err, 'create', 'metrics');
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workouts', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `workouts/${id}`);
    }
  };

  // --- Data for Chart & Stats ---
  const completedWorkouts = workouts;

  const workoutDaysSet = useMemo(() => {
    return new Set(completedWorkouts.map(w => {
      const d = w.date?.toDate ? w.date.toDate() : new Date(w.date);
      return format(d, 'yyyy-MM-dd');
    }));
  }, [completedWorkouts]);

  const totalWorkoutDays = workoutDaysSet.size;

  const { weeklyCalories, weeklyWorkoutDays } = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(now, { weekStartsOn: 1 });
    
    const thisWeekWorkouts = completedWorkouts.filter(w => {
      const d = w.date?.toDate ? w.date.toDate() : new Date(w.date);
      return d >= start && d <= end;
    });

    const uniqueDays = new Set(thisWeekWorkouts.map(w => {
      const d = w.date?.toDate ? w.date.toDate() : new Date(w.date);
      return format(d, 'yyyy-MM-dd');
    }));

    return {
      weeklyCalories: thisWeekWorkouts.reduce((acc, curr) => acc + curr.totalCalories, 0),
      weeklyWorkoutDays: uniqueDays.size
    };
  }, [completedWorkouts]);

  const systemSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    // 1. Body part comparison
    const targetWorkout = activeWorkout || completedWorkouts[0];
    if (targetWorkout) {
      const part = targetWorkout.bodyPart;
      const previousWorkoutsForPart = completedWorkouts.filter(w => w.bodyPart === part && w.id !== targetWorkout.id);
      if (previousWorkoutsForPart.length > 0) {
        const prev = previousWorkoutsForPart[0];
        const calDiff = targetWorkout.totalCalories - prev.totalCalories;
        if (calDiff > 0) {
          suggestions.push(`本次 ${part} 训练比上一次多消耗了 ${calDiff} 千卡，容量有所提升！`);
        } else if (calDiff < 0) {
          suggestions.push(`本次 ${part} 训练消耗略低于上一次，如果感觉疲劳请注意休息。`);
        } else {
          suggestions.push(`本次 ${part} 训练与上一次表现持平，发挥稳定。`);
        }
      } else {
        suggestions.push(`这是您近期第一次记录 ${part} 训练，感受肌肉的泵感吧！`);
      }
    }

    // 2. Week over week comparison
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekStart, 1);

    const thisWeekWorkouts = completedWorkouts.filter(w => {
      const d = w.date?.toDate ? w.date.toDate() : new Date(w.date);
      return d >= thisWeekStart;
    });
    const lastWeekWorkouts = completedWorkouts.filter(w => {
      const d = w.date?.toDate ? w.date.toDate() : new Date(w.date);
      return d >= lastWeekStart && d <= lastWeekEnd;
    });

    const thisWeekCal = thisWeekWorkouts.reduce((sum, w) => sum + w.totalCalories, 0);
    const lastWeekCal = lastWeekWorkouts.reduce((sum, w) => sum + w.totalCalories, 0);

    if (lastWeekCal > 0) {
      const diff = ((thisWeekCal - lastWeekCal) / lastWeekCal * 100).toFixed(1);
      if (thisWeekCal > lastWeekCal) {
        suggestions.push(`本周热量消耗较上周提升了 ${diff}%，保持这个势头！`);
      } else {
        suggestions.push(`本周热量消耗较上周减少了 ${Math.abs(Number(diff))}%，继续加油！`);
      }
    } else if (thisWeekCal > 0) {
      suggestions.push(`本周已经消耗了 ${thisWeekCal} 千卡，良好的开端！`);
    }

    if (suggestions.length === 0) {
      suggestions.push("欢迎回来！开始今天的训练吧。");
    }

    return suggestions;
  }, [completedWorkouts, activeWorkout]);

  const currentMonthDays = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return eachDayOfInterval({ start, end });
  }, []);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dayWorkouts = workouts.filter(w => {
        const wDate = w.date?.toDate ? w.date.toDate() : new Date(w.date);
        return isSameDay(wDate, d);
      });
      return {
        name: format(d, 'MM/dd'),
        calories: dayWorkouts.reduce((acc, curr) => acc + curr.totalCalories, 0)
      };
    });
    return last7Days;
  }, [workouts]);

  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center transition-colors duration-300", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-zinc-50")}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Activity className={cn("w-8 h-8", theme === 'nature' ? "text-[#A3C87A]" : "text-zinc-400")} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-zinc-50")}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("z-10 text-center max-w-sm w-full p-10 rounded-3xl shadow-sm border", theme === 'nature' ? "bg-white border-[#A3C87A]/30" : "bg-white border-zinc-100")}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={cn("p-3 rounded-2xl", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-zinc-100")}>
              <Dumbbell className={cn("w-8 h-8", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")} />
            </div>
          </div>
          <h1 className={cn("text-3xl font-semibold mb-3", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>
            极简健身
          </h1>
          <p className={cn("mb-10 text-sm", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>
            记录每一次蜕变，保持自律与专注。
          </p>
          <Button onClick={signIn} className="w-full py-3.5 text-base">
            <span className="flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              登录并开始
            </span>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-300", theme === 'nature' ? "bg-[#F4F7F4] text-[#1A4028] selection:bg-[#A3C87A]/30" : "bg-zinc-50 text-zinc-900 selection:bg-zinc-200")}>
      {/* Sticky Top Navigation */}
      <div className={cn(
        "sticky top-0 z-50 flex flex-col transition-colors duration-300",
        theme === 'nature' ? "bg-[#2A6041] shadow-md rounded-b-[2rem] sm:rounded-none" : "bg-white/80 backdrop-blur-xl border-b border-zinc-200/60"
      )}>
        {/* Header */}
        <header className={cn("px-6 py-4 flex items-center justify-between", theme === 'nature' ? "text-white" : "")}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className={cn("p-1.5 rounded-lg", theme === 'nature' ? "bg-[#A3C87A]" : "bg-zinc-900")}>
                <Activity className={cn("w-4 h-4", theme === 'nature' ? "text-[#1A4028]" : "text-white")} />
              </div>
              <span className="font-semibold text-lg tracking-tight">
                极简健身
              </span>
            </div>
            <nav className={cn("hidden sm:flex items-center gap-1 p-1 rounded-full", theme === 'nature' ? "bg-[#1E4A31]" : "bg-zinc-100/50 rounded-xl")}>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn("px-4 py-1.5 text-sm font-medium rounded-full transition-all", activeTab === 'dashboard' ? (theme === 'nature' ? "bg-[#A3C87A] text-[#1A4028] shadow-sm" : "bg-white text-zinc-900 shadow-sm") : (theme === 'nature' ? "text-white/70 hover:text-white" : "text-zinc-500 hover:text-zinc-700"))}
              >
                仪表盘
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={cn("px-4 py-1.5 text-sm font-medium rounded-full transition-all", activeTab === 'history' ? (theme === 'nature' ? "bg-[#A3C87A] text-[#1A4028] shadow-sm" : "bg-white text-zinc-900 shadow-sm") : (theme === 'nature' ? "text-white/70 hover:text-white" : "text-zinc-500 hover:text-zinc-700"))}
              >
                历史记录
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={cn("px-4 py-1.5 text-sm font-medium rounded-full transition-all", activeTab === 'profile' ? (theme === 'nature' ? "bg-[#A3C87A] text-[#1A4028] shadow-sm" : "bg-white text-zinc-900 shadow-sm") : (theme === 'nature' ? "text-white/70 hover:text-white" : "text-zinc-500 hover:text-zinc-700"))}
              >
                身体数据
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'minimal' ? 'nature' : 'minimal')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-full transition-colors border", theme === 'nature' ? "bg-[#1E4A31] text-[#A3C87A] border-[#A3C87A]/30 hover:bg-[#1A4028]" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")}
            >
              {theme === 'minimal' ? '🌿 自然主题' : '⚪ 极简主题'}
            </button>
            <div className="hidden sm:flex flex-col items-end">
              <span className={cn("text-[10px] font-medium", theme === 'nature' ? "text-white/70" : "text-zinc-400")}>当前用户</span>
              <span className={cn("text-sm font-medium", theme === 'nature' ? "text-white" : "text-zinc-700")}>{user.displayName || user.email}</span>
            </div>
            <button onClick={logOut} className={cn("p-2 rounded-full transition-colors", theme === 'nature' ? "hover:bg-[#1E4A31] text-white/70 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900")}>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Nav */}
        <div className="sm:hidden px-4 pb-4 pt-0 flex gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn("flex-1 py-2 text-sm font-medium rounded-full transition-all", activeTab === 'dashboard' ? (theme === 'nature' ? "bg-[#A3C87A] text-[#1A4028]" : "bg-zinc-100 text-zinc-900") : (theme === 'nature' ? "text-white/70" : "text-zinc-500"))}
          >
            仪表盘
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn("flex-1 py-2 text-sm font-medium rounded-full transition-all", activeTab === 'history' ? (theme === 'nature' ? "bg-[#A3C87A] text-[#1A4028]" : "bg-zinc-100 text-zinc-900") : (theme === 'nature' ? "text-white/70" : "text-zinc-500"))}
          >
            历史记录
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn("flex-1 py-2 text-sm font-medium rounded-full transition-all", activeTab === 'profile' ? (theme === 'nature' ? "bg-[#A3C87A] text-[#1A4028]" : "bg-zinc-100 text-zinc-900") : (theme === 'nature' ? "text-white/70" : "text-zinc-500"))}
          >
            身体数据
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Stats & Suggestion */}
            <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
              
              {/* System Suggestion */}
              <Card title="系统建议">
                <div className="space-y-4 mt-4">
                  {systemSuggestions.map((suggestion, idx) => (
                    <div key={idx} className={cn("flex gap-3 p-3.5 rounded-xl", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-zinc-50 border border-zinc-100")}>
                      <div className={cn("w-1 h-auto rounded-full", theme === 'nature' ? (idx % 2 === 0 ? "bg-[#2A6041]" : "bg-[#A3C87A]") : (idx % 2 === 0 ? "bg-blue-500" : "bg-emerald-500"))} />
                      <p className={cn("text-xs leading-relaxed", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-600")}>
                        "{suggestion}"
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card variant={theme === 'nature' ? 'highlight' : 'default'} className="flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className={cn("text-xs font-medium", theme === 'nature' ? "text-[#1A4028]/70" : "text-zinc-500")}>本周消耗</span>
                    <div className={cn("p-1.5 rounded-lg", theme === 'nature' ? "bg-white/20" : "bg-orange-50")}>
                      <Flame className={cn("w-4 h-4", theme === 'nature' ? "text-[#1A4028]" : "text-orange-500")} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn("text-3xl font-semibold", theme === 'nature' ? "text-[#1A4028]" : "text-zinc-900")}>
                      {weeklyCalories}
                    </span>
                    <span className={cn("text-sm font-medium", theme === 'nature' ? "text-[#1A4028]/70" : "text-zinc-500")}>千卡</span>
                  </div>
                </Card>
                <Card className="flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className={cn("text-xs font-medium", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>本周训练</span>
                    <div className={cn("p-1.5 rounded-lg", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-blue-50")}>
                      <Target className={cn("w-4 h-4", theme === 'nature' ? "text-[#2A6041]" : "text-blue-500")} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn("text-3xl font-semibold", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>{weeklyWorkoutDays}</span>
                    <span className={cn("text-sm font-medium", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>天</span>
                  </div>
                </Card>
                <Card className="flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className={cn("text-xs font-medium", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>总训练天数</span>
                    <div className={cn("p-1.5 rounded-lg", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-emerald-50")}>
                      <Calendar className={cn("w-4 h-4", theme === 'nature' ? "text-[#2A6041]" : "text-emerald-500")} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn("text-3xl font-semibold", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>{totalWorkoutDays}</span>
                    <span className={cn("text-sm font-medium", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>天</span>
                  </div>
                </Card>
              </div>
            </div>

            {/* Right Column: Active Mission & Controls */}
            <div className="lg:col-span-4 space-y-6 order-1 lg:order-2">
              
              {/* Active Mission */}
              {activeWorkout ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className={cn(theme === 'minimal' && "border-zinc-900 shadow-md")}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn("w-2 h-2 animate-pulse rounded-full", theme === 'nature' ? "bg-[#A3C87A]" : "bg-emerald-500")} />
                      <span className={cn("text-[10px] font-bold tracking-wider", theme === 'nature' ? "text-[#2A6041]" : "text-emerald-600")}>当前训练</span>
                    </div>
                    <h2 className={cn("text-2xl font-semibold", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>{activeWorkout.bodyPart}</h2>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-xs font-medium block mb-0.5", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>消耗热量</span>
                    <span className={cn("text-xl font-semibold", theme === 'nature' ? "text-[#A3C87A]" : "text-orange-500")}>{activeWorkout.totalCalories}</span>
                  </div>
                </div>

                {/* Exercise Form */}
                <form onSubmit={handleAddExercise} className="space-y-4 mb-8">
                  <Input label="动作名称" name="name" list="common-exercises" placeholder="选择或输入动作" required />
                  <datalist id="common-exercises">
                    {COMMON_EXERCISES.map(ex => <option key={ex} value={ex} />)}
                  </datalist>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="重量 (kg)" name="weight" type="number" step="0.5" required />
                    <Input label="次数" name="reps" type="number" required />
                  </div>
                  <Button className="w-full py-3">
                    <span className="flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      记录本组
                    </span>
                  </Button>
                </form>

                {/* Exercise List */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {exercises.map((ex) => (
                    <div key={ex.id} className={cn("p-3.5 rounded-xl flex justify-between items-start group", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-zinc-50 border border-zinc-100")}>
                      <div className="flex-1">
                        <div className={cn("text-sm font-medium mb-2", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>{ex.name}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(ex.sets) ? ex.sets.map((set, i) => (
                            <div key={i} className={cn("text-[11px] px-2 py-1 rounded", theme === 'nature' ? "bg-white text-[#2A6041]/70" : "bg-white text-zinc-500 border border-zinc-100")}>
                              <span className={cn("mr-1", theme === 'nature' ? "text-[#2A6041]/40" : "text-zinc-400")}>#{i + 1}</span>
                              {set.weight}kg × {set.reps}次
                            </div>
                          )) : (
                            <div className={cn("text-[11px] px-2 py-1 rounded", theme === 'nature' ? "bg-white text-[#2A6041]/70" : "bg-white text-zinc-500 border border-zinc-100")}>
                              {ex.sets} 组 × {ex.reps} 次 @ {ex.weight}kg
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={cn("text-sm font-semibold ml-3", theme === 'nature' ? "text-[#A3C87A]" : "text-orange-500")}>+{ex.calories}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ) : (
            <Card className={cn("flex flex-col items-center justify-center py-12 text-center", theme === 'nature' ? "bg-white/50" : "border-dashed border-zinc-200 bg-zinc-50/50")}>
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-5", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-white shadow-sm border border-zinc-100")}>
                <Zap className={cn("w-7 h-7", theme === 'nature' ? "text-[#A3C87A]" : "text-zinc-400")} />
              </div>
              <h3 className={cn("text-base font-semibold mb-2", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>当前无训练</h3>
              <p className={cn("text-sm mb-6", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>准备好开始今天的挑战了吗？</p>
              <Button onClick={() => setShowNewWorkoutModal(true)}>
                开始新训练
              </Button>
            </Card>
          )}
        </div>
      </div>
      ) : activeTab === 'history' ? (
        <div className="space-y-6">
          {/* Monthly Attendance */}
          <Card title="本月出勤">
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {currentMonthDays.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isAttended = workoutDaysSet.has(dateStr);
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-medium transition-colors",
                        isAttended 
                          ? (theme === 'nature' ? "bg-[#A3C87A] text-[#1A4028] shadow-sm" : "bg-emerald-500 text-white shadow-sm") 
                          : (theme === 'nature' ? "bg-white text-[#2A6041]/40" : "bg-zinc-100 text-zinc-400")
                      )}
                      title={dateStr}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* History List with Filters */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className={cn("font-semibold", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>训练记录</h3>
              <div className={cn("flex items-center gap-2 p-1 rounded-full", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-zinc-100/50 rounded-xl")}>
                <button 
                  onClick={() => setHistoryFilter('all')}
                  className={cn("px-3 py-1.5 text-xs font-medium rounded-full transition-all", historyFilter === 'all' ? (theme === 'nature' ? "bg-white text-[#2A6041] shadow-sm" : "bg-white text-zinc-900 shadow-sm") : (theme === 'nature' ? "text-[#2A6041]/60 hover:text-[#2A6041]" : "text-zinc-500 hover:text-zinc-700"))}
                >
                  按日期
                </button>
                <button 
                  onClick={() => setHistoryFilter('bodyPart')}
                  className={cn("px-3 py-1.5 text-xs font-medium rounded-full transition-all", historyFilter === 'bodyPart' ? (theme === 'nature' ? "bg-white text-[#2A6041] shadow-sm" : "bg-white text-zinc-900 shadow-sm") : (theme === 'nature' ? "text-[#2A6041]/60 hover:text-[#2A6041]" : "text-zinc-500 hover:text-zinc-700"))}
                >
                  按部位
                </button>
              </div>
            </div>

            {historyFilter === 'bodyPart' && (
              <div className="flex flex-wrap gap-2 mb-6">
                {BODY_PARTS.map(part => (
                  <button
                    key={part}
                    onClick={() => setSelectedBodyPart(part)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-all border",
                      selectedBodyPart === part 
                        ? (theme === 'nature' ? "bg-[#2A6041] text-white border-[#2A6041]" : "bg-zinc-900 text-white border-zinc-900") 
                        : (theme === 'nature' ? "bg-white text-[#2A6041]/70 border-[#F4F7F4] hover:border-[#A3C87A]/50" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300")
                    )}
                  >
                    {part}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {completedWorkouts
                .filter(w => historyFilter === 'all' || w.bodyPart === selectedBodyPart)
                .map((workout) => (
                  <WorkoutHistoryItem key={workout.id} workout={workout} onDelete={handleDeleteWorkout} />
                ))}
              {completedWorkouts.filter(w => historyFilter === 'all' || w.bodyPart === selectedBodyPart).length === 0 && (
                <div className="text-center py-12 text-zinc-400 text-sm">
                  暂无训练记录。
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : activeTab === 'profile' ? (
        <div className="space-y-6">
          <Card title="身体数据记录">
            <form onSubmit={handleAddMetric} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={cn("text-xs font-medium mb-1 block", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>体重 (kg)</label>
                <input
                  type="number"
                  name="weight"
                  step="0.1"
                  required
                  defaultValue={latestWeight}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all",
                    theme === 'nature' 
                      ? "bg-[#F4F7F4] border-transparent focus:ring-[#A3C87A]/30 focus:border-[#A3C87A] text-[#2A6041] placeholder:text-[#2A6041]/40" 
                      : "bg-zinc-50 border border-zinc-200 focus:ring-zinc-900/10 focus:border-zinc-900"
                  )}
                  placeholder="例如: 70.5"
                />
              </div>
              <div>
                <label className={cn("text-xs font-medium mb-1 block", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>身高 (cm)</label>
                <input
                  type="number"
                  name="height"
                  step="0.1"
                  required
                  defaultValue={latestHeight}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all",
                    theme === 'nature' 
                      ? "bg-[#F4F7F4] border-transparent focus:ring-[#A3C87A]/30 focus:border-[#A3C87A] text-[#2A6041] placeholder:text-[#2A6041]/40" 
                      : "bg-zinc-50 border border-zinc-200 focus:ring-zinc-900/10 focus:border-zinc-900"
                  )}
                  placeholder="例如: 175"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full py-3">
                  <Plus className="w-4 h-4 mr-2" />
                  记录今日数据
                </Button>
              </div>
            </form>
          </Card>

          {metrics.length > 0 && (
            <Card title="体重变化趋势">
              <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...metrics].reverse()} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => {
                        const d = val?.toDate ? val.toDate() : new Date(val);
                        return format(d, 'MM/dd');
                      }}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 10 }}
                      dy={10}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(label) => {
                        const d = label?.toDate ? label.toDate() : new Date(label);
                        return format(d, 'yyyy-MM-dd HH:mm');
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke={theme === 'nature' ? '#A3C87A' : '#18181b'} 
                      strokeWidth={3}
                      dot={{ r: 4, fill: theme === 'nature' ? '#A3C87A' : '#18181b', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: theme === 'nature' ? '#2A6041' : '#18181b', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card title="历史记录">
            <div className="mt-4 space-y-3">
              {metrics.map((m) => (
                <div key={m.id} className={cn("flex items-center justify-between p-4 rounded-xl", theme === 'nature' ? "bg-[#F4F7F4]" : "bg-zinc-50 border border-zinc-100")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl shadow-sm", theme === 'nature' ? "bg-white" : "bg-white border border-zinc-100")}>
                      <Scale className={cn("w-5 h-5", theme === 'nature' ? "text-[#A3C87A]" : "text-zinc-600")} />
                    </div>
                    <div>
                      <div className={cn("text-sm font-medium", theme === 'nature' ? "text-[#2A6041]" : "text-zinc-900")}>{m.weight} kg</div>
                      <div className={cn("text-xs", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>{m.height} cm</div>
                    </div>
                  </div>
                  <div className={cn("text-xs font-medium", theme === 'nature' ? "text-[#2A6041]/50" : "text-zinc-400")}>
                    {format(m.date?.toDate ? m.date.toDate() : new Date(m.date), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
      </main>

      {/* New Workout Modal */}
      <AnimatePresence>
        {showNewWorkoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewWorkoutModal(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md"
            >
              <Card title="开始新训练" className="shadow-xl">
                <button 
                  onClick={() => setShowNewWorkoutModal(false)}
                  className={cn("absolute top-5 right-5 p-1 rounded-lg transition-colors", theme === 'nature' ? "text-[#2A6041]/50 hover:text-[#2A6041] hover:bg-[#F4F7F4]" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100")}
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="space-y-6 mt-6">
                  <div>
                    <label className={cn("text-xs font-medium mb-3 block", theme === 'nature' ? "text-[#2A6041]/70" : "text-zinc-500")}>选择训练部位</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {BODY_PARTS.map((part) => (
                        <button
                          key={part}
                          onClick={() => setNewWorkoutPart(part)}
                          className={cn(
                            "px-3 py-2.5 text-sm font-medium rounded-xl border transition-all",
                            newWorkoutPart === part 
                              ? (theme === 'nature' ? "bg-[#2A6041] border-[#2A6041] text-white shadow-sm" : "bg-zinc-900 border-zinc-900 text-white shadow-sm") 
                              : (theme === 'nature' ? "bg-white border-[#F4F7F4] text-[#2A6041]/70 hover:border-[#A3C87A]/50 hover:bg-[#F4F7F4]" : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50")
                          )}
                        >
                          {part}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleStartWorkout} className="w-full py-3.5 text-sm mt-2">
                    开始训练
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
      `}</style>
    </div>
  );
}
