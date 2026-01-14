import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {Camera, CameraType} from 'react-native-camera-kit';
import {launchCamera} from 'react-native-image-picker';

type ScanMode = 'menu' | 'barcode' | 'photo';

interface FoodResult {
  name: string;
  quantity: number;
  carbs: number;
  calories: number;
}

 // Au lieu de "function App()"
export default function ScannerScreen() {
  // ... tout votre code actuel ...

  const [mode, setMode] = useState<ScanMode>('menu');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FoodResult[] | null>(null);
  const [totalCarbs, setTotalCarbs] = useState(0);
  const [totalCalories, setTotalCalories] = useState(0);

  // Sauvegarder un scan dans l'historique
  const saveScan = (type: string, foods: FoodResult[], totalCarbs: number, totalCalories: number) => {
    fetch('http://192.168.1.34:3000/api/scans', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        type,
        foods: JSON.stringify(foods),
        totalCarbs,
        totalCalories,
      }),
    })
      .then(res => res.json())
      .then(() => console.log('✅ Scan sauvegardé'))
      .catch(err => console.error('❌ Erreur sauvegarde:', err));
  };

  // Scanner code-barres
  const startBarcodeScanner = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission refusée', 'Accès caméra nécessaire');
        return;
      }
    }
    setMode('barcode');
  };

  const onBarcodeRead = (event: any) => {
    const barcode = event.nativeEvent.codeStringValue;
    setMode('menu');
    setLoading(true);

    // Appeler OpenFoodFacts
    fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.product) {
          const name = data.product.product_name || 'Produit inconnu';
          const carbs = data.product.nutriments?.carbohydrates_100g || 0;
          const calories = data.product.nutriments?.['energy-kcal_100g'] || 0;

          const foodResults = [{name, quantity: 100, carbs, calories}];
          setResults(foodResults);
          setTotalCarbs(carbs);
          setTotalCalories(calories);

          // Sauvegarder dans l'historique
          saveScan('barcode', foodResults, carbs, calories);
        } else {
          Alert.alert('Erreur', 'Produit non trouvé');
        }
      })
      .catch(() => {
        setLoading(false);
        Alert.alert('Erreur', 'Impossible de récupérer les données');
      });
  };

  // Prendre une photo et analyser
  const takePhoto = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission refusée', 'Accès caméra nécessaire');
        return;
      }
    }

    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.7,
      includeBase64: true,
    });

    if (result.assets && result.assets[0].base64) {
      setLoading(true);
      
      // Envoyer au backend
      fetch('http://192.168.1.34:3000/api/image/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({image: result.assets[0].base64}),
      })
        .then(res => res.json())
        .then(data => {
          setLoading(false);
          setResults(data.foods);
          setTotalCarbs(data.totalCarbs);
          setTotalCalories(data.totalCalories);

          // Sauvegarder dans l'historique
          saveScan('photo', data.foods, data.totalCarbs, data.totalCalories);
        })
        .catch(error => {
          setLoading(false);
          Alert.alert('Erreur', 'Échec de l\'analyse: ' + error.message);
        });
    }
  };

  // Réinitialiser
  const reset = () => {
    setMode('menu');
    setResults(null);
    setTotalCarbs(0);
    setTotalCalories(0);
  };

  // Affichage des résultats
  if (results) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>📊 Résultats</Text>
          
          {results.map((food, index) => (
            <View key={index} style={styles.foodCard}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodDetail}>Quantité: {food.quantity}g</Text>
              <Text style={styles.foodDetail}>Glucides: {food.carbs}g</Text>
              <Text style={styles.foodDetail}>Calories: {food.calories} kcal</Text>
            </View>
          ))}

          <View style={styles.totalCard}>
            <Text style={styles.totalTitle}>TOTAL</Text>
            <Text style={styles.totalText}>🍞 Glucides: {totalCarbs}g</Text>
            <Text style={styles.totalText}>🔥 Calories: {totalCalories} kcal</Text>
          </View>

          <TouchableOpacity style=