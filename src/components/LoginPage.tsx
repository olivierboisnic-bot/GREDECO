import React, { useState, useEffect } from 'react';
import { Lock, Mail, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthProvider';
import GredecoLogo from './GredecoLogo';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('gredeco_saved_email');
    const savedPassword = localStorage.getItem('gredeco_saved_password');
    const savedRemember = localStorage.getItem('gredeco_remember_me');
    if (savedEmail && savedRemember === 'true') {
      setEmail(savedEmail);
      setRememberMe(true);
      if (savedPassword) {
        try {
          setPassword(atob(savedPassword));
        } catch (e) {
          console.error('Failed to decode password');
        }
      }
    }
  }, []);

  const { signIn, signUp, resetPassword } = useAuth();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!resetEmail) {
      setError('Veuillez entrer votre adresse email');
      setLoading(false);
      return;
    }

    try {
      const { error } = await resetPassword(resetEmail);
      if (error) {
        console.error('Reset password error:', error);
        setError(error.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation');
      } else {
        setSuccessMessage('Un email de réinitialisation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.');
        setResetEmail('');
        setTimeout(() => {
          setShowForgotPassword(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          console.error('SignUp error:', error);
          if (error.message && error.message.includes('already registered')) {
            setError('Ce compte existe déjà. Cliquez sur "Connexion" pour vous connecter.');
          } else if (error.message && error.message.includes('User already registered')) {
            setError('Ce compte existe déjà. Cliquez sur "Connexion" pour vous connecter.');
          } else if (error.status === 422 || error.message?.includes('Invalid login credentials')) {
            setError('Ce compte existe déjà. Cliquez sur "Connexion" pour vous connecter.');
          } else {
            setError(error.message || 'Erreur lors de la création du compte');
          }
        } else {
          setSuccessMessage('Compte créé avec succès ! Vous êtes maintenant connecté.');
          if (rememberMe) {
            localStorage.setItem('gredeco_saved_email', email);
            localStorage.setItem('gredeco_saved_password', btoa(password));
            localStorage.setItem('gredeco_remember_me', 'true');
          }
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          console.error('Login error:', error);
          if (error.message && error.message.includes('pas autorisé')) {
            setError(error.message);
            localStorage.removeItem('gredeco_saved_email');
            localStorage.removeItem('gredeco_saved_password');
            localStorage.removeItem('gredeco_remember_me');
          } else {
            setError('Email ou mot de passe incorrect. Vérifiez vos identifiants.');
          }
        } else {
          if (rememberMe) {
            localStorage.setItem('gredeco_saved_email', email);
            localStorage.setItem('gredeco_saved_password', btoa(password));
            localStorage.setItem('gredeco_remember_me', 'true');
          } else {
            localStorage.removeItem('gredeco_saved_email');
            localStorage.removeItem('gredeco_saved_password');
            localStorage.removeItem('gredeco_remember_me');
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex justify-center mb-6">
            <GredecoLogo size={64} />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">GREDECO</h1>
            <p className="text-sm text-gray-600">
              Système de Gestion des Devis
            </p>
          </div>

          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                !isSignUp
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                isSignUp
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Inscription
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="votre.email@exemple.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isSignUp && (
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 6 caractères
                </p>
              )}
            </div>

            {!isSignUp && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
                  Se souvenir de mes identifiants
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Chargement...</span>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Créer un compte
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Se connecter
                    </>
                  )}
                </>
              )}
            </button>

            {!isSignUp && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Accès sécurisé - Authentification requise
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Groupe de Recherche et d'Evaluation en Dermatologie et Cosmétologie
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Réinitialiser le mot de passe
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre.email@exemple.com"
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-900 text-white py-2 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
