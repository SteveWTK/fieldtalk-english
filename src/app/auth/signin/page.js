/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/auth/signin/page.js

"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, ArrowRight, Eye, EyeOff } from "lucide-react";
import GoogleAuthButton from "@/components/GoogleAuthButton";
// import AuthDebug from "@/components/AuthDebug";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { user, error } = await signIn(email, password);

    if (error) {
      setError(error);
    } else {
      router.push("/lesson");
    }

    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError("");

    // Demo credentials - in production, create these accounts
    const { user, error } = await signIn(
      "demo@globalplayerpro.com",
      "demo123"
    );

    if (error) {
      setError("Demo login not available. Please use the form below.");
    } else {
      router.push("/lesson");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          {/* <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-500 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient-to-r from-primary-500 to-accent-500 dark:text-white">
              Global Player
            </span>
          </div> */}
          {/* <h1 className="text-2xl font-bold text-primary-50 mb-2">
            Welcome Back
          </h1> */}
          <p className="text-xl font-bold text-primary-100">
            Faça seu login com sua conta Google
          </p>
        </div>

        <div className="mb-4">
          <GoogleAuthButton text="Sign in with Google" />
        </div>
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-primary-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 font-bold bg-primary-900 text-primary-100">
              Ou entre com seu email e senha
            </span>
          </div>
        </div>

        {/* Sign In Form */}
        <div className="bg-primary-panel rounded-panel p-8">
          {error && (
            <div className="mb-4 p-3 bg-signal-alert/10 border border-signal-alert/40 text-signal-alert rounded-control text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-primary-100 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-primary-600 rounded-control bg-primary-900 text-primary-50 focus:border-accent-400 focus:ring-accent-400/30 focus:ring-2"
                placeholder="player@club.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-primary-100 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-primary-600 rounded-control bg-primary-900 text-primary-50 focus:border-accent-400 focus:ring-accent-400/30 focus:ring-2 pr-10"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-400 hover:text-primary-100"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-400 text-primary-900 py-2 px-4 rounded-control font-semibold hover:bg-accent-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-primary-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-accent-400 hover:text-accent-300 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Login Button */}
        {/* <div className="my-6">
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-accent-500 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <span>Try Demo Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Experience the platform instantly with sample data
          </p>
        </div> */}

        {/* Partnership Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-primary-400">
            For club partnerships and custom implementations,{" "}
            <Link
              href="/#contact"
              className="text-accent-400 hover:text-accent-300"
            >
              contact our team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
