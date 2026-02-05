import { Award, TrendingUp } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View} from "react-native";

interface GradeProps {
    // courseId: string;
    // studentId: string;
    courseName: string;
    courseCode: string;
    grade: string;
    score: number,
    credits: number;
}

const CourseGrade = ({ courseCode, courseName, grade, score, credits}: GradeProps) => {

    const getGradeColor = (g: string) => {
        if(g.startsWith('A')) return 'text-green-600 bg-green-50 border-green-100';
        if(g.startsWith('B')) return 'text-blue-600 bg-blue-50 border-blue-100';
        if(g.startsWith('C')) return 'text-yellow-600 bg-yellow-50 border-yellow-100';
        return 'text-red-600 bg-red-50 border-red-100'
    }
    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm flex-row items-center justify-between">
            <View className="flex-1">
                <Text className="text-xs font-bold text-gray-400 uppercase">{courseCode}</Text>
                <Text className="text-gray-800 font-semibold text-base" numberOfLines={1}>{courseName}</Text>
                <Text className="text-gray-500 text-xs mt-1">{credits} Credits</Text>
            </View>
            
            <View className="items-end">
                <View className={`px-3 py-1 rounded-full border ${getGradeColor(grade)}`}>
                    <Text className={`font-bold ${getGradeColor(grade).split(' ')[0]}`}>{grade}</Text>
                </View>
                <Text className="text-gray-400 text-xs mt-1">{score}%</Text>
            </View>
        </View>
    )
}

export default function Grades(){
    return(
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4 md:p-8 max-w-3xl mx-auto w-full">
                <Text className="text-2xl font-bold text-gray-900 mb-6">Academic Performance</Text>
                <View className="bg-teal-600 rounded-3xl p-6 mb-8 shadow-lg shadow-teal-200">
                    <View className="flex-row justify-between items-start">
                        <View>
                            <Text className="text-teal-100 font-medium italic">Cumulative GPA</Text>
                            <Text className="text-white text-5xl font-black mt-1">3.82</Text>
                        </View>
                        <View className="bg-white/20 p-3 rounded-2xl">
                            <TrendingUp size={28} color="white" />
                        </View>
                    </View>
                    
                    <View className="flex-row mt-6 pt-6 border-t border-white/10 justify-between">
                        <View className="items-center flex-1">
                            <Text className="text-teal-100 text-xs uppercase">Rank</Text>
                            <Text className="text-white font-bold text-lg">#12 / 120</Text>
                        </View>
                        <View className="items-center flex-1 border-x border-white/10">
                            <Text className="text-teal-100 text-xs uppercase">Credits</Text>
                            <Text className="text-white font-bold text-lg">94</Text>
                        </View>
                        <View className="items-center flex-1">
                            <Text className="text-teal-100 text-xs uppercase">Status</Text>
                            <Text className="text-white font-bold text-lg">Honors</Text>
                        </View>
                    </View>
                </View>

                {/* --- Current Semester Section --- */}
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                        <Award size={20} color="#0d9488" />
                        <Text className="ml-2 font-bold text-gray-800">Spring Semester 2026</Text>
                    </View>
                    <Text className="text-teal-600 text-xs font-bold uppercase">4 Courses</Text>
                </View>

                <CourseGrade 
                    courseCode="CS302"
                    courseName="Advanced React Native"
                    grade="A"
                    score={96}
                    credits={4} 
                    // courseId={""} 
                    // studentId={""}               
                />
                <CourseGrade 
                    courseCode="DS101"
                    courseName="Database Systems"
                    grade="A-"
                    score={91}
                    credits={3} 
                    // courseId={""} 
                    // studentId={""}                
                />
                <CourseGrade 
                    courseCode="UX220" 
                    courseName="User Experience Design" 
                    grade="B+" 
                    score={88} 
                    credits={3} 
                />
                <CourseGrade 
                    courseCode="MAT21" 
                    courseName="Discrete Mathematics" 
                    grade="B" 
                    score={84} 
                    credits={4} 
                />

                {/* --- Past Semesters --- */}
                <TouchableOpacity className="mt-4 p-4 bg-white rounded-2xl border border-dashed border-gray-300 items-center">
                    <Text className="text-gray-500 font-medium">View Previous Semesters</Text>
                </TouchableOpacity>

            </View>
        </ScrollView>
)}