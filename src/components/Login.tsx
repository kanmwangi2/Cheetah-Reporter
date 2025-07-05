import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, Building, X } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card } from './ui/Card'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from '../hooks/useTheme'

interface LoginProps {
  onSuccess?: () => void
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login, register, resetPassword } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  
  // Initialize theme system
  useTheme()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    company: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const email = formData.email.trim()
      const password = formData.password

      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      if (isLogin) {
        console.log('Attempting login...')
        await login(email, password)
      } else {
        if (password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        if (!formData.firstName || !formData.lastName) {
          throw new Error('First name and last name are required')
        }
        console.log('Attempting registration...')
        await register(email, password, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
          role: 'User'
        })
      }
      onSuccess?.()
    } catch (err: unknown) {
      console.error('Form submission error:', err)
      // Extract Firebase error message
      let errorMessage = (err as Error)?.message || 'An error occurred'
      
      // Handle specific Firebase errors
      if (errorMessage.includes('auth/email-already-in-use')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.'
      } else if (errorMessage.includes('auth/invalid-credential')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (errorMessage.includes('auth/weak-password')) {
        errorMessage = 'Password is too weak. Please use at least 6 characters.'
      } else if (errorMessage.includes('auth/invalid-email')) {
        errorMessage = 'Please enter a valid email address.'
      } else if (errorMessage.includes('auth/user-not-found')) {
        errorMessage = 'No account found with this email. Please register first.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage('')
    setError('')

    try {
      if (!resetEmail.trim()) {
        throw new Error('Please enter your email address')
      }
      
      await resetPassword(resetEmail.trim())
      setResetMessage('Password reset email sent! Check your inbox and follow the instructions to reset your password.')
      setShowResetPassword(false)
      setResetEmail('')
    } catch (err: unknown) {
      console.error('Password reset error:', err)
      let errorMessage = (err as Error)?.message || 'Failed to send password reset email'
      
      if (errorMessage.includes('auth/user-not-found')) {
        errorMessage = 'No account found with this email address.'
      } else if (errorMessage.includes('auth/invalid-email')) {
        errorMessage = 'Please enter a valid email address.'
      }
      
      setError(errorMessage)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-32 flex items-center justify-center">
            <img src="/cheetah-reporter-icon.svg" alt="Cheetah Reporter" className="h-16 w-16" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Welcome to Cheetah Reporter
          </p>
        </div>

        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="sr-only">
                    First Name
                  </label>                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required={!isLogin}
                    className="pl-10"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="sr-only">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required={!isLogin}
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label htmlFor="company" className="sr-only">
                  Company
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    className="pl-10"
                    placeholder="Company (Optional)"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  className="pl-10 pr-10"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required={!isLogin}
                    className="pl-10"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Create account')}
              </Button>
            </div>

            <div className="text-center space-y-2">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setResetMessage('')
                  setFormData({
                    email: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    company: '',
                    confirmPassword: ''
                  })
                }}
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
              
              {isLogin && (
                <div>
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={() => {
                      setShowResetPassword(true)
                      setError('')
                      setResetMessage('')
                    }}
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </div>
          </form>
          
          {/* Success message for password reset */}
          {resetMessage && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm">
              {resetMessage}
            </div>
          )}
        </Card>
        
        {/* Password Reset Modal */}
        {showResetPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Reset Password
                </h3>
                <button
                  onClick={() => {
                    setShowResetPassword(false)
                    setResetEmail('')
                    setError('')
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
              
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="sr-only">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <Input
                      id="resetEmail"
                      type="email"
                      required
                      className="pl-10"
                      placeholder="Enter your email address"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowResetPassword(false)
                      setResetEmail('')
                      setError('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Email'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
