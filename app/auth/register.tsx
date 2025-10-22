import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserType, MECHANIC_SPECIALTIES } from '@/types/database';
import { ArrowLeft } from 'lucide-react-native';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [userType, setUserType] = useState<UserType>('client');
  const [mechanicSpecialty, setMechanicSpecialty] = useState<(typeof MECHANIC_SPECIALTIES)[number] | null>(null);
  const [idCardNumber, setIdCardNumber] = useState('');
  const [showUserTypePicker, setShowUserTypePicker] = useState(false);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userType !== 'mechanic') {
      setMechanicSpecialty(null);
      setIdCardNumber('');
      setShowSpecialtyPicker(false);
    }
  }, [userType]);

  const handleRegister = async () => {
    if (
      !email ||
      !password ||
      !confirmPassword ||
      !firstName ||
      !lastName ||
      !phone ||
      !address
    ) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (userType === 'mechanic' && (!mechanicSpecialty || !idCardNumber)) {
      Alert.alert('Erreur', 'Veuillez sélectionner une spécialité et saisir votre numéro d\'identité');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, {
        firstName,
        lastName,
        phone,
        address,
        userType,
        idCardNumber: userType === 'mechanic' ? idCardNumber : undefined,
        specialties:
          userType === 'mechanic' && mechanicSpecialty
            ? [mechanicSpecialty]
            : undefined,
      });
      Alert.alert('Succès', 'Compte créé avec succès !', [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <ArrowLeft color="#FFFFFF" size={16} />
          </TouchableOpacity>
          <Text style={styles.logo}>TerangaAuto</Text>
          <Text style={styles.subtitle}>Créer un compte</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.userTypeContainer}>
            <Text style={styles.inputLabel}>Type d'utilisateur</Text>
            <TouchableOpacity
              style={[styles.input, styles.userTypeInput]}
              onPress={() => setShowUserTypePicker((prev) => !prev)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.userTypeValue}>
                {userType === 'client' ? 'Client' : 'Mécanicien'}
              </Text>
              <Text style={styles.userTypeArrow}>{showUserTypePicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showUserTypePicker && (
              <View style={styles.userTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.userTypeOption,
                    userType === 'client' && styles.userTypeOptionActive,
                  ]}
                  onPress={() => {
                    setUserType('client');
                    setShowUserTypePicker(false);
                  }}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.userTypeOptionText,
                      userType === 'client' && styles.userTypeOptionTextActive,
                    ]}
                  >
                    Client
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeOption,
                    userType === 'mechanic' && styles.userTypeOptionActive,
                  ]}
                  onPress={() => {
                    setUserType('mechanic');
                    setShowUserTypePicker(false);
                  }}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.userTypeOptionText,
                      userType === 'mechanic' && styles.userTypeOptionTextActive,
                    ]}
                  >
                    Mécanicien
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {userType === 'mechanic' && (
            <View style={styles.specialtyContainer}>
              <Text style={styles.inputLabel}>Spécialité</Text>
              <TouchableOpacity
                style={[styles.input, styles.userTypeInput]}
                onPress={() => setShowSpecialtyPicker((prev) => !prev)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.userTypeValue,
                    !mechanicSpecialty && styles.placeholderText,
                  ]}
                >
                  {mechanicSpecialty ?? 'Sélectionner une spécialité'}
                </Text>
                <Text style={styles.userTypeArrow}>{showSpecialtyPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showSpecialtyPicker && (
                <View style={styles.userTypeOptions}>
                  {MECHANIC_SPECIALTIES.map((specialty) => (
                    <TouchableOpacity
                      key={specialty}
                      style={[
                        styles.userTypeOption,
                        mechanicSpecialty === specialty && styles.userTypeOptionActive,
                      ]}
                      onPress={() => {
                        setMechanicSpecialty(specialty);
                        setShowSpecialtyPicker(false);
                      }}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.userTypeOptionText,
                          mechanicSpecialty === specialty && styles.userTypeOptionTextActive,
                        ]}
                      >
                        {specialty}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={styles.inputLabel}>Prénom</Text>
          <TextInput
            style={styles.input}
            placeholder="Saisissez votre prénom"
            value={firstName}
            onChangeText={setFirstName}
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Nom</Text>
          <TextInput
            style={styles.input}
            placeholder="Saisissez votre nom"
            value={lastName}
            onChangeText={setLastName}
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Téléphone</Text>
          <TextInput
            style={styles.input}
            placeholder="Indiquez votre numéro de téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Adresse</Text>
          <TextInput
            style={styles.input}
            placeholder="Renseignez votre adresse"
            value={address}
            onChangeText={setAddress}
            editable={!loading}
          />

          {userType === 'mechanic' && (
            <>
              <Text style={styles.inputLabel}>Numéro d'identité</Text>
              <TextInput
                style={styles.input}
                placeholder="Saisissez votre numéro d'identité"
                value={idCardNumber}
                onChangeText={setIdCardNumber}
                editable={!loading}
                keyboardType="default"
              />
            </>
          )}

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez votre adresse email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Créez un mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirmez votre mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Inscription...' : "S'inscrire"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.link}>
              Déjà un compte ? <Text style={styles.linkBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1F44',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#BBD4FF',
  },
  form: {
    width: '100%',
  },
  userTypeContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
    marginLeft: 4,
  },
  userTypeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    height: 48,
    marginBottom: 16,
  },
  userTypeValue: {
    fontSize: 14,
    color: '#333333',
  },
  userTypeArrow: {
    fontSize: 14,
    color: '#6B7C9C',
  },
  userTypeOptions: {
    marginTop: 8,
    backgroundColor: '#E8F1FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBD4FF',
    overflow: 'hidden',
  },
  userTypeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userTypeOptionActive: {
    backgroundColor: '#D4E5FF',
  },
  userTypeOptionText: {
    fontSize: 16,
    color: '#0A1F44',
  },
  userTypeOptionTextActive: {
    color: '#0A1F44',
    fontWeight: '600',
  },
  specialtyContainer: {
    marginBottom: 16,
  },
  placeholderText: {
    color: '#999999',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    color: '#333333',
    height: 48,
    width: '100%',
  },
  button: {
    backgroundColor: '#0A1F44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    height: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: '#666666',
  },
  linkBold: {
    color: '#0A1F44',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
