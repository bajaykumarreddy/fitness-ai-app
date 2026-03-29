import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, api, getToday, MEAL_TYPES } from '../../src/constants';

export default function Nutrition() {
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [mealType, setMealType] = useState('Lunch');
  const [items, setItems] = useState([{ name: '', calories: '' }]);

  const fetchMeals = useCallback(async () => {
    try {
      const result = await api.get(`/meals?date=${getToday()}`);
      setMeals(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchMeals(); }, []));

  const addItem = () => setItems([...items, { name: '', calories: '' }]);

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const saveMeal = async () => {
    const validItems = items.filter(i => i.name.trim());
    if (!validItems.length) { Alert.alert('Error', 'Add at least one food item'); return; }
    try {
      await api.post('/meals', {
        date: getToday(),
        meal_type: mealType.toLowerCase(),
        items: validItems.map(i => ({ name: i.name, calories: parseFloat(i.calories) || 0, protein: 0, carbs: 0, fat: 0 })),
      });
      setShowForm(false);
      setItems([{ name: '', calories: '' }]);
      fetchMeals();
    } catch (e) { Alert.alert('Error', 'Failed to save meal'); }
  };

  const analyzeImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to scan menus'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
    if (result.canceled) return;
    setAnalyzing(true);
    try {
      const analysis = await api.post('/meals/analyze', { image_base64: result.assets[0].base64, meal_type: 'lunch' });
      if (analysis.items?.length > 0) {
        setItems(analysis.items.map((i: any) => ({ name: i.name, calories: String(Math.round(i.calories || 0)) })));
        setMealType('Lunch');
        setShowForm(true);
      } else {
        Alert.alert('Analysis Result', analysis.raw_response || 'Could not identify food items. Try a clearer image.');
      }
    } catch (e) { Alert.alert('Error', 'Failed to analyze image'); }
    finally { setAnalyzing(false); }
  };

  const deleteMeal = (id: string) => {
    Alert.alert('Delete Meal', 'Remove this meal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.del(`/meals/${id}`); fetchMeals(); } },
    ]);
  };

  const totalCalories = meals.reduce((sum: number, m: any) => sum + (m.total_calories || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nutrition</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={styles.totalBadge} testID="total-calories-badge">
          <Text style={styles.totalNumber}>{Math.round(totalCalories)}</Text>
          <Text style={styles.totalLabel}>cal today</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMeals(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : meals.length === 0 ? (
          <View style={styles.emptyState} testID="meals-empty">
            <Ionicons name="nutrition-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No meals logged today</Text>
            <Text style={styles.emptySubText}>Add meals or scan your mess menu</Text>
          </View>
        ) : (
          meals.map((meal: any) => (
            <TouchableOpacity key={meal.id} style={styles.mealCard} onLongPress={() => deleteMeal(meal.id)} testID={`meal-${meal.id}`}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTypeBadge}>
                  <Text style={styles.mealTypeText}>{(meal.meal_type || '').toUpperCase()}</Text>
                </View>
                <Text style={styles.mealCal}>{Math.round(meal.total_calories)} cal</Text>
              </View>
              {meal.items?.map((item: any, i: number) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCal}>{Math.round(item.calories)} cal</Text>
                </View>
              ))}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: COLORS.success }]}
          onPress={() => { setShowForm(true); setItems([{ name: '', calories: '' }]); }}
          testID="add-meal-btn"
        >
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.bottomBtnText}>Add Meal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: COLORS.primary }]}
          onPress={analyzeImage}
          disabled={analyzing}
          testID="scan-menu-btn"
        >
          {analyzing ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={20} color="#FFF" />}
          <Text style={styles.bottomBtnText}>{analyzing ? 'Analyzing...' : 'Scan Menu'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Meal</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} testID="close-meal-modal">
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {MEAL_TYPES.map(type => (
                <TouchableOpacity key={type} style={[styles.typeChip, mealType === type && styles.typeChipActive]} onPress={() => setMealType(type)} testID={`meal-type-${type.toLowerCase()}`}>
                  <Text style={[styles.typeChipText, mealType === type && styles.typeChipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={{ maxHeight: 280 }}>
              {items.map((item, i) => (
                <View key={i} style={styles.formItemRow}>
                  <TextInput style={[styles.input, { flex: 2 }]} placeholder="Food item" placeholderTextColor={COLORS.textSecondary} value={item.name} onChangeText={v => updateItem(i, 'name', v)} testID={`item-name-${i}`} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Cal" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={item.calories} onChangeText={v => updateItem(i, 'calories', v)} testID={`item-cal-${i}`} />
                  <TouchableOpacity onPress={() => removeItem(i)} style={{ padding: 8 }}>
                    <Ionicons name="close-circle" size={20} color={items.length > 1 ? COLORS.error : COLORS.elevated} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={addItem} style={styles.addItemBtn} testID="add-food-item-btn">
                <Ionicons name="add" size={18} color={COLORS.primary} />
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Add Item</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={saveMeal} testID="save-meal-btn">
              <Text style={styles.saveBtnText}>Save Meal</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  date: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  totalBadge: { alignItems: 'center', backgroundColor: COLORS.success + '15', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  totalNumber: { fontSize: 20, fontWeight: '900', color: COLORS.success },
  totalLabel: { fontSize: 11, color: COLORS.success },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  mealCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mealTypeBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  mealTypeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 1 },
  mealCal: { fontSize: 15, fontWeight: '700', color: COLORS.success },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { fontSize: 14, color: COLORS.text, flex: 1 },
  itemCal: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, gap: 12, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  bottomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  bottomBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.elevated, marginRight: 8 },
  typeChipActive: { backgroundColor: COLORS.primary },
  typeChipText: { color: COLORS.textSecondary, fontWeight: '600' },
  typeChipTextActive: { color: '#FFF' },
  formItemRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  input: { backgroundColor: COLORS.elevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
