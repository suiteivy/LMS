import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, FlatList } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ChevronLeft, Plus, DollarSign, PieChart, Wallet } from "lucide-react-native";
import { FundsAPI, Fund, Allocation } from "@/services/FundsService";

export default function FundManager() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [funds, setFunds] = useState<Fund[]>([]);
    const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
    const [allocations, setAllocations] = useState<Allocation[]>([]);

    const [createFundModal, setCreateFundModal] = useState(false);
    const [createAllocationModal, setCreateAllocationModal] = useState(false);

    // Form states
    const [fundName, setFundName] = useState("");
    const [fundTotal, setFundTotal] = useState("");

    const [allocTitle, setAllocTitle] = useState("");
    const [allocAmount, setAllocAmount] = useState("");
    const [allocCategory, setAllocCategory] = useState("General");

    useEffect(() => {
        loadFunds();
    }, []);

    useEffect(() => {
        if (selectedFund) {
            loadAllocations(selectedFund.id);
        }
    }, [selectedFund]);

    const loadFunds = async () => {
        setLoading(true);
        try {
            const data = await FundsAPI.getFunds();
            setFunds(data);
            if (data.length > 0 && !selectedFund) {
                // Optional: Auto select first? No, let user select.
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllocations = async (fundId: string) => {
        try {
            const data = await FundsAPI.getAllocations(fundId);
            setAllocations(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateFund = async () => {
        try {
            await FundsAPI.createFund({ name: fundName, total_amount: Number(fundTotal) });
            setCreateFundModal(false);
            setFundName(""); setFundTotal("");
            loadFunds();
        } catch (error) {
            Alert.alert("Error", "Failed to create fund");
        }
    };

    const handleCreateAllocation = async () => {
        if (!selectedFund) return;
        try {
            await FundsAPI.createAllocation({
                fund_id: selectedFund.id,
                title: allocTitle,
                amount: Number(allocAmount),
                category: allocCategory
            });
            setCreateAllocationModal(false);
            setAllocTitle(""); setAllocAmount("");
            loadAllocations(selectedFund.id);
            // Also reload funds to update allocated_amount
            loadFunds();
        } catch (error) {
            Alert.alert("Error", "Failed to allocate");
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <View className="bg-white px-6 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between shadow-sm">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-gray-50 p-2 rounded-full">
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Funds Allocation</Text>
                        <Text className="text-sm text-gray-500">Manage school budgets</Text>
                    </View>
                </View>
                <TouchableOpacity
                    className="bg-orange-500 p-3 rounded-full shadow-md"
                    onPress={() => setCreateFundModal(true)}
                >
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#f97316" className="mt-10" />
            ) : (
                <View className="flex-1 p-6">
                    {/* Fund List Horizontal */}
                    <Text className="text-gray-700 font-semibold mb-3">Budgets:</Text>
                    <View className="mb-6">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-4">
                            {funds.map(fund => (
                                <TouchableOpacity
                                    key={fund.id}
                                    onPress={() => setSelectedFund(fund)}
                                    className={`w-64 p-5 rounded-2xl border ${selectedFund?.id === fund.id ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-100'} shadow-sm mr-4`}
                                >
                                    <Text className={`text-lg font-bold mb-1 ${selectedFund?.id === fund.id ? 'text-white' : 'text-gray-800'}`}>{fund.name}</Text>
                                    <Text className={`text-xs mb-3 ${selectedFund?.id === fund.id ? 'text-orange-100' : 'text-gray-500'}`}>Total: ${fund.total_amount}</Text>

                                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                        <View
                                            className="h-full bg-green-400"
                                            style={{ width: `${Math.min((fund.allocated_amount / fund.total_amount) * 100, 100)}%` }}
                                        />
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className={`text-xs ${selectedFund?.id === fund.id ? 'text-orange-100' : 'text-gray-500'}`}>
                                            Allocated: ${fund.allocated_amount}
                                        </Text>
                                        <Text className={`text-xs font-bold ${selectedFund?.id === fund.id ? 'text-white' : 'text-gray-700'}`}>
                                            {Math.round((fund.allocated_amount / fund.total_amount) * 100)}%
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Allocations List */}
                    {selectedFund ? (
                        <View className="flex-1">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-lg font-bold text-gray-800">Allocations</Text>
                                <TouchableOpacity
                                    onPress={() => setCreateAllocationModal(true)}
                                    className="bg-gray-100 px-4 py-2 rounded-full"
                                >
                                    <Text className="text-orange-600 font-bold text-sm">+ Add Item</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={allocations}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <View className="bg-white p-4 rounded-xl border border-gray-100 mb-3 flex-row justify-between items-center shadow-sm">
                                        <View>
                                            <Text className="text-base font-bold text-gray-800">{item.title}</Text>
                                            <Text className="text-xs text-gray-400">{item.category} • {item.status}</Text>
                                        </View>
                                        <Text className="text-base font-bold text-green-600">${item.amount}</Text>
                                    </View>
                                )}
                                ListEmptyComponent={<Text className="text-gray-400 text-center mt-4">No allocations yet.</Text>}
                            />
                        </View>
                    ) : (
                        <View className="flex-1 justify-center items-center">
                            <Wallet size={48} color="#d1d5db" />
                            <Text className="text-gray-400 mt-4">Select a budget to manage allocations</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Create Fund Modal */}
            <Modal visible={createFundModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-center px-6">
                    <View className="bg-white rounded-2xl p-6">
                        <Text className="text-xl font-bold mb-4">Create New Budget Fund</Text>
                        <TextInput
                            placeholder="Fund Name (e.g. Q1 Maintenance)"
                            value={fundName}
                            onChangeText={setFundName}
                            className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4"
                        />
                        <TextInput
                            placeholder="Total Amount"
                            value={fundTotal}
                            onChangeText={setFundTotal}
                            keyboardType="numeric"
                            className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6"
                        />
                        <View className="flex-row space-x-4">
                            <TouchableOpacity onPress={() => setCreateFundModal(false)} className="flex-1 bg-gray-200 p-4 rounded-xl items-center">
                                <Text className="font-bold text-gray-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateFund} className="flex-1 bg-orange-500 p-4 rounded-xl items-center">
                                <Text className="font-bold text-white">Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Create Allocation Modal */}
            <Modal visible={createAllocationModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-center px-6">
                    <View className="bg-white rounded-2xl p-6">
                        <Text className="text-xl font-bold mb-4">Allocate Expense</Text>
                        <TextInput
                            placeholder="Title (e.g. Repair Roof)"
                            value={allocTitle}
                            onChangeText={setAllocTitle}
                            className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4"
                        />
                        <TextInput
                            placeholder="Amount"
                            value={allocAmount}
                            onChangeText={setAllocAmount}
                            keyboardType="numeric"
                            className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4"
                        />
                        <TextInput
                            placeholder="Category (e.g. Repair)"
                            value={allocCategory}
                            onChangeText={setAllocCategory}
                            className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6"
                        />
                        <View className="flex-row space-x-4">
                            <TouchableOpacity onPress={() => setCreateAllocationModal(false)} className="flex-1 bg-gray-200 p-4 rounded-xl items-center">
                                <Text className="font-bold text-gray-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateAllocation} className="flex-1 bg-orange-500 p-4 rounded-xl items-center">
                                <Text className="font-bold text-white">Allocate</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
