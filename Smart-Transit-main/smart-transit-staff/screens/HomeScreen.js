import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { doc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from './firebase';
import { FontAwesome } from '@expo/vector-icons';

export default function LocationScreen({ route }) {
  const { busNumber } = route.params; // Bus number from login
  const [busDetails, setBusDetails] = useState(null);
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('Running'); // Default status set to "Running"
  const [occupancy, setOccupancy] = useState(null); // Occupancy status

  // Fetch bus details
  useEffect(() => {
    const fetchBusDetails = async () => {
      try {
        const busesRef = collection(db, 'buses');
        const q = query(busesRef, where('bus_number', '==', busNumber));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const busDoc = querySnapshot.docs[0];
          setBusDetails({ id: busDoc.id, ...busDoc.data() });
          setStatus(busDoc.data().status || 'Running'); // If status exists, set it, otherwise default to "Running"
          setOccupancy(busDoc.data().occupancy); // Set initial occupancy from DB
        } else {
          Alert.alert('Error', 'No bus found for the given bus number.');
        }
      } catch (error) {
        console.error('Error fetching bus details:', error);
        Alert.alert('Error', 'Unable to fetch bus details.');
      }
    };

    fetchBusDetails();
  }, [busNumber]);

  // Auto-update location every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (location) {
        updateBusLocation();
      }
    }, 30000);

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [location]);

  // Get current location
  const handleGetLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      Alert.alert('Location Accessed', 'Your current location has been fetched.');
    } else {
      Alert.alert('Permission Denied', 'Unable to access location services.');
    }
  };

  // Update location in Firebase
  const updateBusLocation = async () => {
    if (!busDetails || !location) return;

    try {
      const docRef = doc(db, 'buses', busDetails.id);
      await updateDoc(docRef, {
        'current_location.latitude': location.coords.latitude,
        'current_location.longitude': location.coords.longitude,
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Toggle status between "Running" and "Breakdown"
  const toggleBusStatus = async () => {
    if (!busDetails) return;

    const newStatus = status === 'Running' ? 'Breakdown' : 'Running';
    try {
      const docRef = doc(db, 'buses', busDetails.id);
      await updateDoc(docRef, { status: newStatus });
      setStatus(newStatus);
      Alert.alert('Status Updated', `Bus status is now set to "${newStatus}".`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update bus status.');
    }
  };

  // Handle occupancy selection
  const handleOccupancyChange = async (selectedOccupancy) => {
    if (!busDetails) return;

    try {
      const docRef = doc(db, 'buses', busDetails.id);
      await updateDoc(docRef, { occupancy: selectedOccupancy });
      setOccupancy(selectedOccupancy); // Update local state to reflect the change
      Alert.alert('Occupancy Updated', `Bus occupancy is now set to "${selectedOccupancy}".`);
    } catch (error) {
      console.error('Error updating occupancy:', error);
      Alert.alert('Error', 'Failed to update bus occupancy.');
    }
  };

  return (
    <View style={styles.container}>
      {busDetails ? (
        <>
          <Text style={styles.title}>Bus Details</Text>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailItem}>
              <Text style={styles.label}>Name:</Text> {busDetails.bus_name}
            </Text>
            <Text style={styles.detailItem}>
              <Text style={styles.label}>Number:</Text> {busDetails.bus_number}
            </Text>
            <Text style={styles.detailItem}>
              <Text style={styles.label}>Status:</Text> {status}
            </Text>
            <Text style={styles.detailItem}>
              <Text style={styles.label}>Route:</Text> {busDetails.route}
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleGetLocation}>
            <Text style={styles.buttonText}>Get Current Location</Text>
          </TouchableOpacity>
          {location && (
            <Text style={styles.locationText}>
              Latitude: {location.coords.latitude}, Longitude: {location.coords.longitude}
            </Text>
          )}

          <Text style={styles.occupancyTitle}>Occupancy Status</Text>
          <View style={styles.occupancyContainer}>
            <TouchableOpacity
              style={[styles.occupancyIcon, occupancy === 'Overcrowded' && styles.selectedIcon]}
              onPress={() => handleOccupancyChange('Overcrowded')}
            >
              <FontAwesome name="exclamation-circle" size={40} color="red" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.occupancyIcon, occupancy === 'Fully Seated' && styles.selectedIcon]}
              onPress={() => handleOccupancyChange('Fully Seated')}
            >
              <FontAwesome name="check-circle" size={40} color="green" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.occupancyIcon, occupancy === 'Less Busy' && styles.selectedIcon]}
              onPress={() => handleOccupancyChange('Less Busy')}
            >
              <FontAwesome name="thumbs-up" size={40} color="blue" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, status === 'Running' ? styles.breakdownButton : styles.runningButton]}
            onPress={toggleBusStatus}
          >
            <Text style={styles.buttonText}>
              {status === 'Running' ? 'Set to Breakdown' : 'Set to Running'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.loadingText}>Loading bus details...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#f7f8fc',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  detailItem: {
    fontSize: 18,
    marginBottom: 8,
    color: '#555',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  breakdownButton: {
    backgroundColor: '#f44336',
  },
  runningButton: {
    backgroundColor: '#2196F3',
  },
  locationText: {
    fontSize: 16,
    marginTop: 10,
    color: '#333',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#777',
    textAlign: 'center',
  },
  occupancyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 20,
    textAlign: 'center',
  },
  occupancyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  occupancyIcon: {
    padding: 15,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  selectedIcon: {
    backgroundColor: '#d1e7dd',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
});
