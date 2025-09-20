/* eslint-disable @typescript-eslint/no-unused-vars */
// Updated src/app/auth/signup/page.js - Fix email confirmation flow

"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, ArrowRight, Users, Shield, User } from "lucide-react";

export default function SignUpPage() {
  const [step, setStep] = useState(1); // 1: Role selection, 2: Details form
  const [selectedRole, setSelectedRole] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    position: "",
    nationality: "",
    clubName: "",
    roleTitle: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signUp } = useAuth();
  const router = useRouter();

  const roles = [
    {
      id: "player",
      title: "Football Player",
      description:
        "Access personalized English lessons and track your progress",
      icon: User,
      color: "from-blue-600 to-blue-500",
    },
    {
      id: "client_admin",
      title: "Coach / Club Admin",
      description: "Manage players and monitor team progress",
      icon: Users,
      color: "from-green-600 to-green-500",
    },
    {
      id: "demo",
      title: "Demo Account",
      description: "Try the platform with sample data",
      icon: Shield,
      color: "from-purple-600 to-purple-500",
    },
  ];

  const handleRoleSelection = (roleId) => {
    setSelectedRole(roleId);
    if (roleId === "demo") {
      // Handle demo account differently
      handleDemoSignup();
    } else {
      setStep(2);
    }
  };

  const handleDemoSignup = async () => {
    setLoading(true);
    setError("");

    // Create a unique demo email
    const timestamp = Date.now();
    const demoCredentials = {
      email: `demo_${timestamp}@fieldtalkenglish.com`,
      password: "demo123456",
      fullName: "Demo Player",
      user_type: "player",
    };

    const { user, error } = await signUp(
      demoCredentials.email,
      demoCredentials.password,
      {
        full_name: demoCredentials.fullName,
        user_type: demoCredentials.user_type,
        position: "Midfielder",
        nationality: "Demo Country",
      }
    );

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      // For demo accounts, redirect with email parameter
      router.push(
        `/auth/check-email?email=${encodeURIComponent(demoCredentials.email)}`
      );
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const metadata = {
      full_name: formData.fullName,
      user_type: selectedRole,
    };

    if (selectedRole === "player") {
      metadata.position = formData.position;
      metadata.nationality = formData.nationality;
    } else if (selectedRole === "client_admin") {
      metadata.role_title = formData.roleTitle;
      metadata.club_name = formData.clubName;
    }

    const { user, error } = await signUp(
      formData.email,
      formData.password,
      metadata
    );

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      // Redirect to check email page with email parameter
      router.push(
        `/auth/check-email?email=${encodeURIComponent(formData.email)}`
      );
    }
  };

  // Step 1: Role Selection
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900 dark:to-accent-800 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            {/* <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-500 rounded-full flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                FieldTalk English
              </span>
            </div> */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Join FieldTalk
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Choose your account type to get started
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelection(role.id)}
                disabled={loading}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-left hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${role.color} rounded-lg flex items-center justify-center mb-4`}
                >
                  <role.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {role.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {role.description}
                </p>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Details Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900 dark:to-accent-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-500 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              FieldTalk English
            </span>
          </div>
          <button
            onClick={() => setStep(1)}
            className="text-accent-600 hover:text-accent-700 text-sm mb-4"
          >
            ← Change account type
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {selectedRole === "player"
              ? "Player Registration"
              : "Coach Registration"}
          </h1>
        </div>

        {/* Registration Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="Your full name"
              />
            </div>

            {selectedRole === "player" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Defender">Defender</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Forward">Forward</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nationality
                  </label>
                  <input
                    name="nationality"
                    type="text"
                    value={formData.nationality}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Your nationality"
                  />
                </div>
              </div>
            )}

            {selectedRole === "client_admin" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Club/Organization Name
                  </label>
                  <input
                    name="clubName"
                    type="text"
                    value={formData.clubName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Your club or organization"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Role
                  </label>
                  <input
                    name="roleTitle"
                    type="text"
                    value={formData.roleTitle}
                    onChange={handleChange}
                    placeholder="e.g., Head Coach, Academy Director"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="Minimum 6 characters"
              />
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-accent-500 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>{loading ? "Creating account..." : "Create Account"}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-accent-600 hover:primary-accent-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// // src/app/auth/signup/page.js
// "use client";

// import React, { useState } from "react";
// import { useAuth } from "@/components/AuthProvider";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { Globe, ArrowRight } from "lucide-react";

// export default function SignUpPage() {
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//     fullName: "",
//     position: "",
//     nationality: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const { signUp } = useAuth();
//   const router = useRouter();

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     const { user, error } = await signUp(formData.email, formData.password, {
//       full_name: formData.fullName,
//       position: formData.position,
//       nationality: formData.nationality,
//     });

//     if (error) {
//       setError(error);
//       setLoading(false);
//     } else {
//       // Redirect to check email page instead of dashboard
//       router.push("/auth/check-email");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
//       <div className="max-w-md w-full">
//         {/* Logo and Header */}
//         <div className="text-center mb-8">
//           <div className="flex items-center justify-center space-x-2 mb-4">
//             <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
//               <Globe className="w-6 h-6 text-white" />
//             </div>
//             <span className="text-2xl font-bold text-gray-900 dark:text-white">
//               FieldTalk English
//             </span>
//           </div>
//           <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
//             Join FieldTalk
//           </h1>
//           <p className="text-gray-600 dark:text-gray-300">
//             Start your English learning journey today
//           </p>
//         </div>

//         {/* Sign Up Form */}
//         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
//           {error && (
//             <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
//               {error}
//             </div>
//           )}

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label
//                 htmlFor="fullName"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//               >
//                 Full Name
//               </label>
//               <input
//                 id="fullName"
//                 name="fullName"
//                 type="text"
//                 value={formData.fullName}
//                 onChange={handleChange}
//                 required
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 placeholder="João Silva"
//               />
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label
//                   htmlFor="position"
//                   className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//                 >
//                   Position
//                 </label>
//                 <select
//                   id="position"
//                   name="position"
//                   value={formData.position}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 >
//                   <option value="">Select...</option>
//                   <option value="Goalkeeper">Goalkeeper</option>
//                   <option value="Defender">Defender</option>
//                   <option value="Midfielder">Midfielder</option>
//                   <option value="Forward">Forward</option>
//                 </select>
//               </div>

//               <div>
//                 <label
//                   htmlFor="nationality"
//                   className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//                 >
//                   Nationality
//                 </label>
//                 <input
//                   id="nationality"
//                   name="nationality"
//                   type="text"
//                   value={formData.nationality}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Brazil"
//                 />
//               </div>
//             </div>

//             <div>
//               <label
//                 htmlFor="email"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//               >
//                 Email
//               </label>
//               <input
//                 id="email"
//                 name="email"
//                 type="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 required
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 placeholder="player@club.com"
//               />
//             </div>

//             <div>
//               <label
//                 htmlFor="password"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//               >
//                 Password
//               </label>
//               <input
//                 id="password"
//                 name="password"
//                 type="password"
//                 value={formData.password}
//                 onChange={handleChange}
//                 required
//                 minLength={6}
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 placeholder="Minimum 6 characters"
//               />
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
//             >
//               <span>{loading ? "Creating account..." : "Create Account"}</span>
//               {!loading && <ArrowRight className="w-4 h-4" />}
//             </button>
//           </form>

//           <div className="mt-6 text-center">
//             <p className="text-sm text-gray-600 dark:text-gray-300">
//               Already have an account?{" "}
//               <Link
//                 href="/auth/signin"
//                 className="text-blue-600 hover:text-blue-700 font-medium"
//               >
//                 Sign in
//               </Link>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
