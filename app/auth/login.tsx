import { useState } from 'react';
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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import LogoIcon from '../../assets/images/Icon.jpg';
import { Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Validation de l'email
  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError('L\'email est requis');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Format d\'email invalide');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Validation du mot de passe
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Le mot de passe est requis');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Gérer le changement d'email
  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Réinitialiser l'erreur d'email dès que l'utilisateur tape
    if (emailError) {
      setEmailError('');
    }
  };

  // Gérer le changement de mot de passe
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Réinitialiser l'erreur de mot de passe dès que l'utilisateur tape
    if (passwordError) {
      setPasswordError('');
    }
  };

  const handleLogin = async () => {
    // Réinitialiser les erreurs
    setEmailError('');
    setPasswordError('');

    // Valider tous les champs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Connexion réussie, rediriger vers l'index qui va router vers le bon dashboard
      router.replace('/');
    } catch (error: any) {
      // Analyser le message d'erreur pour déterminer quel champ est incorrect
      const errorMessage = error.message || 'Erreur de connexion';
      
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('utilisateur') || errorMessage.toLowerCase().includes('compte non trouvé')) {
        setEmailError('Email non trouvé ou incorrect');
      } else if (errorMessage.toLowerCase().includes('mot de passe') || errorMessage.toLowerCase().includes('password')) {
        setPasswordError('Mot de passe incorrect');
      } else if (errorMessage.toLowerCase().includes('identifiant')) {
        // Pour "Identifiants invalides", afficher l'erreur sur le mot de passe
        setPasswordError('Email ou mot de passe incorrect');
      } else if (errorMessage.toLowerCase().includes('activ')) {
        // Compte non activé
        setEmailError('Compte non activé. Vérifiez votre email');
      } else {
        // Si on ne peut pas déterminer, afficher l'erreur sur le mot de passe
        setPasswordError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading || loading) return;

    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de se connecter avec Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image source={LogoIcon} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>Service de dépannage automobile</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Connexion</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="Email"
              value={email}
              onChangeText={handleEmailChange}
              onBlur={() => validateEmail(email)}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, passwordError && styles.inputError]}
                placeholder="Mot de passe"
                value={password}
                onChangeText={handlePasswordChange}
                onBlur={() => validatePassword(password)}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#666666" />
                ) : (
                  <Eye size={20} color="#666666" />
                )}
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.googleButton, (googleLoading || loading) && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            disabled={loading}
          >
            <Text style={styles.link}>
              Pas de compte ? <Text style={styles.linkBold}>S'inscrire</Text>
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
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#007AFF',
    marginHorizontal: -20,
    marginTop: -20,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#E5F1FF',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  passwordInputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#007AFF',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleButtonText: {
    color: '#0A1F44',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    color: '#0A1F44',
  },
  linkBold: {
    color: '#0A1F44',
    fontWeight: '600',
  },
});
