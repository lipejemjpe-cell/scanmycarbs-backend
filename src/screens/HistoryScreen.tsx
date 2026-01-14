import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

interface Scan {
  id: string;
  type: string;
  foods: string;
  totalCarbs: number;
  totalCalories: number;
  scannedAt: string;
}

interface HistoryScreenProps {
  navigation: any;
}

export default function HistoryScreen({navigation}: HistoryScreenProps) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = () => {
    setLoading(true);
    fetch('http://192.168.1.34:3000/api/scans')
      .then(res => res.json())
      .then(data => {
        setScans(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(err => {
        console.error('Erreur chargement historique:', err);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    // Charger au montage
    loadHistory();

    // Recharger quand on revient sur l'écran
    const unsubscribe = navigation.addListener('focus', () => {
      loadHistory();
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const deleteScan = (id: string) => {
    fetch(`http://192.168.1.34:3000/api/scans/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        setScans(scans.filter(s => s.id !== id));
      })
      .catch(err => console.error('Erreur suppression:', err));
  };

  const renderScan = ({item}: {item: Scan}) => {
    const date = new Date(item.scannedAt);
    const dateStr = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let foods = [];
    try {
      foods = JSON.parse(item.foods);
    } catch (e) {
      foods = [];
    }

    return (
      <View style={styles.scanCard}>
        <View style={styles.scanHeader}>
          <Text style={styles.scanType}>
            {item.type === 'barcode' ? '📦 Code-barres' : '📸 Photo'}
          </Text>
          <Text style={styles.scanDate}>{dateStr}</Text>
        </View>

        {foods.map((food: any, index: number) => (
          <Text key={index} style={styles.foodItem}>
            • {food.name} ({food.quantity}g)
          </Text>
        ))}

        <View style={styles.scanTotals}>
          <Text style={styles.totalText}>🍞 {item.totalCarbs}g</Text>
          <Text style={styles.totalText}>🔥 {item.totalCalories} kcal</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteScan(item.id)}>
          <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (scans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📭</Text>
          <Text style={styles.emptySubtext}>Aucun scan pour le moment</Text>
          <Text style={styles.emptyHint}>Scannez un produit pour commencer !</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={scans}
        renderItem={renderScan}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    padding: 15,
  },
  scanCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  scanType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scanDate: {
    fontSize: 14,
    color: '#666',
  },
  foodItem: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },
  scanTotals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptySubtext: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyHint: {
    fontSize: 16,
    color: '#666',
  },
});